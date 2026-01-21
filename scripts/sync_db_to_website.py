
import asyncio
import aiosqlite
import aiohttp
import sys
from datetime import datetime, timezone

# Configuration
DB_PATH = "signals.db"
WEBSITE_API_URL = "http://127.0.0.1:3000/api/signals"

async def send_to_website(session, data):
    """Sends signal update to the website API."""
    try:
        async with session.post(WEBSITE_API_URL, json=data) as resp:
            if resp.status != 200:
                text = await resp.text()
                print(f"  [Error] API {resp.status}: {text}")
                return False
            else:
                # print(f"  [Success] Sent {data.get('symbol')}")
                return True
    except Exception as e:
        print(f"  [Failed] Connection error: {e}")
        return False

async def main():
    print("=== DATABASE -> WEBSITE SYNC ===")
    print(f"Target: {WEBSITE_API_URL}")
    print("Scanning local DB for signals to push...")

    async with aiohttp.ClientSession() as session:
        async with aiosqlite.connect(DB_PATH) as db:
            # Fetch all signals
            # Mapping columns based on typical schema
            # id, symbol, side, status, pips, tp_level, risk_pips, reward_pips, rr_ratio, profit, created_at, fingerprint, channel_id
            
            async with db.execute("SELECT * FROM signals ORDER BY created_at DESC") as cursor:
                columns = [description[0] for description in cursor.description]
                rows = await cursor.fetchall()

            total = len(rows)
            print(f"Found {total} signals in local DB. Syncing...")
            
            success_count = 0
            
            for row in rows:
                row_dict = dict(zip(columns, row))
                
                # Construct payload matches route.ts expectation
                payload = {
                    "symbol": row_dict['symbol'],
                    "type": row_dict['side'].upper() if 'side' in row_dict else 'SCALP',
                    "status": row_dict['status'].upper() if row_dict['status'] else 'OPEN',
                    "entry": row_dict.get('entry', 0),
                    "pips": row_dict.get('pips', 0),
                    "tp_level": row_dict.get('tp_level', 0) if row_dict.get('tp_level') else 0,
                    "risk_pips": row_dict.get('risk_pips', 0),
                    "reward_pips": row_dict.get('reward_pips', 0),
                    "rr_ratio": row_dict.get('rr_ratio', 0),
                    "profit": row_dict.get('profit', 0),
                    "open_time": datetime.fromtimestamp(row_dict['created_at'], tz=timezone.utc).isoformat(),
                    "fingerprint": row_dict.get('fingerprint'),
                    "channel_id": row_dict.get('chat_id') # Mapping chat_id to channel_id
                }

                # Status correction for display
                if "TP" in payload['status'] and "HIT" not in payload['status']:
                     payload['status'] = f"{payload['status']} HIT"

                # print(f"Syncing ID {row_dict['id']}: {payload['symbol']} {payload['status']}...")
                if await send_to_website(session, payload):
                    success_count += 1
                    sys.stdout.write(".")
                    sys.stdout.flush()
                else:
                    sys.stdout.write("x")
                    sys.stdout.flush()

    print(f"\n\nSync Complete: {success_count}/{total} signals pushed.")

if __name__ == "__main__":
    asyncio.run(main())
