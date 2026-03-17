const express = require('express');
const { handleRedirect } = require('../controllers/redirectController');

const router = express.Router();

// Public — no JWT, recipient uses a short-lived redirect token
router.get('/', handleRedirect);

module.exports = router;
