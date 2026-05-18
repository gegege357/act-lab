const express = require('express');
const router = express.Router();
// Database loaded on-demand

// Get all guestbook entries
router.get('/', async (req, res) => {
  const db = require('../config/database');
  try {
    const result = await db.query(
      'SELECT id, author, message, created_at FROM guestbook_entries ORDER BY created_at DESC LIMIT 50'
    );
    return res.json({
      success: true,
      entries: result.rows
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ============================================
// VULNERABILITY: Stored XSS
// Lokasi: POST / (add entry)
// Penjelasan:
//   Input author dan message disimpan ke database
//   tanpa HTML encoding/sanitasi. Saat data
//   ditampilkan di frontend, browser akan
//   mengeksekusi script yang disisipkan.
//
// Payload:
//   author: <script>alert(document.cookie)</script>
//   message: <img src=x onerror=alert('XSS')>
//
// Catatan: Vulnerability XSS-nya ada di FRONTEND
//   (guestbook.html) yang menggunakan innerHTML
//   tanpa escaping. Endpoint ini menyimpan input
//   apa adanya ke database.
// ============================================
router.post('/', async (req, res) => {
  const db = require('../config/database');
  const { author, message } = req.body;

  if (!author || !message) {
    return res.status(400).json({
      success: false,
      error: 'Author and message are required'
    });
  }

  if (author.length > 100 || message.length > 2000) {
    return res.status(400).json({
      success: false,
      error: 'Input too long'
    });
  }

  try {
    // *** NO SANITIZATION - Input stored as-is via parameterized query ***
    // HTML/script tags are NOT filtered or encoded
    const query = `INSERT INTO guestbook_entries (author, message) VALUES ($1, $2)`;
    const result = await db.query(query, [author, message]);

    return res.json({
      success: true,
      message: 'Entry added successfully'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;