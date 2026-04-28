import { validateEnv } from './src/config/env.js';
// validateEnv(); 
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import helmet from 'helmet';
// import mongoSanitize from 'express-mongo-sanitize';
import sanitize from 'mongo-sanitize';
import cookieParser from 'cookie-parser';
import { globalLimiter } from './src/middleware/rateLimiter.middleware.js';
import authRoutes from './src/routes/auth.routes.js';
import userRoutes from './src/routes/user.routes.js';
import vehicleRoutes from './src/routes/vehicle.routes.js';
import sensorRoutes from './src/routes/sensor.routes.js';
import projectRoutes from './src/routes/project.routes.js';
import violationRoutes from './src/routes/violation.routes.js';


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

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
        return callback(null, true);
      }

      console.error(`CORS Error: Origin not allowed: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// ─── Security headers ────────────────────────────────────────────────────────
app.use(helmet());

// ─── Body parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' })); // Prevents large payload attacks
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// ─── Sanitize MongoDB query operators in req.body/params ─────────────────────
// app.use(mongoSanitize());
app.use((req, res, next) => {
  if (req.body) sanitize(req.body);
  if (req.params) sanitize(req.params);
  if (req.query) sanitize(req.query);
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
app.use('/api/sensors', sensorRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/violations', violationRoutes);

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

export default app;
