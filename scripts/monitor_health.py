
import sqlite3
import time
from datetime import datetime, timezone

DB_PATH = "signals.db" # The Main Bot DB
WEB_DB_PATH = "web_signals.db" # The Website DB

def check_db(name, path):
    print(f"\n--- Checking {name} ({path}) ---")
    try:
        conn = sqlite3.connect(path)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        
        # 1. Count Total
        cur.execute("SELECT count(*) as cnt FROM signals")
        total = cur.fetchone()['cnt']
        print(f"Total Signals: {total}")
        
        # 2. Check for Duplicates (Symbol + Channel + Time window)
        # This is a heuristic check
        cur.execute("""
            SELECT symbol, chat_id, created_at, count(*) as c 
            FROM signals 
            GROUP BY symbol, chat_id, created_at 
            HAVING c > 1
        """)
        dupes = cur.fetchall()
        if dupes:
            print(f"⚠️  WARNING: Found {len(dupes)} sets of exact duplicates!")
        else:
            print("✅ No exact duplicates found.")
            
        # 3. Check for "Broken" Close Logic (Closed but no reason?)
        cur.execute("SELECT count(*) as cnt FROM signals WHERE status='closed' AND close_reason IS NULL")
        broken = cur.fetchone()['cnt']
        if broken > 0:
            print(f"⚠️  WARNING: Found {broken} closed signals with no reason.")
        else:
            print("✅ Close reasons look healthy.")
            
        conn.close()
    except Exception as e:
        print(f"❌ Error checking {name}: {e}")

if __name__ == "__main__":
    print(f"🔍 Fence Bot Health Monitor - {datetime.now()}")
    check_db("Bot Database", DB_PATH)
    check_db("Website Database", WEB_DB_PATH)
    print("\n✅ Monitor Check Complete.")
    print("Tip: If you see duplicates in Website Database, run 'python scripts/clean_web_duplicates.py'")
