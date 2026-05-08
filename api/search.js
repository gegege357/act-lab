const express = require('express');
const router = express.Router();
// Database loaded on-demand

// ============================================
// VULNERABILITY: SQL Injection - UNION Based & Blind
// Lokasi: Line di bawah (query string concatenation)
// Penjelasan:
//   Parameter 'q' langsung di-concatenate ke query
//   tanpa sanitasi atau parameterization.
//   Memungkinkan UNION-based extraction dan
//   blind boolean injection.
//
// Payload UNION:
//   ' UNION SELECT id, username, password, email, role, avatar, bio, score FROM users--
//
// Payload Blind:
//   ' AND (SELECT SUBSTR(password,1,1) FROM users WHERE username='admin')='a'--
// ============================================
router.get('/', async (req, res) => {
  const db = require('../config/database');
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({
      success: false,
      error: 'Search query parameter "q" is required'
    });
  }

  try {
    // *** VULNERABLE QUERY - UNION & Blind SQL Injection ***
    const query = `SELECT id, title, description, category, difficulty, hint, points, endpoint FROM challenges WHERE title LIKE '%${q}%' OR description LIKE '%${q}%'`;
    const result = await db.query(query);

    return res.json({
      success: true,
      query: q,
      results: result.rows,
      count: result.rows.length
    });
  } catch (err) {
    // Error message di-expose secara verbose (sengaja)
    // Ini membantu attacker mengidentifikasi struktur query
    return res.status(500).json({
      success: false,
      error: 'SQL Error: ' + err.message,
      detail: err.detail || null,
      hint: 'Check your query syntax'
    });
  }
});

module.exports = router;