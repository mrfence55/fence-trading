
import sqlite3
import re
from datetime import datetime, timezone

DB_PATH = "web_signals.db"

def generate_fingerprint(symbol, side, open_time_str):
    if not symbol or not side or not open_time_str:
        return None
    
    # Standardize symbol
    sym = re.sub(r'[^A-Z0-9]', '', symbol.upper())
    
    try:
        # Handle variations: 2023-12-22T08:40:00Z or 2023-12-22T08:40:00+00:00
        clean_time = open_time_str.split('.')[0] # remove milliseconds if any
        if 'Z' in clean_time:
            dt = datetime.strptime(clean_time, "%Y-%m-%dT%H:%M:%SZ")
        elif '+' in clean_time:
            dt = datetime.strptime(clean_time, "%Y-%m-%dT%H:%M:%S+00:00")
        else:
            # Try plain format
            dt = datetime.fromisoformat(clean_time.replace('Z', '+00:00'))
            
        ts = int(dt.replace(tzinfo=timezone.utc).timestamp())
        rounded_ts = (ts // 600) * 600
        return f"{sym}_{side.upper()}_{rounded_ts}"
    except Exception as e:
        print(f"Error fingerprinting {symbol} at {open_time_str}: {e}")
        return None

def cleanup():
    print(f"--- Nuclear Cleanup starting on {DB_PATH} ---")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # 1. Ensure fingerprint column exists
    try:
        cur.execute("ALTER TABLE signals ADD COLUMN fingerprint TEXT")
        print("Added fingerprint column.")
    except sqlite3.OperationalError:
        print("Fingerprint column already exists.")

    # 2. Assign fingerprints to all rows
    cur.execute("SELECT id, symbol, type, open_time FROM signals WHERE fingerprint IS NULL")
    rows = cur.fetchall()
    print(f"Found {len(rows)} rows needing fingerprints.")
    
    updated_count = 0
    for r in rows:
        fp = generate_fingerprint(r['symbol'], r['type'], r['open_time'])
        if fp:
            cur.execute("UPDATE signals SET fingerprint=? WHERE id=?", (fp, r['id']))
            updated_count += 1
    
    conn.commit()
    print(f"Assigned {updated_count} fingerprints.")

    # 3. Identify duplicates by fingerprint
    cur.execute("""
        SELECT fingerprint, count(*) as cnt 
        FROM signals 
        WHERE fingerprint IS NOT NULL 
        GROUP BY fingerprint 
        HAVING cnt > 1
    """)
    dupes = cur.fetchall()
    print(f"Found {len(dupes)} duplicate sets.")

    for d in dupes:
        fp = d['fingerprint']
        cur.execute("SELECT * FROM signals WHERE fingerprint=? ORDER BY tp_level DESC, id DESC", (fp,))
        instances = cur.fetchall()
        
        # Keep the first one (most developed)
        keep_id = instances[0]['id']
        delete_ids = [str(x['id']) for x in instances[1:]]
        
        print(f"Merging {fp}: Keeping ID {keep_id}, deleting {len(delete_ids)} duplicates.")
        cur.execute(f"DELETE FROM signals WHERE id IN ({','.join(delete_ids)})")

    conn.commit()
    conn.close()
    print("--- Cleanup Complete ---")

if __name__ == "__main__":
    cleanup()
