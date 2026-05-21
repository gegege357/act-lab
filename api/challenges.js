const express = require('express');
const router = express.Router();
// Removed top-level db require to prevent startup crashes
const { requireAuth } = require('../middleware/auth');

const CHALLENGES = [
  { id: 1, title: 'SQL Injection - Auth Bypass',       description: 'Login sebagai admin tanpa tahu password menggunakan SQL injection.',                           category: 'SQL Injection',  difficulty: 'Easy',   hint: "Payload: ' OR '1'='1' --",                                          points: 100, endpoint: '/lab/sqli-login' },
  { id: 2, title: 'SQL Injection - Data Extraction',   description: 'Cari password milik user "secret_agent" di tabel users.',                                     category: 'SQL Injection',  difficulty: 'Medium', hint: 'Gunakan UNION SELECT untuk menarik data dari tabel users.',         points: 200, endpoint: '/lab/sqli-union' },
  { id: 3, title: 'Reflected XSS',                     description: 'Trigger alert(document.cookie) melalui parameter pencarian.',                                  category: 'XSS',            difficulty: 'Easy',   hint: 'Coba input <script>alert(1)</script> di kotak pencarian.',           points: 100, endpoint: '/lab/xss-reflected' },
  { id: 4, title: 'Stored XSS',                        description: 'Simpan script di guestbook agar tereksekusi oleh pengunjung lain.',                            category: 'XSS',            difficulty: 'Medium', hint: 'Inject script di field pesan guestbook.',                            points: 200, endpoint: '/lab/xss-stored' },
  { id: 5, title: 'CSRF - Origin Bypass',               description: 'Bypass sistem verifikasi Origin/Referer pada form update profil.',                             category: 'CSRF',           difficulty: 'Hard',   hint: 'Verifikasi origin menggunakan pengecekan string .includes() yang lemah.', points: 300, endpoint: '/lab/csrf' },
  { id: 6, title: 'Open Redirect',                     description: 'Redirect user ke situs eksternal yang berbahaya.',                                             category: 'Open Redirect',  difficulty: 'Easy',   hint: 'Cek parameter ?url= di halaman redirect.',                          points: 100, endpoint: '/lab/redirect' },
  { id: 7, title: 'IDOR',                              description: 'Akses dan lihat data pribadi user lain melalui ID di URL.',                                     category: 'IDOR',           difficulty: 'Easy',   hint: 'Ganti parameter id= di URL profil.',                                points: 100, endpoint: '/lab/idor' },
  { id: 8, title: 'Blind SQL Injection',               description: 'Ekstrak data sensitif dari tabel "secret_vault" menggunakan teknik boolean-based.',             category: 'SQL Injection',  difficulty: 'Hard',   hint: 'Gunakan kondisi boolean and fungsi SUBSTR().',                       points: 300, endpoint: '/lab/sqli-blind' },
  { id: 9, title: 'Privilege Escalation',              description: 'Akses panel administrasi dengan memanipulasi cookie hak akses.',                               category: 'Auth Bypass',    difficulty: 'Medium', hint: 'Coba ubah cookie role dari user menjadi admin.',                     points: 200, endpoint: '/lab/privesc' },
  { id: 10, title: 'CSRF v2 - GET-based Image Tag Exploit', description: 'Eksploitasi CSRF via GET request yang bisa di-trigger pakai <img> atau <script> tag.', category: 'CSRF',           difficulty: 'Hard',   hint: 'Gunakan <img src="/api/csrf-v2?bio=pwned"> dari origin berbeda.',       points: 300, endpoint: '/lab/csrf-v2' },
];

const MASTER_FLAGS = {
  1: 'ACT{sQl_1nj3ct10n_byp4ss}',
  2: 'ACT{un10n_s3l3ct_3xtr4ct}',
  3: 'ACT{r3fl3ct3d_xss_f0und}',
  4: 'ACT{st0r3d_xss_m4st3r}',
  5: 'ACT{cr5f_byp4ss_r3f3r3r}',
  6: 'ACT{0p3n_r3d1r3ct_vuln}',
  7: 'ACT{1d0r_us3r_3num}',
  8: 'ACT{bl1nd_sQl_b00l34n}',
  9: 'ACT{pr1v1l3g3_3sc4l4t10n_succ3ss}',
  10: 'ACT{csrf_g3t_1mg_t4g}'
};

// ============================================
// GET /api/challenges — Hardcoded, always works
// ============================================
router.get('/', (req, res) => {
  try {
    return res.json({ success: true, challenges: CHALLENGES });
  } catch (err) {
    return res.json({ success: true, challenges: CHALLENGES }); // Force success
  }
});

// ============================================
// GET /api/challenges/progress/me
// ============================================
router.get('/progress/me', requireAuth, async (req, res) => {
  const db = require('../config/database');
  try {
    const solvedResult = await db.query(
      'SELECT challenge_id, solved_at FROM solved_challenges WHERE user_id=$1',
      [req.user.id]
    );
    const solvedIds = new Set(solvedResult.rows.map(r => r.challenge_id));
    const challenges = CHALLENGES.map(c => ({
      ...c,
      solved_at: solvedIds.has(c.id) ? solvedResult.rows.find(r => r.challenge_id === c.id).solved_at : null
    }));
    const solved = challenges.filter(c => c.solved_at !== null);
    const earnedPoints = solved.reduce((sum, c) => sum + c.points, 0);
    const totalPoints = CHALLENGES.reduce((sum, c) => sum + c.points, 0);
    return res.json({ success: true, total: CHALLENGES.length, solved: solved.length, totalPoints, earnedPoints, challenges });
  } catch (err) {
    // Even if DB fails, return structure with no progress
    const challenges = CHALLENGES.map(c => ({ ...c, solved_at: null }));
    const totalPoints = CHALLENGES.reduce((sum, c) => sum + c.points, 0);
    return res.json({ success: true, total: CHALLENGES.length, solved: 0, totalPoints, earnedPoints: 0, challenges });
  }
});

// ============================================
// GET /api/challenges/leaderboard/all
// ============================================
router.get('/leaderboard/all', async (req, res) => {
  try {
    const db = require('../config/database');
    try {
      const result = await db.query(
        `SELECT id, username, score FROM users ORDER BY score DESC LIMIT 20`
      );
      return res.json({ success: true, leaderboard: result.rows || [] });
    } catch (dbErr) {
      console.warn('Leaderboard DB error:', dbErr.message);
      return res.json({ success: true, leaderboard: [] });
    }
  } catch (err) {
    console.error('GET /leaderboard/all error:', err);
    return res.json({ success: true, leaderboard: [] });
  }
});

// ============================================
// POST /api/challenges/submit
// ============================================
router.post('/submit', requireAuth, async (req, res) => {
  try {
    const { flag } = req.body;
    const challengeId = parseInt(req.body.challengeId);

    if (!challengeId || !flag) {
      return res.status(400).json({ success: false, error: 'Challenge ID and flag are required' });
    }

    const correctFlag = MASTER_FLAGS[challengeId];
    const challenge = CHALLENGES.find(c => c.id === challengeId);

    if (!correctFlag) {
      return res.status(404).json({ success: false, error: 'Challenge not found' });
    }

    const db = require('../config/database');

    try {
      const solvedCheck = await db.query(
        'SELECT * FROM solved_challenges WHERE user_id=$1 AND challenge_id=$2',
        [req.user.id, challengeId]
      );
      if (solvedCheck.rows && solvedCheck.rows.length > 0) {
        return res.json({ success: true, message: 'You already solved this challenge!', alreadySolved: true });
      }

      if (flag.trim() === correctFlag) {
        await db.query(
          'INSERT INTO solved_challenges (user_id, challenge_id) VALUES ($1, $2)',
          [req.user.id, challengeId]
        );
        await db.query(
          'UPDATE users SET score = score + $1 WHERE id = $2',
          [challenge ? challenge.points : 100, req.user.id]
        );
        await db.query(
          'INSERT INTO activity_log (user_id, action, details) VALUES ($1, $2, $3)',
          [req.user.id, 'SOLVE_CHALLENGE', 'Solved: ' + (challenge ? challenge.title : 'Challenge ' + challengeId)]
        );

        const scoreResult = await db.query('SELECT score FROM users WHERE id = $1', [req.user.id]);
        const newScore = scoreResult.rows && scoreResult.rows[0] ? scoreResult.rows[0].score : 0;

        return res.json({
          success: true,
          message: 'Correct flag! Challenge solved!',
          correct: true,
          points: challenge ? challenge.points : 100,
          newScore
        });
      } else {
        return res.json({ success: true, message: 'Incorrect flag. Try again!', correct: false });
      }
    } catch (dbErr) {
      console.warn('DB error in submit, but allowing:', dbErr.message);
      // Still accept correct flag even if DB fails
      if (flag.trim() === correctFlag) {
        return res.json({
          success: true,
          message: 'Correct flag! (offline mode)',
          correct: true,
          points: challenge ? challenge.points : 100
        });
      }
      return res.json({ success: true, message: 'Incorrect flag. Try again!', correct: false });
    }
  } catch (err) {
    console.error('POST /submit error:', err);
    return res.status(500).json({ success: false, error: 'Internal error' });
  }
});

// ============================================
// GET /api/challenges/:id
// Keep this after named routes so /progress/me is not treated as id=progress.
// ============================================
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const challenge = CHALLENGES.find(c => c.id === id);
    if (!challenge) {
      return res.status(404).json({ success: false, error: 'Challenge not found' });
    }

    let solved = false;
    const userId = req.cookies.userId;

    if (userId) {
      try {
        const db = require('../config/database');
        const solvedResult = await db.query(
          'SELECT * FROM solved_challenges WHERE user_id=$1 AND challenge_id=$2',
          [userId, id]
        );
        solved = (solvedResult.rows && solvedResult.rows.length > 0);
      } catch (dbErr) {
        console.warn('DB check failed, solved=false:', dbErr.message);
      }
    }

    return res.json({ success: true, challenge, solved });
  } catch (err) {
    console.error('GET /:id error:', err);
    return res.status(500).json({ success: false, error: 'Internal error' });
  }
});

module.exports = router;
