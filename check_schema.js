const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./actlab.db');
db.all("PRAGMA table_info(challenges)", (err, rows) => {
    console.log(rows);
});
