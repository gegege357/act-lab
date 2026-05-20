const fs = require('fs');
const os = require('os');
const path = require('path');

let db;
let initPromise;

const isVercel = process.env.VERCEL === '1';
const dbPath = isVercel
  ? path.join(os.tmpdir(), 'actlab.db')
  : path.join(__dirname, '..', 'actlab.db');

function normalizeSql(text, params = []) {
  let sql = text;

  for (let i = 0; i < params.length; i++) {
    sql = sql.replace(new RegExp('\\$' + (i + 1), 'g'), '?');
  }

  return sql
    .replace(/\s+RETURNING\s+\*\s*;?\s*$/i, '')
    .replace(/NOW\(\)/g, "datetime('now')");
}

function getSeedStatements() {
  const seedPath = path.join(__dirname, 'seed_sqlite.sql');
  const seedSQL = fs.readFileSync(seedPath, 'utf8');
  const noComments = seedSQL
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');

  return noComments
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      resolve({ rows: [], rowCount: this.changes || 0 });
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve({ rows: rows || [], rowCount: rows ? rows.length : 0 });
    });
  });
}

async function seedDatabase() {
  for (const statement of getSeedStatements()) {
    try {
      await run(statement);
    } catch (err) {
      console.warn('Seed statement warning:', err.message);
    }
  }
}

async function ensureSeeded() {
  let needsSeed = false;

  try {
    const table = await all("SELECT name FROM sqlite_master WHERE type='table' AND name='challenges'");
    if (!table.rows.length) {
      needsSeed = true;
    } else {
      const count = await all('SELECT COUNT(*) as cnt FROM challenges');
      needsSeed = !count.rows[0] || Number(count.rows[0].cnt) === 0;
    }
  } catch (err) {
    needsSeed = true;
  }

  if (needsSeed) {
    await seedDatabase();
    console.log('SQLite seeded at:', dbPath);
  }
}

async function init() {
  if (db) return db;
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve, reject) => {
    const sqlite3 = require('sqlite3').verbose();
    db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, async (err) => {
      if (err) {
        db = null;
        initPromise = null;
        return reject(err);
      }

      try {
        await run('PRAGMA journal_mode=WAL;');
        await run('PRAGMA busy_timeout=5000;');
        await run('PRAGMA synchronous=NORMAL;');
        await run('PRAGMA cache_size=-16000;');
        await run('PRAGMA temp_store=MEMORY;');
        await ensureSeeded();
        console.log('SQLite connected at:', dbPath);
        resolve(db);
      } catch (setupErr) {
        db = null;
        initPromise = null;
        reject(setupErr);
      }
    });
  });

  return initPromise;
}

module.exports = {
  query: async (text, params = []) => {
    await init();
    const sql = normalizeSql(text, params);

    try {
      if (/^\s*(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|PRAGMA)\b/i.test(sql)) {
        return await run(sql, params);
      }
      return await all(sql, params);
    } catch (err) {
      console.error('SQL Error:', err.message, 'SQL:', sql);
      throw err;
    }
  },

  reseed: async () => {
    await init();
    await seedDatabase();
    return true;
  },

  cleanupOldGuests: async () => {
    try {
      const result = await module.exports.query(
        "DELETE FROM users WHERE username LIKE 'guest_%' AND created_at < datetime('now', '-6 hours')"
      );
      await module.exports.query(
        "DELETE FROM guestbook_entries WHERE message LIKE '%<script%' OR message LIKE '%onerror%' OR message LIKE '%onload%'"
      );
      console.log('Cleanup completed:', result.rowCount, 'old guest sessions removed');
      return result.rowCount;
    } catch (err) {
      console.warn('Cleanup warning:', err.message);
      return 0;
    }
  }
};
