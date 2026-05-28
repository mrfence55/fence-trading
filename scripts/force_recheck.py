import sqlite3
import time
import os

DB_PATH = "signals.db"

def force_recheck():
    if not os.path.exists(DB_PATH):
        print(f"❌ Database not found at {DB_PATH}")
        return

    print(f"🔧 Connecting to {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Count OPEN signals
    cursor.execute("SELECT COUNT(*) FROM signals WHERE status='open'")
    count = cursor.fetchone()[0]
    print(f"📊 Found {count} OPEN signals.")

    if count == 0:
        print("✅ No open signals to reset. Exiting.")
        conn.close()
        return

    # 2. Reset last_check_ts to created_at + 1 (so it's just after start)
    # Actually, setting it to created_at is safer, or even 0.
    # The logic says: if last_ms >= current_candle_start_ms: return.
    # We want last_ms to be OLD.
    # So setting it to created_at is perfect.
    
    print("⏳ Resetting 'last_check_ts' for all OPEN signals to 'created_at'...")
    cursor.execute("UPDATE signals SET last_check_ts = created_at WHERE status='open'")
    
    # Check changes
    print(f"✅ Updated {cursor.rowcount} rows.")
    
    conn.commit()
    conn.close()
    print("🚀 Done! Now restart the main bot to trigger the re-check.")

if __name__ == "__main__":
    force_recheck()
