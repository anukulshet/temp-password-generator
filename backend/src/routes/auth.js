/**
 * auth.js routes
 *
 * POST /api/auth/signup   — create account
 * POST /api/auth/login    — get access + refresh tokens
 * POST /api/auth/refresh  — exchange refresh token for a new access token
 */

const express    = require('express');
const rateLimit  = require('express-rate-limit');
const { signup, login, refresh } = require('../controllers/authController');

const router = express.Router();

// Stricter rate limit for auth endpoints — 5 attempts per 15 min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts. Please try again in 15 minutes.' },
  skipSuccessfulRequests: true, // only count failures
});

router.post('/signup',  authLimiter, signup);
router.post('/login',   authLimiter, login);
router.post('/refresh', refresh);   // refresh has its own token-based protection

module.exports = router;
