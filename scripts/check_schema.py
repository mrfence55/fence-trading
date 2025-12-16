
import sqlite3

def check_schema():
    conn = sqlite3.connect("web_signals.db")
    cursor = conn.cursor()
    
    print("--- TABLE INFO ---")
    cursor.execute("PRAGMA table_info(signals)")
    cols = cursor.fetchall()
    for c in cols:
        print(c)
        
    conn.close()

if __name__ == "__main__":
    check_schema()
