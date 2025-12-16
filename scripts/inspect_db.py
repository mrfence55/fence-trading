
import sqlite3
import json

def inspect():
    conn = sqlite3.connect("web_signals.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Dump USDJPY rows
    print("--- USDJPY ROWS ---")
    cursor.execute("SELECT id, symbol, status, open_time, channel_id FROM signals WHERE symbol='USDJPY' ORDER BY id DESC LIMIT 10")
    rows = cursor.fetchall()
    
    for r in rows:
        print(dict(r))
        
    conn.close()

if __name__ == "__main__":
    inspect()
