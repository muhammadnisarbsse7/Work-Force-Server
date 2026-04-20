require('dotenv').config();
const express               = require('express');
const helmet                = require('helmet');
// const mongoSanitize         = require('express-mongo-sanitize');
const sanitize = require('mongo-sanitize');
const cookieParser          = require('cookie-parser');
const { globalLimiter }     = require('./src/middleware/rateLimiter.middleware');
const authRoutes            = require('./src/routes/auth.routes');

const app = express();

// ─── Security headers ────────────────────────────────────────────────────────
app.use(helmet());

// ─── Body parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));   // Prevents large payload attacks
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// ─── Sanitize MongoDB query operators in req.body/params ─────────────────────
// app.use(mongoSanitize());
app.use((req, res, next) => {
  if (req.body) req.body = sanitize(req.body);
  if (req.params) req.params = sanitize(req.params);
  if (req.query) req.query = sanitize(req.query);
  next();
});

// ─── Global rate limiting ────────────────────────────────────────────────────
app.use(globalLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

// ─── Global error handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message    = err.message    || 'Internal Server Error';

  // Never leak stack traces to the client in production
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
    return res.status(statusCode).json({ message, stack: err.stack });
  }

  res.status(statusCode).json({ message });
});

module.exports = app;