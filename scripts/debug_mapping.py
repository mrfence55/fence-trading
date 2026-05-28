
import asyncio
import aiosqlite
import sys

try:
    from telegramTP_checker_td_tp4_eco import CHANNELS_CONFIG
except ImportError:
    # Fail gracefully if running isolated, but we need this
    print("Could not import config")
    sys.exit(1)

DB_PATH = "signals.db"

async def main():
    print("=== DEBUG MAPPING ===")
    
    # 1. Print Config Keys
    print("\n[Config Keys]")
    for k in CHANNELS_CONFIG:
        print(f"Key: {k!r} Type: {type(k)}")

    # 2. Print DB Values
    print("\n[DB Values]")
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute("SELECT DISTINCT chat_id FROM signals") as cursor:
            rows = await cursor.fetchall()
            for row in rows:
                val = row[0]
                print(f"DB Val: {val!r} Type: {type(val)}")
                
                # Test Lookup
                found = False
                # Direct match
                if val in CHANNELS_CONFIG:
                    print(f"  -> Direct Match found: {CHANNELS_CONFIG[val]['alias']}")
                    found = True
                
                # String match
                elif str(val) in {str(k) for k in CHANNELS_CONFIG}:
                     print(f"  -> String Match found")
                     found = True
                
                if not found:
                    print("  -> NO MATCH FOUND!")

if __name__ == "__main__":
    asyncio.run(main())
