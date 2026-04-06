const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT '사원',
      dept TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW()
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('inst','rep','shared')),
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      from_user_id TEXT NOT NULL REFERENCES users(id),
      to_user_id TEXT REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','done')),
      due_date TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      done_at TIMESTAMP
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS relationships (
      id TEXT PRIMARY KEY,
      senior_id TEXT NOT NULL REFERENCES users(id),
      junior_id TEXT NOT NULL REFERENCES users(id),
      UNIQUE(senior_id, junior_id)
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS org_positions (
      user_id TEXT PRIMARY KEY REFERENCES users(id),
      x REAL DEFAULT 0,
      y REAL DEFAULT 0
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      size INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS board_posts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      user_id TEXT NOT NULL REFERENCES users(id),
      pinned BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS links (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      description TEXT DEFAULT '',
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW()
    )`);

    console.log('Database tables initialized (PostgreSQL)');
  } finally {
    client.release();
  }
}

function getDB() {
  return pool;
}

// save()는 PostgreSQL에서는 불필요 (자동 커밋) — 호환성 유지용
function save() {}

module.exports = { initDB, getDB, save };
