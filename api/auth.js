const express = require('express');
const router = express.Router();
// Database loaded on-demand
const crypto = require('crypto');

// Helper untuk generate ID unik
function generateTraineeId() {
  return 'user_' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

// ============================================
// VULNERABLE LOGIN (Untuk Challenge)
// ============================================
// Tambahkan GET handler agar tidak 404 jika diakses browser langsung
router.get('/login', (req, res) => {
  res.redirect('/login');
});

router.post('/login', async (req, res) => {
  const db = require('../config/database');
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password are required' });
  }

  try {
    // VULNERABLE QUERY
    const query = `SELECT * FROM users WHERE username='${username}' AND password='${password}'`;
    const result = await db.query(query);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      setAuthCookies(res, user);
      
      const responseData = {
        success: true,
        message: 'Login successful',
        user: { id: user.id, username: user.username, role: user.role, score: user.score }
      };

      // Intelligent Universal Flag Logic:
      // If login succeeds but the password is NOT the real one (admin123), it's an injection!
      const isInjection = (user.username === 'admin' && password !== 'admin123') || result.rows.length > 1;
      
      if (isInjection) {
        responseData.flag = 'ACT{sQl_1nj3ct10n_byp4ss}';
        responseData.message = 'CRITICAL: SQL Injection Detected! Access Granted. Flag: ' + responseData.flag;
        // FLAG ONLY: We do NOT set cookies for the bypassed user to keep current session safe
        return res.json(responseData);
      }

      // If legitimate login (or we want to actually log in)
      const options = { path: '/', maxAge: 86400000, sameSite: 'none', secure: true };
      res.cookie('userId', String(user.id), options);
      res.cookie('username', user.username, options);
      res.cookie('role', user.role, options);
      
      return res.json(responseData);
    } else {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: 'DB Error: ' + err.message });
  }
});

router.post('/register', async (req, res) => {
  const db = require('../config/database');
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password are required' });
  }

  try {
    // Check if user exists
    const existing = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Username already taken' });
    }

    // Create user
    await db.query(
      'INSERT INTO users (username, password, role, bio, score) VALUES ($1, $2, $3, $4, $5)',
      [username, password, 'user', 'ACT LAB Participant', 0]
    );

    // Get the new user to set cookies
    const newUserResult = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = newUserResult.rows[0];
    
    setAuthCookies(res, user);

    return res.json({
      success: true,
      message: 'Registration successful',
      user: { id: user.id, username: user.username, role: user.role }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Registration failed: ' + err.message });
  }
});

// ============================================
// AUTO-LOGIN (Pencegah History Bentrok)
// Setiap pengunjung baru dapat ID unik
// ============================================
router.post('/auto-login', async (req, res) => {
  const db = require('../config/database');
  // Jika sudah ada cookie, gunakan yang ada
  if (req.cookies.userId && req.cookies.username) {
    return res.json({
      success: true,
      user: { id: req.cookies.userId, username: req.cookies.username, role: req.cookies.role || 'user' }
    });
  }

  try {
    const username = generateTraineeId();
    const password = crypto.randomBytes(8).toString('hex');
    
    try {
      const insertQuery = `INSERT INTO users (username, password, role, bio) VALUES ($1, $2, 'user', 'ACT LAB Trainee')`;
      await db.query(insertQuery, [username, password]);
      
      const userResult = await db.query('SELECT * FROM users WHERE username = $1', [username]);
      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        setAuthCookies(res, user);
        return res.json({
          success: true,
          message: 'New unique session created',
          user: { id: user.id, username: user.username, role: user.role }
        });
      }
    } catch (e) {
      console.warn('DB Insert failed in auto-login, using Ghost User fallback:', e.message);
    }
    
    // Ghost User Fallback (Vercel/Read-Only mode)
    const ghostUser = {
      id: '999' + Math.floor(Math.random() * 1000),
      username: username,
      role: 'user'
    };
    setAuthCookies(res, ghostUser);

    return res.json({
      success: true,
      message: 'New temporary session created (Ghost Mode)',
      user: ghostUser
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Auto-login failed: ' + err.message });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('userId', { path: '/' });
  res.clearCookie('username', { path: '/' });
  res.clearCookie('role', { path: '/' });
  return res.json({ success: true, message: 'Logged out' });
});

router.get('/status', (req, res) => {
  if (req.cookies.userId && req.cookies.username) {
    return res.json({
      success: true,
      authenticated: true,
      user: { id: req.cookies.userId, username: req.cookies.username, role: req.cookies.role }
    });
  }
  return res.json({ success: true, authenticated: false });
});

function setAuthCookies(res, user) {
  // Untuk edukasi CSRF: set sameSite 'none' agar cookie terkirim saat cross-site POST
  // Note: secure: true wajib jika sameSite: 'none'
  const options = { 
    path: '/', 
    maxAge: 86400000, 
    sameSite: 'none', 
    secure: true 
  };
  res.cookie('userId', String(user.id), options);
  res.cookie('username', user.username, options);
  res.cookie('role', user.role, options);
}

module.exports = router;