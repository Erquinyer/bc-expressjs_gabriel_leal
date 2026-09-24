// ============================================
// SERVER — entry point + graceful shutdown
// ============================================
import { createApp } from './app';
import { logger } from './config/logger';
import { prisma } from './lib/prisma';

const PORT = process.env['PORT'] ? Number(process.env['PORT']) : 3000;

const app = createApp();

const server = app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
});

function shutdown(signal: string): void {
  logger.info(`${signal} recibido, cerrando servidor...`);
  server.close(() => {
    void prisma.$disconnect().finally(() => {
      logger.info('Servidor cerrado correctamente');
      process.exit(0);
    });
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
