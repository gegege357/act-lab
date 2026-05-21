const express = require('express');
const router = express.Router();

// ============================================
// CSRF CHALLENGE — Read-only, aman untuk 200+ peserta
// 
// Tidak ada perubahan data user! Hanya deteksi
// bypass Referer/Origin via .includes() yang lemah.
//
// Endpoint: POST /api/csrf-challenge
// 
// Vulnerability: .includes() bisa di-bypass dengan
//   subdomain seperti: domain-kita.evil.com
// ============================================

router.post('/', async (req, res) => {
  const referer = req.headers['x-actlab-referer'] || req.body.referer || req.headers.referer || '';
  const origin = req.headers['x-actlab-origin'] || req.body.origin || req.headers.origin || '';
  const currentHost = req.headers.host || '';

  // *** SAME VULNERABILITY as profile.js ***
  // Gunakan .includes() yang lemah — bisa di-bypass
  const isAuthorized =
    referer.includes(currentHost) ||
    origin.includes(currentHost) ||
    referer.includes('localhost') ||
    origin.includes('localhost');

  if (!isAuthorized) {
    // Request tidak lolos validasi — CSRF Protection aktif
    return res.json({
      success: true,
      csrf_detected: false,
      bypassed: false,
      message: 'Blocked by CSRF Protection. Request origin not allowed.',
      referer: referer || '(none)',
      origin: origin || '(none)',
      hint: 'The server checks if the Referer includes "' + currentHost + '". ' +
        'Try setting a Referer that contains "' + currentHost + '" but from a different domain, ' +
        'like: http://' + currentHost + '.evil.com'
    });
  }

  // Request lolos validasi .includes() — 
  // Tentukan apakah ini bypass (dari evil domain) atau legitimate
  // Parsing URL untuk cek apakah hostname persis sama
  const getHostFromUrl = (url) => {
    try { return new URL(url).host; } catch(e) { return null; }
  };

  const refererHost = getHostFromUrl(referer);
  const originHost = getHostFromUrl(origin);
  const isLegitimateOrigin = refererHost === currentHost || originHost === currentHost;
  const isBypassOrigin =
    (refererHost && refererHost !== currentHost && referer.includes(currentHost)) ||
    (originHost && originHost !== currentHost && origin.includes(currentHost));

  if (isLegitimateOrigin && !isBypassOrigin) {
    // Request dari origin yang sama — legitimate
    return res.json({
      success: true,
      csrf_detected: false,
      bypassed: false,
      message: 'Request from same origin. No CSRF detected.',
      referer: referer || '(none)',
      origin: origin || '(none)',
      note: 'To exploit CSRF, send this request from a different origin. ' +
        'Try setting a custom Referer header that includes "' + currentHost + '" but from a different domain!'
    });
  }

  // BYPASS BERHASIL!
  // Request lolos validasi meskipun dari origin berbeda karena
  // .includes() hanya cek substring — contoh: "localhost:3000.evil.com"
  // mengandung string "localhost:3000" sehingga lolos!
  return res.json({
    success: true,
    csrf_detected: true,
    bypassed: true,
    message: 'CSRF Protection Bypassed! The .includes() check was fooled!',
    referer: referer || '(none)',
    origin: origin || '(none)',
    explanation: 'The server uses .includes() to check the Referer/Origin header. ' +
      'This can be bypassed by hosting an attacker page on ' + currentHost + '.evil.com ' +
      'because "' + currentHost + '" is contained in "' + currentHost + '.evil.com".',
    flag: 'ACT{cr5f_byp4ss_r3f3r3r}'
  });
});

module.exports = router;
