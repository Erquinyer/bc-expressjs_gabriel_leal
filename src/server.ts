import mongoose from 'mongoose';
import { app } from './app.js';
import { env } from './config/env.js';

const PORT = env.PORT;

async function startServer(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI);
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
