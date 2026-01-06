
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
    scan_days = 14
    cutoff_time = datetime.now(tz=timezone.utc) - timedelta(days=scan_days)
    
    print(f"Scanning last {scan_days} days (since {cutoff_time})...")

    async with aiosqlite.connect(DB_PATH) as db:
        for chat_id, config in CHANNELS_CONFIG.items():
            print(f"\nScanning Channel: {config['alias']} ({chat_id})...")
            
            count_found = 0
            count_new = 0
            
            async for msg in client.iter_messages(chat_id, limit=3000):
                if msg.date < cutoff_time:
                    break
                
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
                    "reward_pips": 0,
                    "rr_ratio": 0,
                    "profit": 0,
                    "open_time": msg.date.isoformat()
                })
                
                # Note: This script ONLY inserts the "Open" signal.
                # The main bot, when it restarts, will pick these up as "open" signals due to "warm start" logic
                # and verify if they hit TP/SL in the meantime!
                
            print(f"  Channel Done. Found {count_found} signals, Inserted {count_new} new ones.")

    await client.disconnect()
    print("\n=== BACKFILL COMPLETE ===")
    print("NOTE: The main bot will now pick up these 'open' source signals and check if they hit TP/SL.")

if __name__ == "__main__":
    asyncio.run(main())
