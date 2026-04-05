const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

// Render Persistent Disk: /var/data, 로컬: backend/data/
const DB_DIR = process.env.DB_PATH || path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DB_DIR, 'workhive.db');

let db = null;

async function initDB() {
  const SQL = await initSqlJs();
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT '사원',
    dept TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK(type IN ('inst','rep','shared')),
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    from_user_id TEXT NOT NULL,
    to_user_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','done')),
    due_date TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    done_at TEXT,
    FOREIGN KEY (from_user_id) REFERENCES users(id),
    FOREIGN KEY (to_user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS relationships (
    id TEXT PRIMARY KEY,
    senior_id TEXT NOT NULL,
    junior_id TEXT NOT NULL,
    FOREIGN KEY (senior_id) REFERENCES users(id),
    FOREIGN KEY (junior_id) REFERENCES users(id),
    UNIQUE(senior_id, junior_id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS org_positions (
    user_id TEXT PRIMARY KEY,
    x REAL DEFAULT 0,
    y REAL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  save();
  console.log('Database initialized at', DB_PATH);
  return db;
}

function save() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function getDB() {
  return db;
}

module.exports = { initDB, getDB, save };
