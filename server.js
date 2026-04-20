require('dotenv').config();
const { validateEnv } = require('./src/config/env');
const connectDB = require('./src/config/db');
const app = require('./app');

// Validate all required env vars before doing anything else
validateEnv();

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully.');
  process.exit(0);
});
