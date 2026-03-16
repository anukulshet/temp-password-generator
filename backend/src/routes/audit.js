const express          = require('express');
const { authenticate } = require('../middleware/auth');
const { getLogsForOwner } = require('../services/audit');

const router = express.Router();

router.use(authenticate);

// GET /api/audit — fetch all audit logs for the logged-in admin
router.get('/', async (req, res) => {
  try {
    const logs = await getLogsForOwner(req.userId);
    return res.json({ logs });
  } catch (err) {
    console.error('audit fetch error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
