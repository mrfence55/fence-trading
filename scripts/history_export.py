
import asyncio
import sys
import argparse
from datetime import datetime, timezone, timedelta
import aiosqlite
from telethon import TelegramClient
from telethon.sessions import StringSession

# Import configuration from main bot script
# We assume the main script is in the same directory or accessible path
try:
    from telegramTP_checker_td_tp4_eco import CHANNELS_CONFIG, API_ID, API_HASH, SESSION_STRING_PATH, DB_PATH, parse_signal_text
except ImportError:
    print("Error: Could not import config from telegramTP_checker_td_tp4_eco.py. Make sure you run this from the repo root.")
    sys.exit(1)

async def check_db_for_signal(fingerprint: str) -> str:
    """Checks if a signal exists in the local DB and returns its status."""
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            async with db.execute("SELECT id, status, hits, created_at FROM signals WHERE fingerprint=?", (fingerprint,)) as cursor:
                row = await cursor.fetchone()
                if row:
                    ts = datetime.fromtimestamp(row[3], tz=timezone.utc).strftime('%H:%M:%S')
                    return f"FOUND (ID: {row[0]}, Status: {row[1]}, Hits: {row[2]}, Created: {ts})"
                else:
                    return "MISSING"
    except Exception as e:
        return f"DB_ERROR: {e}"

async def main():
    parser = argparse.ArgumentParser(description="Export daily signals from Telegram history")
    parser.add_argument("--date", type=str, help="Date to scan (YYYY-MM-DD), default is today", default=None)
    parser.add_argument("--days", type=int, help="Number of days to look back (default 1)", default=1)
    args = parser.parse_args()

    # Determine date range
    if args.date:
        target_date = datetime.strptime(args.date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    else:
        target_date = datetime.now(tz=timezone.utc)

    # Start of day (00:00 UTC)
    start_time = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
    # End of day (or period)
    end_time = start_time + timedelta(days=args.days)
    
    print(f"=== SIGNAL HISTORY EXPORT ===")
    print(f"Scanning from: {start_time}")
    print(f"Scanning to:   {end_time}")
    print("=============================\n")

    # Connect to Telegram
    try:
        with open(SESSION_STRING_PATH, "r") as f: sess_str = f.read().strip()
    except FileNotFoundError:
        print(f"Error: Session file not found at {SESSION_STRING_PATH}. Run verify_session.py first.")
        return

    client = TelegramClient(StringSession(sess_str), API_ID, API_HASH)
    await client.connect()
    if not await client.is_user_authorized():
        print("Error: Client not authorized.")
        return

    total_found = 0

    print(f"{'TIME (UTC)':<10} | {'CHANNEL':<15} | {'SYMBOL':<10} | {'SIDE':<5} | {'ENTRY':<10} | {'DB STATUS'}")
    print("-" * 85)

    for chat_id, config in CHANNELS_CONFIG.items():
        channel_alias = config['alias'][:15]
        
        # Iterate messages in range
        # We fetch a bit more to ensure we cover the range (reverse order usually)
        async for msg in client.iter_messages(chat_id, limit=None, offset_date=end_time):
            if msg.date < start_time:
                break # We went past the start time
            
            if msg.date > end_time:
                continue

            parsed = parse_signal_text(msg.message)
            if parsed:
                # Generate fingerprint to check DB
                import re
                symbol_fp = re.sub(r'[^A-Z0-9]', '', parsed['symbol'].upper())
                side_fp = "LONG" if parsed['side'].lower() in ("long", "buy") else "SHORT"
                msg_ts = int(msg.date.replace(tzinfo=timezone.utc).timestamp())
                rounded_ts = (msg_ts // 600) * 600
                fingerprint = f"{symbol_fp}_{side_fp}_{rounded_ts}"

                db_status = await check_db_for_signal(fingerprint)
                
                time_str = msg.date.strftime('%H:%M:%S')
                print(f"{time_str:<10} | {channel_alias:<15} | {parsed['symbol']:<10} | {parsed['side']:<5} | {parsed['entry']:<10} | {db_status}")
                total_found += 1

    print("-" * 85)
    print(f"Total Signals Found: {total_found}")
    await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
