require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const { rateLimiters } = require('./middleware/ratelimit');

// ============================================
// RAILWAY OPTIMASI: Deteksi environment
// ============================================
const IS_RAILWAY = !!process.env.RAILWAY_SERVICE_ID;
const IS_VERCEL = process.env.VERCEL === '1';
const IS_PRODUCTION = IS_RAILWAY || IS_VERCEL || process.env.NODE_ENV === 'production';

if (IS_RAILWAY) {
  console.log('🚆 Running on Railway — Production mode');
  console.log('📊 Port:', PORT);
}

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(cookieParser(process.env.SESSION_SECRET || 'act-lab-secret'));

const publicPath = path.join(__dirname, 'public');
const viewsPath = path.join(__dirname, 'views');
app.use(express.static(publicPath, { maxAge: '1d' }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Auto-auth middleware: If no session, create a guest session automatically
app.use(async (req, res, next) => {
  if (req.path.includes('.') || req.path.startsWith('/api/auth/login') || req.path.startsWith('/api/auth/register') || req.path.startsWith('/api/auth/logout')) {
    return next();
  }

  if (!req.cookies.userId || !req.cookies.username) {
    try {
      const crypto = require('crypto');
      const guestSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
      const username = 'guest_' + guestSuffix;
      const guestId = parseInt('999' + parseInt(guestSuffix, 16).toString().substring(0, 4));
      
      const db = require('./config/database');
      try {
        await db.query(`INSERT INTO users (id, username, password, role, bio) VALUES ($1, $2, $3, 'user', 'Auto-generated Guest')`, 
          [guestId, username, 'guest-pass-' + guestSuffix]);
      } catch (e) {
        // Ignore errors in auto-auth (e.g. user already exists)
      }
      
      const options = { path: '/', maxAge: 86400000, sameSite: 'none', secure: true };
      res.cookie('userId', String(guestId), options);
      res.cookie('username', username, options);
      res.cookie('role', 'user', options);
      
      req.cookies.userId = String(guestId);
      req.cookies.username = username;
      req.cookies.role = 'user';
    } catch (err) {
      console.warn('Auto-auth middleware warning:', err.message);
    }
  }
  next();
});

// ============================================
// RATE LIMITING — Terapkan per endpoint
// ============================================
app.use('/api/auth/login', rateLimiters.auth);
app.use('/api/auth/register', rateLimiters.auth);
app.use('/api/guestbook', rateLimiters.guestbook);
app.use('/api/search', rateLimiters.read);
app.use('/api/profile', rateLimiters.read);
app.use('/api/admin/stats', rateLimiters.admin);
app.use('/api/admin/users', rateLimiters.admin);
app.use('/api/admin/reset', rateLimiters.admin);
app.use('/api/admin/reseed', rateLimiters.admin);
app.use('/api/flag/submit', rateLimiters.flag);
app.use('/api/csrf-challenge', rateLimiters.read);
app.use('/api/csrf-v2', rateLimiters.read);

if (IS_PRODUCTION) {
  // Di production, batasi juga halaman lab
  app.use('/lab/', rateLimiters.read);
  app.use('/api/challenges', rateLimiters.read);
}

// API routes
app.use('/api/auth', require('./api/auth'));
app.use('/api/challenges', require('./api/challenges'));
app.use('/api/search', require('./api/search'));
app.use('/api/profile', require('./api/profile'));
app.use('/api/guestbook', require('./api/guestbook'));
app.use('/api/redirect', require('./api/redirect'));
app.use('/api/admin', require('./api/admin'));
app.use('/api/flag', require('./api/flag'));
app.use('/api/csrf-challenge', require('./api/csrf-challenge'));
app.use('/api/csrf-v2', require('./api/csrf-v2'));

// ============================================
// HEALTH CHECK — Untuk Railway monitoring
// ============================================
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: IS_RAILWAY ? 'railway' : IS_VERCEL ? 'vercel' : 'local',
    uptime: process.uptime()
  });
});

const pageRoutes = {
  '/': 'index.html',
  '/login': 'login.html',
  '/register': 'register.html',
  '/dashboard': 'dashboard.html',
  '/challenges': 'challenges.html',
  '/profile': 'profile.html',
  '/guestbook': 'guestbook.html',
  '/search': 'search.html',
  '/redirect': 'redirect.html',
  '/admin': 'admin.html'
};

Object.entries(pageRoutes).forEach(([route, file]) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(viewsPath, file), (err) => {
      if (err && err.code !== 'ERR_HTTP_HEADERS_SENT') {
        res.status(404).json({ success: false, error: 'Page not found' });
      }
    });
  });
});

app.get('/challenge/:id', (req, res) => {
  res.sendFile(path.join(viewsPath, 'challenge-detail.html'), (err) => {
    if (err && err.code !== 'ERR_HTTP_HEADERS_SENT') {
      res.status(404).json({ success: false, error: 'Page not found' });
    }
  });
});

app.get('/lab/:slug', (req, res) => {
  const slug = req.params.slug.replace(/\.\./g, '');
  res.sendFile(path.join(viewsPath, 'labs', `${slug}.html`), (err) => {
    if (err && err.code !== 'ERR_HTTP_HEADERS_SENT') {
      res.status(404).json({ success: false, error: 'Page not found' });
    }
  });
});

app.use((req, res) => res.status(404).json({ success: false, error: 'Endpoint not found' }));
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ success: false, error: 'Internal server error', detail: err.message });
});

// ============================================
// SEED DATABASE FIRST (before accepting requests)
// This avoids race conditions where requests hit
// auto-auth middleware before tables exist.
// ============================================
const seedDB = async () => {
  try {
    const fs = require('fs');
    const path = require('path');
    const seedPath = path.join(__dirname, 'config', 'seed_sqlite.sql');
    if (!fs.existsSync(seedPath)) {
      console.warn('Seed file not found at:', seedPath);
      return;
    }
    
    const db = require('./config/database');
    
    // Check if challenges table exists
    let needsSeed = false;
    try {
      const checkResult = await db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='challenges'");
      const tableExists = checkResult.rows && checkResult.rows.length > 0;
      if (tableExists) {
        const countResult = await db.query('SELECT COUNT(*) as cnt FROM challenges');
        const count = countResult.rows && countResult.rows[0] ? countResult.rows[0].cnt : 0;
        needsSeed = count === 0;
        if (needsSeed) console.log('Tables exist but empty, re-seeding...');
        else console.log('Database already seeded, skipping auto-seed');
      } else {
        console.log('Tables not found, running initial seed...');
        needsSeed = true;
      }
    } catch (checkErr) {
      console.log('Cannot check tables, running initial seed...');
      needsSeed = true;
    }
    
    if (needsSeed) {
      const seedSQL = fs.readFileSync(seedPath, 'utf8');
      // Remove comment lines FIRST, then split by semicolon.
      // This prevents multi-line SQL starting with -- comments from being filtered out.
      const noComments = seedSQL.split('\n').filter(l => !l.trim().startsWith('--')).join('\n');
      const statements = noComments.split(';').map(s => s.trim()).filter(s => s.length > 0);
      for (const stmt of statements) {
        try {
          await db.query(stmt);
        } catch (e) {
          // Ignore per-statement errors (e.g. "table already exists" on re-seed)
        }
      }
      console.log('Database seeded successfully from seed_sqlite.sql');
    }
  } catch (err) {
    console.warn('Auto-seed error:', err.message);
  }
};

// First seed, then listen (prevents race condition)
(async () => {
  await seedDB();
  
  // ============================================
  // CLEANUP OTOMATIS — Hapus guest lama & XSS di startup
  // ============================================
  try {
    const db = require('./config/database');
    await db.cleanupOldGuests();
    console.log('🧹 Auto-cleanup completed on startup');
  } catch (e) {
    // Non-fatal if cleanup fails
  }
  
  // ============================================
  // CLEANUP BERKALA — Setiap 6 jam (untuk Railway)
  // ============================================
  if (IS_PRODUCTION) {
    setInterval(async () => {
      try {
        const db = require('./config/database');
        await db.cleanupOldGuests();
        console.log('🧹 Periodic cleanup completed');
      } catch (e) {
        console.warn('Periodic cleanup failed:', e.message);
      }
    }, 6 * 60 * 60 * 1000); // 6 jam
  }

  app.listen(PORT, () => {
    console.log(`Server running on: http://localhost:${PORT}`);
    if (IS_RAILWAY) {
      console.log('🌐 Public URL: https://' + (process.env.RAILWAY_PUBLIC_DOMAIN || 'assigned-by-railway') + '/');
    }
  });
})();