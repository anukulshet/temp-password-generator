require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { testConnection } = require('./config/database');
const { deviceFingerprint } = require('./middleware/deviceFingerprint');

const app = express();

// Security headers
app.use(helmet());

// CORS — allow any localhost port in dev, lock to FRONTEND_URL in production
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.startsWith('http://localhost') || origin === process.env.FRONTEND_URL) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10kb' }));

// Global rate limiter — stricter limits applied per-route where needed
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(globalLimiter);
app.use(deviceFingerprint);

// Routes
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/resources', require('./routes/resource'));
app.use('/api/access',    require('./routes/access'));
app.use('/api/audit',     require('./routes/audit'));
app.use('/api/verify',    require('./routes/verify'));
app.use('/api/redirect',  require('./routes/redirect'));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, async () => {
  console.log(`AccessOS backend running on port ${PORT}`);
  await testConnection(); // Fail fast if DB is unreachable
});

module.exports = app;
