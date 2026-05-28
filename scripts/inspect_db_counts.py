
import sqlite3
import os

def count_rows(db_path):
    if not os.path.exists(db_path):
        return "File not found"
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM signals")
        count = cur.fetchone()[0]
        conn.close()
        return count
    except Exception as e:
        return f"Error: {e}"

print(f"signals.db rows: {count_rows('signals.db')}")
print(f"web_signals.db rows: {count_rows('web_signals.db')}")
print(f"web_signals.db (path check): {os.path.abspath('web_signals.db')}")
