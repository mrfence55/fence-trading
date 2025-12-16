
import sqlite3
import os

DB_PATH = "web_signals.db"

def clean_duplicates():
    if not os.path.exists(DB_PATH):
        print(f"Database {DB_PATH} not found!")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    print("Scanning for duplicates...")
    
    # Find groups with duplicates
    cursor.execute("""
        SELECT symbol, channel_id, open_time, COUNT(*) as cnt
        FROM signals
        GROUP BY symbol, channel_id, open_time
        HAVING cnt > 1
    """)
    groups = cursor.fetchall()
    
    print(f"Found {len(groups)} groups with duplicates.")

    deleted_count = 0
    for g in groups:
        sym = g['symbol']
        cid = g['channel_id']
        ot = g['open_time']
        
        # Get all rows for this group
        cursor.execute("""
            SELECT id, status, timestamp 
            FROM signals 
            WHERE symbol = ? AND channel_id = ? AND open_time = ?
            ORDER BY id ASC
        """, (sym, cid, ot))
        rows = cursor.fetchall()
        
        # Strategy: Keep the "best" row
        # Priority: CLOSED/SL/TP > BREAKEVEN > NEW
        # Tiebreaker: Latest timestamp (most recently updated)
        
        best_row = None
        best_score = -1
        
        for r in rows:
            score = 0
            s = r['status'].upper()
            if 'TP' in s or 'SL' in s or 'CLOSED' in s: score = 3
            elif 'BREAKEVEN' in s: score = 2
            elif 'NEW' in s: score = 1
            
            # If scores equal, prefer the one with later timestamp? 
            # Actually, we likely want the one that has the most info.
            if score > best_score:
                best_score = score
                best_row = r
            elif score == best_score:
                # Same status? Keep the one with higher ID or timestamp?
                # Usually higher ID = later signal. 
                # But if one was updated to TP HIT, its timestamp changed.
                # Let's keep the one with max ID if statuses are equal.
                if r['id'] > best_row['id']:
                    best_row = r
        
        # Delete the others
        for r in rows:
            if r['id'] != best_row['id']:
                cursor.execute("DELETE FROM signals WHERE id = ?", (r['id'],))
                deleted_count += 1
                
    conn.commit()
    print(f"Cleaned up {deleted_count} duplicate rows.")
    conn.close()

if __name__ == "__main__":
    clean_duplicates()
