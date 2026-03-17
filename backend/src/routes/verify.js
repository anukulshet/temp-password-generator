/**
 * verify.js — Public routes for recipient token verification
 * No JWT required — recipients don't have accounts.
 */

const express = require('express');
const { verifyAccess } = require('../controllers/verifyController');

const router = express.Router();

// POST /api/verify — submit token + email to get credentials
router.post('/', verifyAccess);

module.exports = router;
