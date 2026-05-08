const express = require('express');
const router = express.Router();
// Database loaded on-demand
const { requireAuth } = require('../middleware/auth');

// ============================================
// VULNERABILITY 1: IDOR - User Enumeration
// Lokasi: GET / dengan parameter id
// Penjelasan:
//   Endpoint menerima parameter 'id' dan langsung
//   mengembalikan data user tanpa memverifikasi
//   apakah user yang request memiliki akses.
//   Attacker bisa iterate id=1,2,3... untuk
//   mendapatkan semua data user termasuk password.
// ============================================
router.get('/', async (req, res) => {
  const db = require('../config/database');
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'User ID parameter is required'
    });
  }

  try {
    // *** VULNERABLE - No authorization check ***
    // Anyone can access any user's profile by changing the id
    const query = `SELECT id, username, email, role, bio, score, created_at FROM users WHERE id=${id}`;
    const result = await db.query(query);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    return res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Get own profile
router.get('/me', requireAuth, async (req, res) => {
  const db = require('../config/database');
  try {
    const query = `SELECT id, username, email, role, bio, score, created_at FROM users WHERE id=$1`;
    const result = await db.query(query, [req.user.id]);

    if (result.rows.length === 0) {
      // Fallback for Auto-generated Guests on Read-Only platforms (Vercel)
      if (String(req.user.id).startsWith('999')) {
        return res.json({
          success: true,
          user: {
            id: req.user.id,
            username: req.user.username,
            email: req.user.username + '@actlab.local',
            role: req.user.role,
            bio: 'ACT LAB Trainee (Temporary Session)',
            score: 0,
            created_at: new Date().toISOString()
          }
        });
      }
      
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    return res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ============================================
// VULNERABILITY 2: CSRF - Loose Referer Bypass
// Lokasi: POST / (update profile)
// Penjelasan:
//   Endpoint ini SEOLAH-OLAH aman karena mengecek 
//   header Referer/Origin. Namun pengecekannya
//   hanya menggunakan .includes() yang sangat lemah.
//   Attacker bisa bypass dengan domain seperti:
//   act-lab-csrf-sqli.vercel.app.evil.com
// ============================================
router.post('/', requireAuth, async (req, res) => {
  const db = require('../config/database');
  const { email, bio } = req.body;
  const referer = req.headers.referer || '';
  const origin = req.headers.origin || '';

  // *** LOOSE SECURITY CHECK (BYPASSABLE) ***
  // Intent: Only allow requests from our domain
  // Flaw: It just checks if the domain string is PRESENT anywhere in the header
  const isAuthorized = 
    referer.includes('act-lab-csrf-sqli.vercel.app') || 
    origin.includes('act-lab-csrf-sqli.vercel.app') ||
    referer.includes('localhost') || 
    origin.includes('localhost');

  if (!isAuthorized) {
    return res.status(403).json({
      success: false,
      error: 'Security Breach: Request origin not allowed. CSRF Protection active.',
      debug_info: 'We now verify that requests originate from our official domain string.'
    });
  }

  try {
    const query = `UPDATE users SET email=$1, bio=$2 WHERE id=$3`;
    await db.query(query, [email || '', bio || '', req.user.id]);

    // Log activity with Referer/Origin for CSRF Monitoring
    await db.query(
      'INSERT INTO activity_log (user_id, action, details) VALUES ($1, $2, $3)',
      [req.user.id, 'UPDATE_PROFILE', 'Source: ' + (referer || origin || 'Internal')]
    );

    return res.json({
      success: true,
      message: 'Profile updated successfully. Flag: ACT{cr5f_byp4ss_r3f3r3r}'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;