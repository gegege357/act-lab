const path = require('path');
const fs = require('fs');

const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL;

// We use SQLite if explicitly requested OR if we are on Vercel (since user wants 'data from here')
const useSQLite = process.env.USE_SQLITE === 'true' || isVercel || !process.env.DATABASE_URL;

let db;
let sqlite3;

if (useSQLite) {
  module.exports = {
    query: (text, params = []) => {
      return new Promise((resolve, reject) => {
        // Initialize DB if not already done
        if (!db) {
          try {
            sqlite3 = require('sqlite3').verbose();
            const dbPath = path.join(__dirname, '..', 'actlab.db');
            
            // Railway/Local = READWRITE, Vercel = READONLY
            const mode = isVercel ? sqlite3.OPEN_READONLY : (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);
            
            db = new sqlite3.Database(dbPath, mode, (err) => {
              if (err) console.error('SQLite Connection Error:', err.message);
              else console.log('SQLite Connected in mode:', isVercel ? 'READ-ONLY' : 'READ-WRITE');
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
        
        sql = sql.replace(/NOW\(\)/g, "datetime('now')");

        // Mock success for writes ONLY on Vercel
        if (isVercel && /INSERT|UPDATE|DELETE|CREATE|DROP/i.test(sql)) {
          return resolve({ rows: [], rowCount: 1 });
        }

        if (!db) {
          // Fallback if sqlite3 failed to load
          return resolve({ rows: [], rowCount: 0 });
        }

        db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve({ rows: rows || [], rowCount: rows ? rows.length : 0 });
        });
      });
    },
    pool: null
  };
} else {
  // PostgreSQL logic (only used if DATABASE_URL is provided and NOT on Vercel)
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  module.exports = {
    query: (text, params) => pool.query(text, params),
    pool: pool
  };
}