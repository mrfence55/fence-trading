#!/usr/bin/env python3
"""
Fence Relay v3.0 - Simplified Signal Relay Bot
===============================================
A clean, event-driven bot that:
1. Listens to 5 source channels
2. Parses and forwards signals to corresponding Fence channels
3. Mirrors admin replies (TP/SL updates) as threaded messages
4. Optionally uses 12Data API for background verification
"""

import asyncio
import aiosqlite
import re
import time
import os
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

from telethon import TelegramClient, events
from telethon.tl.types import Message
from dotenv import load_dotenv

# Load environment
load_dotenv('fenceWeb.env')

# ===================== CONFIGURATION =====================

API_ID = 27308955
API_HASH = "12c8d6da1b61b738ba1d28b892452783"
SESSION_NAME = "fence_relay_v3"

DB_PATH = "relay_v3.db"
WEBSITE_API_URL = "http://localhost:3000/api/signals"

# Channel Mappings: source_id -> {target_id, alias, format}
# Format: "fred" for Fredtrading channels, "external" for Gold Complex & TFXC
CHANNELS = {
    -1002154812244: {"target": -1003369420967, "alias": "Fence - Aurora",   "format": "external", "source_name": "The Gold Complex"},
    -1001220837618: {"target": -1003396317717, "alias": "Fence - Odin",     "format": "external", "source_name": "TFXC PREMIUM"},
    -1001239815745: {"target": -1003330700210, "alias": "Fence - Main",     "format": "fred",     "source_name": "Fredtrading VIP Main"},
    -1002208969496: {"target": -1003368566412, "alias": "Fence - Crypto",   "format": "fred",     "source_name": "Fredtrading Crypto"},
    -1001979286278: {"target": -1003437413343, "alias": "Fence - Live",     "format": "fred",     "source_name": "Fredtrading Live"},
}

SOURCE_IDS = list(CHANNELS.keys())

# ===================== DATABASE =====================

CREATE_SQL = """
CREATE TABLE IF NOT EXISTS message_map (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_chat_id INTEGER NOT NULL,
    source_msg_id INTEGER NOT NULL,
    target_chat_id INTEGER,
    target_msg_id INTEGER,
    symbol TEXT,
    side TEXT,
    entry REAL,
    tp1 REAL, tp2 REAL, tp3 REAL, tp4 REAL,
    sl REAL,
    status TEXT DEFAULT 'OPEN',
    created_at INTEGER NOT NULL,
    UNIQUE(source_chat_id, source_msg_id)
);
CREATE INDEX IF NOT EXISTS idx_source ON message_map(source_chat_id, source_msg_id);
CREATE INDEX IF NOT EXISTS idx_status ON message_map(status);
"""

async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(CREATE_SQL)
        await db.commit()
    print("✅ Database initialized")

async def save_signal(data: Dict[str, Any]) -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("""
            INSERT OR REPLACE INTO message_map 
            (source_chat_id, source_msg_id, target_chat_id, target_msg_id, 
             symbol, side, entry, tp1, tp2, tp3, tp4, sl, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data["source_chat_id"], data["source_msg_id"],
            data.get("target_chat_id"), data.get("target_msg_id"),
            data.get("symbol"), data.get("side"), data.get("entry"),
            data.get("tp1"), data.get("tp2"), data.get("tp3"), data.get("tp4"),
            data.get("sl"), data.get("status", "OPEN"),
            data.get("created_at", int(time.time()))
        ))
        await db.commit()
        return cursor.lastrowid

async def get_signal_by_source(source_chat_id: int, source_msg_id: int) -> Optional[Dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM message_map WHERE source_chat_id = ? AND source_msg_id = ?",
            (source_chat_id, source_msg_id)
        )
        row = await cursor.fetchone()
        return dict(row) if row else None

async def update_signal_status(source_chat_id: int, source_msg_id: int, status: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE message_map SET status = ? WHERE source_chat_id = ? AND source_msg_id = ?",
            (status, source_chat_id, source_msg_id)
        )
        await db.commit()

# ===================== SIGNAL PARSER =====================

def normalize_symbol(sym: str) -> str:
    """Normalize symbol: XAUUSD, XAU/USD, Gold -> XAUUSD"""
    s = sym.upper().replace(" ", "").replace("/", "")
    # Common aliases
    if s in ("GOLD", "XAUUSD"): return "XAUUSD"
    if s in ("SILVER", "XAGUSD"): return "XAGUSD"
    if s in ("BITCOIN", "BTC", "BTCUSD"): return "BTCUSD"
    if s in ("ETHEREUM", "ETH", "ETHUSD"): return "ETHUSD"
    return s

# Unified regex that works for both Fred and External formats
# Matches: "BUY XAUUSD 4430" or "SELL GOLD @ 4430" or "XAUUSD LONG Entry: 4430"
SIGNAL_PATTERNS = [
    # Pattern 1: ACTION SYMBOL PRICE (e.g., "BUY XAUUSD 4430")
    re.compile(
        r'(?P<action>BUY|SELL|LONG|SHORT)\s+'
        r'(?P<symbol>[A-Za-z/]{3,10})\s*'
        r'(?:@|at|entry|:)?\s*'
        r'(?P<entry>[\d.,]+)',
        re.IGNORECASE
    ),
    # Pattern 2: SYMBOL ACTION PRICE (e.g., "XAUUSD BUY NOW 4430")
    re.compile(
        r'(?P<symbol>[A-Za-z/]{3,10})\s+'
        r'(?P<action>BUY|SELL|LONG|SHORT)\s*'
        r'(?:NOW)?\s*'
        r'(?:@|at|entry|:)?\s*'
        r'(?P<entry>[\d.,]+)',
        re.IGNORECASE
    ),
]

TP_PATTERN = re.compile(r'TP\s*(\d)\s*[:\-=]?\s*([\d.,]+)', re.IGNORECASE)
SL_PATTERN = re.compile(r'SL\s*[:\-=]?\s*([\d.,]+)', re.IGNORECASE)

def parse_number(s: str) -> float:
    """Parse a number string, handling both comma and dot decimals."""
    return float(s.replace(",", ".").strip())

def parse_signal(text: str) -> Optional[Dict[str, Any]]:
    """
    Parse a signal from message text.
    Returns dict with: symbol, side, entry, tp1-tp4, sl
    """
    if not text:
        return None
    
    # Clean the text
    clean = re.sub(r'[^\w\s.,:/@\-+=]', ' ', text)
    clean = re.sub(r'\s+', ' ', clean).strip()
    
    # Try each pattern
    match = None
    for pattern in SIGNAL_PATTERNS:
        match = pattern.search(clean)
        if match:
            break
    
    if not match:
        return None
    
    d = match.groupdict()
    action = d["action"].upper()
    side = "LONG" if action in ("BUY", "LONG") else "SHORT"
    
    try:
        result = {
            "symbol": normalize_symbol(d["symbol"]),
            "side": side,
            "entry": parse_number(d["entry"]),
            "tp1": None, "tp2": None, "tp3": None, "tp4": None,
            "sl": None
        }
        
        # Extract TPs
        for tp_match in TP_PATTERN.finditer(text):
            tp_num = int(tp_match.group(1))
            tp_val = parse_number(tp_match.group(2))
            if 1 <= tp_num <= 4:
                result[f"tp{tp_num}"] = tp_val
        
        # Extract SL
        sl_match = SL_PATTERN.search(text)
        if sl_match:
            result["sl"] = parse_number(sl_match.group(1))
        
        return result
    except Exception as e:
        print(f"Parse error: {e}")
        return None

# ===================== REPLY PARSER =====================

def parse_reply(text: str) -> Optional[Dict[str, Any]]:
    """
    Parse a reply message for TP/SL updates.
    Returns: {"type": "TP", "level": 1-4} or {"type": "SL"} or {"type": "BE"} or None
    """
    if not text:
        return None
    
    t = text.lower()
    
    # TP detection
    tp_match = re.search(r'tp\s*(\d)', t)
    if tp_match:
        level = int(tp_match.group(1))
        if 1 <= level <= 4:
            return {"type": "TP", "level": level}
    
    # SL detection
    if "sl hit" in t or "stop loss" in t or "stopped out" in t:
        return {"type": "SL"}
    
    # Breakeven detection
    if "breakeven" in t or "break even" in t or "be" in t.split():
        return {"type": "BE"}
    
    return None

# ===================== SIGNAL FORMATTER =====================

def format_signal(alias: str, signal: Dict[str, Any], original_text: str) -> str:
    """Format a signal for posting to the Fence channel."""
    symbol = signal["symbol"]
    side = signal["side"]
    entry = signal["entry"]
    
    # Build TP list
    tps = []
    for i in range(1, 5):
        tp = signal.get(f"tp{i}")
        if tp:
            tps.append(f"🎯 TP{i}: {tp}")
    
    # Emoji based on side
    action_emoji = "🟢" if side == "LONG" else "🔴"
    
    msg = f"""✨ {alias} PREMIUM ✨
━━━━━━━━━━━━━━━━━━
{action_emoji} **{symbol}**
Action: {side} {entry}

{chr(10).join(tps) if tps else "🎯 TP: See original"}
{"🛑 SL: " + str(signal['sl']) if signal.get('sl') else "🛑 SL: See original"}

📊 _Following institutional flow._
#{'FOREX' if len(symbol) == 6 else 'TRADING'} #FX
━━━━━━━━━━━━━━━━━━"""
    
    return msg

def format_update(update_type: str, level: int = 0, symbol: str = "") -> str:
    """Format a TP/SL update message."""
    if update_type == "TP":
        emoji = "✅" * level
        return f"{emoji} **TP{level} HIT!**\n#{symbol}"
    elif update_type == "SL":
        return f"❌ **SL HIT**\n#{symbol}"
    elif update_type == "BE":
        return f"🛡️ **Breakeven** (Entry Secured)\n#{symbol}"
    return f"📊 Update: {update_type}"

# ===================== WEBSITE API =====================

async def send_to_website(data: Dict[str, Any]):
    """Send signal update to website API."""
    import aiohttp
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(WEBSITE_API_URL, json=data) as resp:
                if resp.status == 200:
                    print(f"✅ Website updated: {data.get('symbol')} -> {data.get('status')}")
                else:
                    print(f"⚠️ Website error: {resp.status}")
    except Exception as e:
        print(f"❌ Website API error: {e}")

# ===================== MAIN BOT =====================

client: TelegramClient = None

async def main():
    global client
    
    print("=" * 50)
    print("🚀 Fence Relay v3.0 Starting...")
    print("=" * 50)
    
    await init_db()
    
    client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
    await client.start()
    
    me = await client.get_me()
    print(f"✅ Logged in as: {me.first_name} ({me.id})")
    print(f"📡 Monitoring {len(SOURCE_IDS)} source channels...")
    
    # ===== EVENT: New Message in Source Channel =====
    @client.on(events.NewMessage(chats=SOURCE_IDS))
    async def on_new_message(event):
        msg: Message = event.message
        chat_id = msg.chat_id
        
        # Get channel config
        config = CHANNELS.get(chat_id)
        if not config:
            return
        
        # Get message text (handles photos with captions)
        text = msg.text or msg.message or ""
        if not text.strip():
            return
        
        # Check if this is a REPLY to an existing signal
        if msg.reply_to and msg.reply_to.reply_to_msg_id:
            await handle_reply(msg, msg.reply_to.reply_to_msg_id, config)
            return
        
        # Try to parse as a new signal
        signal = parse_signal(text)
        if not signal:
            print(f"📨 [{config['source_name']}] Non-signal message ignored")
            return
        
        print(f"🆕 [{config['source_name']}] New signal: {signal['side']} {signal['symbol']} @ {signal['entry']}")
        
        # Format and forward to target channel
        target_id = config["target"]
        alias = config["alias"]
        formatted = format_signal(alias, signal, text)
        
        try:
            sent = await client.send_message(target_id, formatted)
            print(f"   ✅ Forwarded to {alias} (msg_id: {sent.id})")
            
            # Save to database
            await save_signal({
                "source_chat_id": chat_id,
                "source_msg_id": msg.id,
                "target_chat_id": target_id,
                "target_msg_id": sent.id,
                **signal,
                "status": "OPEN",
                "created_at": int(time.time())
            })
            
            # Notify website
            await send_to_website({
                "symbol": signal["symbol"],
                "type": signal["side"],
                "status": "NEW",
                "entry": signal["entry"],
                "sl": signal.get("sl"),
                "tp1": signal.get("tp1"),
                "tp2": signal.get("tp2"),
                "tp3": signal.get("tp3"),
                "tp4": signal.get("tp4"),
                "channel_name": alias,
                "channel_id": chat_id,
                "open_time": datetime.now(timezone.utc).isoformat()
            })
            
        except Exception as e:
            print(f"   ❌ Forward failed: {e}")
    
    async def handle_reply(msg: Message, original_msg_id: int, config: Dict):
        """Handle a reply to a signal (TP/SL update)."""
        text = msg.text or msg.message or ""
        source_chat_id = msg.chat_id
        
        # Look up the original signal
        signal = await get_signal_by_source(source_chat_id, original_msg_id)
        if not signal:
            print(f"   ⚠️ Reply to unknown signal (msg_id: {original_msg_id})")
            return
        
        # Parse the reply
        update = parse_reply(text)
        if not update:
            print(f"   📝 [{config['source_name']}] Non-update reply ignored")
            return
        
        symbol = signal["symbol"]
        target_chat_id = signal["target_chat_id"]
        target_msg_id = signal["target_msg_id"]
        
        update_type = update["type"]
        level = update.get("level", 0)
        
        print(f"📢 [{config['source_name']}] {update_type}{level if level else ''} for {symbol}")
        
        # Mirror the update to target channel
        if target_chat_id and target_msg_id:
            update_text = format_update(update_type, level, symbol)
            try:
                await client.send_message(target_chat_id, update_text, reply_to=target_msg_id)
                print(f"   ✅ Mirrored to {config['alias']}")
            except Exception as e:
                print(f"   ❌ Mirror failed: {e}")
        
        # Update database status
        new_status = f"TP{level}" if update_type == "TP" else update_type
        await update_signal_status(source_chat_id, original_msg_id, new_status)
        
        # Notify website
        await send_to_website({
            "symbol": symbol,
            "type": signal["side"],
            "status": f"{update_type}_HIT" if update_type in ("TP", "SL") else update_type,
            "tp_level": level if update_type == "TP" else 0,
            "channel_name": config["alias"],
            "channel_id": source_chat_id,
            "is_win": update_type == "TP",
        })
    
    print("=" * 50)
    print("🎯 Bot is now running. Waiting for signals...")
    print("=" * 50)
    
    await client.run_until_disconnected()

if __name__ == "__main__":
    asyncio.run(main())
