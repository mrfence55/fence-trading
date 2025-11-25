import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'web_signals.db');
const db = new Database(dbPath);

export function initDB() {
    db.exec(`
    CREATE TABLE IF NOT EXISTS signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      pips REAL,
      tp_level INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export default db;
