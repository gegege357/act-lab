const express = require('express');
const router = express.Router();

// ============================================
// VULNERABILITY: Open Redirect
// Lokasi: GET / dengan parameter url
// Penjelasan:
//   Parameter 'url' langsung digunakan sebagai
//   target redirect tanpa validasi whitelist.
//   Attacker bisa membuat link yang terlihat
//   seperti berasal dari domain ACT LAB tapi
//   mengarah ke situs phishing.
//
// Payload:
//   /api/redirect?url=https://evil.com
//   /api/redirect?url=//evil.com
//   /api/redirect?url=/\evil.com
// ============================================
router.get('/', (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({
      success: false,
      error: 'URL parameter is required'
    });
  }

  // *** NO DOMAIN VALIDATION ***
  // Universal Detection: If redirecting to an external site, show the flag
  const isExternal = url.startsWith('http') || url.startsWith('//');
  const isLocal = url.includes('localhost') || url.includes('127.0.0.1');

  if (isExternal && !isLocal) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>PHISHING SUCCESS - ACT LAB</title>
        <link rel="stylesheet" href="/css/style.css">
        <style>
          body { background: var(--bg-color); height: 100vh; display: flex; justify-content: center; align-items: center; margin: 0; }
        </style>
      </head>
      <body>
        <div class="cyber-bg"></div>
        <div class="container" style="max-width: 600px; text-align: center;">
          <div class="hacked-animation mb-3">PHISHING SUCCESS</div>
          <div class="card" style="border-color: var(--neon-pink); background: rgba(0,0,0,0.8);">
            <h1 style="color: var(--neon-pink); font-family: 'Orbitron', sans-serif; font-size: 1.5rem; margin-bottom: 1rem;">🚩 CHALLENGE SOLVED!</h1>
            <p class="text-secondary mb-4">You successfully exploited an Open Redirect vulnerability.</p>
            
            <div style="background: rgba(255,0,102,0.1); border: 2px dashed var(--neon-pink); padding: 1.5rem; border-radius: 8px;">
              <div class="text-xs text-dim mb-1">YOUR FLAG</div>
              <div style="font-size: 1.6rem; color: var(--neon-yellow); font-family: 'Share Tech Mono', monospace; font-weight: bold; letter-spacing: 2px;">ACT{0p3n_r3d1r3ct_vuln}</div>
            </div>
            
            <p style="margin-top: 2rem; color: var(--text-dim); font-size: 0.8rem;">
              Redirecting to <code class="text-cyan">${url}</code> in <span id="countdown">3</span>s...
            </p>
          </div>
        </div>
        <script>
          let count = 3;
          setInterval(() => {
            count--;
            document.getElementById('countdown').textContent = count;
            if(count <= 0) window.location.href = "${url}";
          }, 1000);
        </script>
      </body>
      </html>
    `);
  }

  // Redirect to any URL without checking whitelist
  return res.redirect(url);
});

module.exports = router;