const path = require('path');
const fs = require('fs');

// Simple SQLite configuration for Railway/Local
const useSQLite = !process.env.DATABASE_URL;
let db;
let sqlite3;

module.exports = {
  query: (text, params = []) => {
    return new Promise((resolve, reject) => {
      // Initialize DB on first query
      if (!db) {
        try {
          sqlite3 = require('sqlite3').verbose();
          const dbPath = path.join(__dirname, '..', 'actlab.db');
          
          // Always READ-WRITE on Railway/Local
          db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
            if (err) console.error('SQLite Connection Error:', err.message);
            else {
              console.log('SQLite Connected (READ-WRITE) at:', dbPath);
              // === OPTIMASI UNTUK 200+ CONCURRENT USERS ===
              // 1. WAL mode: Faster concurrent reads without blocking writes
              db.run('PRAGMA journal_mode=WAL;', (e) => {
                if (!e) console.log('SQLite WAL mode enabled');
              });
              // 2. Busy timeout: 5 detik tunggu sebelum SQLITE_BUSY error
              db.run('PRAGMA busy_timeout=5000;', (e) => {
                if (!e) console.log('SQLite busy timeout set to 5000ms');
              });
              // 3. Synchronous NORMAL: Balance speed vs safety
              db.run('PRAGMA synchronous=NORMAL;', (e) => {
                if (!e) console.log('SQLite synchronous mode: NORMAL');
              });
              // 4. Cache size: 16MB for better read performance
              db.run('PRAGMA cache_size=-16000;');
              // 5. Temp store MEMORY: Faster temp operations
              db.run('PRAGMA temp_store=MEMORY;');
            }
          });
        } catch (e) {
          console.error('Failed to load sqlite3 module:', e.message);
        }
      }

      let sql = text;
      // Basic placeholder conversion ($1 -> ?)
      if (params && params.length > 0) {
        for (let i = 0; i < params.length; i++) {
          sql = sql.replace(new RegExp('\\$' + (i + 1), 'g'), '?');
        }
      }
      
      // Handle RETURNING clause - SQLite supports it but db.all() doesn't return it
      // We strip RETURNING for compatibility since we use db.all()
      sql = sql.replace(/\s+RETURNING\s+\*\s*;?\s*$/i, '');
      
      sql = sql.replace(/NOW\(\)/g, "datetime('now')");

      if (!db) {
        return resolve({ rows: [], rowCount: 0 });
      }

      db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('SQL Error:', err.message, 'SQL:', sql);
          reject(err);
        } else {
          resolve({ rows: rows || [], rowCount: rows ? rows.length : 0 });
        }
      });
    });
  },
  // reseed: Re-run seed SQL to reset database (called from admin API)
  reseed: async () => {
    const fs = require('fs');
    const seedPath = path.join(__dirname, 'seed_sqlite.sql');
    const seedSQL = fs.readFileSync(seedPath, 'utf8');
    // Remove comment lines FIRST, then split by semicolon
    const noComments = seedSQL.split('\n').filter(l => !l.trim().startsWith('--')).join('\n');
    const statements = noComments.split(';').map(s => s.trim()).filter(s => s.length > 0);
    for (const stmt of statements) {
      try {
        await module.exports.query(stmt);
      } catch (e) {
        console.warn('Reseed statement warning:', e.message);
      }
    }
    return true;
  },
  // cleanupOldGuests: Hapus guest user yang sudah kadaluarsa
  cleanupOldGuests: async () => {
    try {
      // Hapus guest users yang dibuat > 6 jam lalu
      const result = await module.exports.query(
        "DELETE FROM users WHERE username LIKE 'guest_%' AND created_at < datetime('now', '-6 hours')"
      );
      // Hapus juga guestbook entries yang mencurigakan (mengandung script tag) 
      // untuk jaga-jaga ada XSS yang terlanjur ter-inject
      await module.exports.query(
        "DELETE FROM guestbook_entries WHERE message LIKE '%<script%' OR message LIKE '%onerror%' OR message LIKE '%onload%'"
      );
      console.log('Cleanup completed:', result.rowCount, 'old guest sessions removed');
      return result.rowCount;
    } catch (e) {
      console.warn('Cleanup warning:', e.message);
      return 0;
    }
  }
};