
import asyncio
import csv
import re
import os
import sqlite3
import aiosqlite
import aiohttp
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List, Tuple
from telethon import TelegramClient
from telethon.sessions import StringSession

# Import Shared Config
from telegramTP_checker_td_tp4_eco import CHANNELS_CONFIG, API_ID, API_HASH, SESSION_STRING_PATH, DB_PATH, WEBSITE_API_URL, parse_signal_text

# --- Shared Logic Copy (Ideally, refactor later, but for safety copy crucial parts) ---
def ceil_to_next_minute_utc(ts_sec: int) -> int: return ((ts_sec // 60) + 1) * 60

async def db_init_check():
    """Ensures DB exists, but doesn't crash if columns exist."""
    async with aiosqlite.connect(DB_PATH) as db:
        # Just ensure tables exist. Columns should be there from main bot.
        await db.execute("""
            CREATE TABLE IF NOT EXISTS signals(
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              chat_id INTEGER NOT NULL,
              chat_title TEXT,
              msg_id INTEGER NOT NULL,
              symbol TEXT NOT NULL,
              side TEXT NOT NULL,
              entry REAL NOT NULL,
              sl REAL,
              tp1 REAL,
              tp2 REAL,
              tp3 REAL,
              tp4 REAL,
              hits INTEGER NOT NULL DEFAULT 0,
              notified_hits INTEGER NOT NULL DEFAULT 0,
              status TEXT NOT NULL,
              close_reason TEXT,
              created_at INTEGER NOT NULL,
              anchor_ts INTEGER NOT NULL,
              last_check_ts INTEGER NOT NULL,
              target_chat_id INTEGER,
              target_msg_id INTEGER,
              fingerprint TEXT
            );
        """)
        await db.commit()
    
    # 2. Add missing columns (Migration)
    async with aiosqlite.connect(DB_PATH) as db:
        try:
            await db.execute("ALTER TABLE signals ADD COLUMN profit REAL DEFAULT 0;")
        except Exception: pass
        try:
            await db.execute("ALTER TABLE signals ADD COLUMN rr_ratio REAL DEFAULT 0;")
        except Exception: pass
        try:
            await db.execute("ALTER TABLE signals ADD COLUMN risk_pips REAL DEFAULT 0;")
        except Exception: pass
        try:
            await db.execute("ALTER TABLE signals ADD COLUMN reward_pips REAL DEFAULT 0;")
        except Exception: pass
        try:
            await db.execute("ALTER TABLE signals ADD COLUMN pips REAL DEFAULT 0;")
        except Exception: pass
        try:
            await db.execute("ALTER TABLE signals ADD COLUMN tp_level INTEGER DEFAULT 0;")
        except Exception: pass
        await db.commit()

async def send_to_website(data: dict):
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(WEBSITE_API_URL, json=data) as resp:
                if resp.status != 200:
                    text = await resp.text()
                    print(f"  [Website] Error: {resp.status} - {text}")
                else:
                    print(f"  [Website] Success: {data['symbol']} {data['status']}")
    except Exception as e:
        print(f"  [Website] Failed: {e}")

async def main():
    print("=== BACKFILL STARTED ===")
    
    # 1. Connect Telegram
    try:
        with open(SESSION_STRING_PATH, "r") as f: sess_str = f.read().strip()
    except FileNotFoundError:
        print("Error: tg_session.txt not found. Run on VPS where bot is active.")
        return

    client = TelegramClient(StringSession(sess_str), API_ID, API_HASH)
    await client.connect()
    if not await client.is_user_authorized():
        print("Error: Client not authorized.")
        return

    # 2. Init DB Connection
    await db_init_check()

    # 3. Scan & Fill
    scan_days = 20
    cutoff_time = datetime.now(tz=timezone.utc) - timedelta(days=scan_days)
    
    print(f"Scanning last {scan_days} days (since {cutoff_time})...")

    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row  # Set globally for name access
        
        for chat_id, config in CHANNELS_CONFIG.items():
            print(f"\nScanning Channel: {config['alias']} ({chat_id})...")
            
            count_found = 0
            count_new = 0
            
            async for msg in client.iter_messages(chat_id, limit=3000):
                if msg.date < cutoff_time:
                    break
                
                # --- REPLY / UPDATE HANDLING ---
                if msg.is_reply:
                    reply_header = await msg.get_reply_message()
                    if reply_header:
                        original_msg_id = reply_header.id
                        raw_text = msg.text or ""
                        text = raw_text.lower()
                        
                        # Identify Update
                        new_hits = None
                        status = None
                        
                        if "tp1" in text or "tp 1" in text: new_hits = 1
                        elif "tp2" in text or "tp 2" in text: new_hits = 2
                        elif "tp3" in text or "tp 3" in text: new_hits = 3
                        elif "tp4" in text or "tp 4" in text: new_hits = 4
                        elif ("breakeven" in text or "break even" in text or "be" in text.split() or 
                              ("entry" in text and ("sl" in text or "stop" in text))):
                            status = "BREAKEVEN"
                        elif "sl hit" in text or "stop loss" in text:
                            status = "SL_HIT"
                        elif "close" in text and "now" in text:
                            status = "closed"

                        if new_hits is not None or status is not None:
                            # Verify Original Signal Exists
                            async with db.execute("SELECT * FROM signals WHERE chat_id = ? AND msg_id = ?", (chat_id, original_msg_id)) as cursor:
                                r = await cursor.fetchone()
                                
                                if r:
                                    # Perform Update
                                    current_hits = r['hits']
                                    updates = {}
                                    rr_ratio = 0
                                    profit = 0
                                    
                                    # logic from main bot
                                    entry = float(r["entry"])
                                    sl = float(r["sl"]) if r["sl"] else 0
                                    tp_value = None
                                    
                                    if new_hits is not None and new_hits > current_hits:
                                        updates['hits'] = new_hits
                                        updates['status'] = "TP_HIT"
                                        updates['last_check_ts'] = int(msg.date.replace(tzinfo=timezone.utc).timestamp())
                                        
                                        if new_hits == 1: tp_value = float(r["tp1"]) if r["tp1"] else None
                                        elif new_hits == 2: tp_value = float(r["tp2"]) if r["tp2"] else None
                                        elif new_hits == 3: tp_value = float(r["tp3"]) if r["tp3"] else None
                                        elif new_hits == 4: tp_value = float(r["tp4"]) if r["tp4"] else None
                                        
                                        if tp_value:
                                            risk_pips = abs(entry - sl)
                                            reward_pips = abs(tp_value - entry)
                                            rr_ratio = round(reward_pips / risk_pips, 2) if risk_pips > 0 else 0
                                            profit = round(rr_ratio * 1000, 2)
                                            updates['profit'] = profit
                                            updates['rr_ratio'] = rr_ratio
                                            updates['pips'] = round(reward_pips, 2)
                                            updates['reward_pips'] = round(reward_pips, 2)
                                            updates['risk_pips'] = round(risk_pips, 2)
                                            updates['tp_level'] = new_hits

                                    elif status == "SL_HIT":
                                        # Only mark SL if we haven't hit TPs yet (Priority: TP > SL)
                                        if current_hits == 0:
                                            updates['status'] = "SL_HIT"
                                            updates['profit'] = -1000
                                            updates['rr_ratio'] = -1.0
                                    elif status == "BREAKEVEN":
                                        # Only mark BE if we haven't hit TPs yet
                                        if current_hits == 0:
                                            updates['status'] = "BREAKEVEN"
                                            updates['profit'] = 0

                                    if updates:
                                        set_clause = ", ".join([f"{k}=?" for k in updates.keys()])
                                        values = list(updates.values())
                                        values.append(r['id'])
                                        await db.execute(f"UPDATE signals SET {set_clause} WHERE id=?", values)
                                        await db.commit()
                                        print(f"  [UPDATE] ID {r['id']} -> {updates.get('status', 'UPDATED')} (Hits: {updates.get('hits')})")
                                        
                                        # Push Update to Website
                                        web_payload = {
                                            "symbol": r['symbol'],
                                            "type": r['side'].upper(),
                                            "status": updates.get('status', "UPDATED"),
                                            "channel_id": chat_id,
                                            "channel_name": config['alias'],
                                            "open_time": datetime.fromtimestamp(r['created_at'], tz=timezone.utc).isoformat(),
                                            "fingerprint": r['fingerprint']
                                        }
                                        # Add optional fields if they changed
                                        if 'pips' in updates: web_payload['pips'] = updates['pips']
                                        if 'tp_level' in updates: web_payload['tp_level'] = updates['tp_level']
                                        if 'profit' in updates: web_payload['profit'] = updates['profit']
                                        if 'rr_ratio' in updates: web_payload['rr_ratio'] = updates['rr_ratio']
                                        
                                        await send_to_website(web_payload)


                # --- EXISTING NEW SIGNAL LOGIC ---
                parsed = parse_signal_text(msg.message)
                if not parsed:
                    continue
                
                count_found += 1
                
                # Fingerprint check
                symbol_fp = re.sub(r'[^A-Z0-9]', '', parsed['symbol'].upper())
                side_fp = "LONG" if parsed['side'].lower() in ("long", "buy") else "SHORT"
                msg_ts = int(msg.date.replace(tzinfo=timezone.utc).timestamp())
                rounded_ts = (msg_ts // 600) * 600
                fingerprint = f"{symbol_fp}_{side_fp}_{rounded_ts}"

                # Check if exists
                async with db.execute("SELECT id FROM signals WHERE fingerprint=?", (fingerprint,)) as cursor:
                    if await cursor.fetchone():
                        # Already exists, skip
                        # print(f"  Skipping duplicate: {parsed['symbol']}")
                        continue

                # Insert NEW
                print(f"  [NEW] Found Signal: {parsed['symbol']} {parsed['side']} @ {parsed['entry']}")
                
                anchor = ceil_to_next_minute_utc(msg_ts)
                
                # INSERT
                await db.execute(
                    """INSERT INTO signals(chat_id,chat_title,msg_id,symbol,side,entry,sl,tp1,tp2,tp3,tp4,hits,notified_hits,status,close_reason,created_at,anchor_ts,last_check_ts,target_chat_id,target_msg_id,fingerprint)
                       VALUES(?,?,?,?,?,?,?,?,?,?,?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (chat_id, config['alias'], msg.id, parsed['symbol'], parsed['side'], parsed['entry'], parsed['sl'],
                     parsed['tp1'], parsed.get('tp2'), parsed.get('tp3'), parsed.get('tp4'),
                     0, 0, "open", None, msg_ts, anchor, msg_ts,
                     config['target_id'], None, fingerprint)
                )
                await db.commit()
                count_new += 1
                
                # PUSH TO WEBSITE (Initial Open)
                await send_to_website({
                    "symbol": parsed['symbol'],
                    "type": parsed['side'].upper(),
                    "status": "OPEN",
                    "pips": 0,
                    "tp_level": 0,
                    "channel_id": chat_id,
                    "channel_name": config['alias'],
                    "risk_pips": 0, # Calc later if needed
                    "reward_pips": 0, # Default 0 for open
                    "rr_ratio": 0,
                    "profit": 0,
                    "open_time": msg.date.isoformat(),
                    "fingerprint": fingerprint
                })
                
                # Note: This script ONLY inserts the "Open" signal.
                # The main bot, when it restarts, will pick these up as "open" signals due to "warm start" logic
                # and verify if they hit TP/SL in the meantime!
                
            print(f"  Channel Done. Found {count_found} signals, Inserted {count_new} new ones.")

    await client.disconnect()
    print("\n=== BACKFILL COMPLETE ===")
    print("NOTE: Reply updates have been processed.")

if __name__ == "__main__":
    asyncio.run(main())
