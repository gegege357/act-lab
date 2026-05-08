require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

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

// API routes
app.use('/api/auth', require('./api/auth'));
app.use('/api/challenges', require('./api/challenges'));
app.use('/api/search', require('./api/search'));
app.use('/api/profile', require('./api/profile'));
app.use('/api/guestbook', require('./api/guestbook'));
app.use('/api/redirect', require('./api/redirect'));
app.use('/api/admin', require('./api/admin'));

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

app.listen(PORT, () => console.log(`Server running on: http://localhost:${PORT}`));