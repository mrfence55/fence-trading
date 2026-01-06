import sqlite3
import os

DB_PATH = "signals.db"

# The Only Allowed Channel IDs (from User Request)
ALLOWED_IDS = [
    -1002154812244, # Fence - Aurora
    -1001220837618, # Fence - Odin
    -1001239815745, # Fence - Main
    -1002208969496, # Fence - Crypto
    -1001979286278  # Fence - Live / Indices
]

def cleanup_channels():
    if not os.path.exists(DB_PATH):
        print(f"❌ Database not found at {DB_PATH}")
        return

    print(f"🧹 Connecting to {DB_PATH} for cleanup...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Convert list to string for SQL query
    allowed_str = ",".join(str(x) for x in ALLOWED_IDS)
    
    # Check what we are about to delete
    cursor.execute(f"SELECT chat_id, chat_title, COUNT(*) FROM signals WHERE chat_id NOT IN ({allowed_str}) GROUP BY chat_id")
    rows = cursor.fetchall()
    
    if not rows:
        print("✅ No dirty channels found. Database is clean!")
    else:
        print("⚠️  Found signals from unwanted channels:")
        for r in rows:
            print(f"   - ID: {r[0]} | Title: {r[1]} | Count: {r[2]}")
        
        # Delete them
        print("🗑️  Deleting unwanted signals...")
        cursor.execute(f"DELETE FROM signals WHERE chat_id NOT IN ({allowed_str})")
        print(f"✅ Deleted {cursor.rowcount} rows.")

    conn.commit()
    conn.close()
    print("Done.")

if __name__ == "__main__":
    cleanup_channels()
