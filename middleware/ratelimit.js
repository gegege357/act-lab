// ============================================
// RATE LIMITER — In-Memory (No Redis)
// Untuk melindungi endpoint sensitif dari abuse
// saat banyak peserta menggunakan lab bersamaan
// ============================================

// Map of { key: { count, resetTime } }
const requestCounts = new Map();

function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of requestCounts.entries()) {
    if (now > entry.resetTime) {
      requestCounts.delete(key);
    }
  }
}

// Bersihkan cache setiap 5 menit agar tidak bocor memory pada server lokal.
// Di Vercel, instance serverless bisa dibekukan kapan saja, jadi cleanup cukup
// dilakukan opportunistic saat request masuk.
if (process.env.VERCEL !== '1') {
  const cleanupTimer = setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
  if (cleanupTimer.unref) cleanupTimer.unref();
}

/**
 * Create a rate limiter middleware
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds (default: 60000 = 1 menit)
 * @param {number} options.max - Max requests per window (default: 30)
 * @param {string} options.message - Error message when rate limited
 * @param {Function} options.keyGenerator - Function to generate rate limit key from req
 */
function rateLimit(options = {}) {
  const windowMs = options.windowMs || 60 * 1000; // 1 menit default
  const max = options.max || 30; // 30 request per menit default
  const message = options.message || 'Too many requests. Please slow down.';
  const keyGenerator = options.keyGenerator || ((req) => req.ip || req.connection.remoteAddress || 'unknown');

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();

    if (process.env.VERCEL === '1' && requestCounts.size > 1000) {
      cleanupExpiredEntries();
    }

    let entry = requestCounts.get(key);
    
    if (!entry || now > entry.resetTime) {
      // Reset counter
      entry = { count: 0, resetTime: now + windowMs };
      requestCounts.set(key, entry);
    }

    entry.count++;

    // Set rate limit headers
    const remaining = Math.max(0, max - entry.count);
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        success: false,
        error: message,
        retryAfter: retryAfter,
        hint: 'Rate limit exceeded. Wait ' + retryAfter + ' seconds before retrying.'
      });
    }

    next();
  };
}

// Pre-defined rate limiters untuk berbagai endpoint
const rateLimiters = {
  // Ketat: Login/Register — 25 request per menit
  // Dinaikkan dari 10 agar peserta bisa eksperimen payload via Burp Repeater
  auth: rateLimit({
    windowMs: 60 * 1000,
    max: 25,
    message: 'Too many login attempts. Please wait 1 minute.'
  }),
  
  // Sedang: Guestbook — 20 post per menit
  guestbook: rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: 'Too many guestbook posts. Please slow down.'
  }),

  // Longgar: Search/Profile GET — 60 request per menit
  read: rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: 'Too many requests. Please slow down.'
  }),

  // Sangat ketat: Admin endpoints — 5 request per menit
  admin: rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: 'Admin endpoint rate limited. Please wait.'
  }),

  // Submit flag — 10 per menit (cegah brute force)
  flag: rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: 'Too many flag submissions. Please wait.'
  })
};

module.exports = {
  rateLimit,
  rateLimiters
};
