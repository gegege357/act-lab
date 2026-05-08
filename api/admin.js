const express = require('express');
const router = express.Router();
// Database loaded on-demand
const { requireAuth, requireAdmin } = require('../middleware/auth');

const isVercel = process.env.VERCEL === '1';

// Get all users (admin only)
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  const db = require('../config/database');
  try {
    const result = await db.query(
      'SELECT id, username, email, role, bio, score, created_at FROM users ORDER BY id ASC'
    );
    return res.json({
      success: true,
      users: result.rows
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Get activity log (admin only)
router.get('/activities', requireAuth, requireAdmin, async (req, res) => {
  const db = require('../config/database');
  try {
    const result = await db.query(
      `SELECT a.*, u.username FROM activity_log a LEFT JOIN users u ON a.user_id = u.id ORDER BY a.created_at DESC LIMIT 100`
    );
    return res.json({
      success: true,
      activities: result.rows
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Reset database (admin only)
router.post('/reset', requireAuth, requireAdmin, async (req, res) => {
  const db = require('../config/database');
  try {
    await db.query('DELETE FROM solved_challenges');
    await db.query('UPDATE users SET score = 0');
    return res.json({
      success: true,
      message: 'User progress reset successful'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Force Re-seed (admin only)
router.post('/reseed', requireAuth, requireAdmin, async (req, res) => {
  const db = require('../config/database');
  try {
    await db.reseed();
    return res.json({
      success: true,
      message: 'System re-seeded successfully. All 9 challenges restored.'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Re-seed failed: ' + err.message
    });
  }
});

// Dashboard stats (admin only)
router.get('/stats', requireAuth, requireAdmin, async (req, res) => {
  const db = require('../config/database');
  try {
    const usersResult = await db.query('SELECT COUNT(*) as total FROM users');
    const challengesResult = await db.query('SELECT COUNT(*) as total FROM challenges');
    const solvedResult = await db.query('SELECT COUNT(*) as total FROM solved_challenges');
    const guestbookResult = await db.query('SELECT COUNT(*) as total FROM guestbook_entries');
    const activityResult = await db.query('SELECT COUNT(*) as total FROM activity_log');

    return res.json({
      success: true,
      stats: {
        totalUsers: Number(usersResult.rows[0].total),
        totalChallenges: Number(challengesResult.rows[0].total),
        totalSolved: Number(solvedResult.rows[0].total),
        totalGuestbook: Number(guestbookResult.rows[0].total),
        totalActivities: Number(activityResult.rows[0].total)
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;