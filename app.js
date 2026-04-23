require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
// const mongoSanitize         = require('express-mongo-sanitize');
const sanitize = require('mongo-sanitize');
const cookieParser = require('cookie-parser');
const { globalLimiter } = require('./src/middleware/rateLimiter.middleware');
const authRoutes = require('./src/routes/auth.routes');
const userRoutes = require('./src/routes/user.routes');
const vehicleRoutes = require('./src/routes/vehicle.routes');

const app = express();

// ─── CORS ────────────────────────────────────────────────────────────────────
// app.use(cors({
//   origin: [
//     'http://localhost:5173',
//     process.env.CLIENT_URL,
//   ].filter(Boolean),
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
// }));
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    console.error(`CORS Error: Origin not allowed: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));


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
app.use('/', authRoutes); // Support root-level links from emails
app.use('/api/users', userRoutes);
app.use('/uploads', express.static('uploads'));
app.use('/api/vehicles', vehicleRoutes);

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

// ─── Global error handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Never leak stack traces to the client in production
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
    return res.status(statusCode).json({ message, stack: err.stack });
  }

  res.status(statusCode).json({ message });
});

module.exports = app;