const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

// ============================================
// CSRF CHALLENGE V2 — GET-based CSRF (Image Tag Exploit)
//
// Tidak ada proteksi CSRF sama sekali!
// - Tidak ada pengecekan Origin/Referer
// - Tidak ada CSRF token
// - Menerima request via GET (bisa di-trigger dengan <img> tag!)
//
// Endpoint: GET /api/csrf-v2?bio=<pesan>
//
// Vulnerability: State-changing operation via GET tanpa proteksi CSRF.
//   Attacker bisa trigger request dari <img src="..."> atau <script src="...">
//   karena browser tidak membatasi tag HTML untuk cross-origin GET requests.
// ============================================

router.get('/', requireAuth, async (req, res) => {
  const db = require('../config/database');
  const { bio } = req.query;

  if (!bio) {
    return res.json({
      success: false,
      message: 'Parameter bio diperlukan. Contoh: GET /api/csrf-v2?bio=Hacked!',
      hint: 'Coba akses: /api/csrf-v2?bio=CSRF_BERHASIL'
    });
  }

  const referer = req.headers['x-actlab-referer'] || req.headers.referer || '';
  const origin = req.headers['x-actlab-origin'] || req.headers.origin || '';
  const currentHost = req.headers.host || '';
  const getHostFromUrl = (url) => {
    try { return new URL(url).host; } catch (err) { return null; }
  };
  const refererHost = getHostFromUrl(referer);
  const originHost = getHostFromUrl(origin);
  const hasAnyOrigin = Boolean(refererHost || originHost);
  const hasCrossOrigin =
    (refererHost && refererHost !== currentHost) ||
    (originHost && originHost !== currentHost);
  const isCrossOrigin = hasAnyOrigin && hasCrossOrigin;
  const flag = isCrossOrigin ? 'ACT{csrf_g3t_1mg_t4g}' : null;

  try {
    // *** VULNERABLE - Tidak ada CSRF protection ***
    // GET request bisa mengubah data user — sangat berbahaya!
    // Attacker bisa embed <img src="https://target.com/api/csrf-v2?bio=PWNED">
    // di halaman attacker, dan ketika korban membuka halaman itu,
    // browser akan otomatis mengirim GET request dengan cookie korban!
    
    // Simpan bio baru (state-changing via GET!)
    await db.query(
      'UPDATE users SET bio = $1 WHERE id = $2',
      [bio, req.user.id]
    );

    // Catat aktivitas
    await db.query(
      'INSERT INTO activity_log (user_id, action, details) VALUES ($1, $2, $3)',
      [req.user.id, 'CSRF_V2', 'Bio updated via GET CSRF: ' + bio]
    );

    // Ambil bio terbaru
    const userResult = await db.query(
      'SELECT id, username, bio, email FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = userResult.rows[0] || {};

    return res.json({
      success: true,
      message: isCrossOrigin
        ? '🔥 CSRF BERHASIL! Bio berubah! (Image tag CSRF via GET)'
        : 'Bio berhasil diupdate.',
      cross_origin: isCrossOrigin,
      referer: referer || '(none)',
      origin: origin || '(none)',
      user: {
        id: user.id,
        username: user.username,
        bio: user.bio,
        email: user.email
      },
      flag: flag,
      csrf_detected: isCrossOrigin,
      explanation: 'GET /api/csrf-v2 bisa di-trigger dari <img src="..."> tag! ' +
        'Browser otomatis mengirim GET request + cookie saat memuat gambar. ' +
        'Ini adalah CSRF klasik pada state-changing GET endpoint.'
    });
  } catch (err) {
    return res.json({
      success: true,
      message: isCrossOrigin
        ? 'CSRF BERHASIL! Bio berubah! (offline storage mode)'
        : 'Bio update simulated (offline storage mode).',
      storage_warning: 'Database unavailable: ' + err.message,
      cross_origin: isCrossOrigin,
      referer: referer || '(none)',
      origin: origin || '(none)',
      user: {
        id: req.user.id,
        username: req.user.username,
        bio,
        email: null
      },
      flag,
      csrf_detected: isCrossOrigin,
      explanation: 'Fallback mode: endpoint tetap menunjukkan vulnerability GET-based CSRF walau storage lokal tidak tersedia.'
    });
  }
});

// Reset bio endpoint — utility untuk mengembalikan bio user
router.get('/reset', requireAuth, async (req, res) => {
  const db = require('../config/database');
  try {
    await db.query(
      "UPDATE users SET bio = 'ACT LAB Participant' WHERE id = $1",
      [req.user.id]
    );
    return res.json({
      success: true,
      message: 'Bio berhasil direset!'
    });
  } catch (err) {
    return res.json({
      success: true,
      message: 'Bio reset simulated (offline storage mode).',
      storage_warning: err.message
    });
  }
});

module.exports = router;
