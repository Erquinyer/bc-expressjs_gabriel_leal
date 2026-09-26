import 'dotenv/config';

export const env = {
  NODE_ENV: process.env['NODE_ENV'] ?? 'development',
  PORT: parseInt(process.env['PORT'] ?? '3000', 10),
  MONGODB_URI: process.env['MONGODB_URI'] ?? 'mongodb://localhost:27017/proyecto-testing',
  JWT_ACCESS_SECRET: process.env['JWT_ACCESS_SECRET'] ?? 'change-me',
  JWT_REFRESH_SECRET: process.env['JWT_REFRESH_SECRET'] ?? 'change-me',
  JWT_ACCESS_EXPIRES_IN: process.env['JWT_ACCESS_EXPIRES_IN'] ?? '15m',
  JWT_REFRESH_EXPIRES_IN: process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d',
} as const;
