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
            else console.log('SQLite Connected (READ-WRITE) at:', dbPath);
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
  }
};