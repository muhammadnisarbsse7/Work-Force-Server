import 'dotenv/config';
import { validateEnv } from './src/config/env.js';
import connectDB from './src/config/db.js';
import app from './app.js';
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
