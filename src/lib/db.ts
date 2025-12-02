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
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      open_time DATETIME,
      channel_id INTEGER,
      channel_name TEXT,
      risk_pips REAL,
      reward_pips REAL,
      rr_ratio REAL,
      profit REAL
    )
  `);

  // Migrations for existing tables
  const columns = [
    "channel_id INTEGER",
    "channel_name TEXT",
    "risk_pips REAL",
    "reward_pips REAL",
    "rr_ratio REAL",
    "profit REAL",
    "open_time DATETIME"
  ];

  columns.forEach(col => {
    try {
      const colName = col.split(" ")[0];
      db.prepare(`ALTER TABLE signals ADD COLUMN ${col}`).run();
    } catch (error: any) {
      // Ignore error if column already exists
      if (!error.message.includes("duplicate column name")) {
        console.error(`Migration error for ${col}:`, error);
      }
    }
  });
}

export default db;
