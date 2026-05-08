const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { checkFlag, FLAGS } = require('../utils/flags');

// Submit flag directly
router.post('/submit', requireAuth, (req, res) => {
  const { flag } = req.body;

  if (!flag) {
    return res.status(400).json({
      success: false,
      error: 'Flag is required'
    });
  }

  const result = checkFlag(flag);

  if (result.valid) {
    return res.json({
      success: true,
      message: 'Flag is valid!',
      flagKey: result.key
    });
  } else {
    return res.json({
      success: false,
      message: 'Invalid flag'
    });
  }
});

// Get all flag keys (without values) for reference
router.get('/keys', (req, res) => {
  return res.json({
    success: true,
    availableKeys: Object.keys(FLAGS).map(k => k.replace(/_/g, ' '))
  });
});

module.exports = router;