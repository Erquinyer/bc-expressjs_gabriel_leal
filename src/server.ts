import { createApp } from './app';
import { logger } from './config/logger';

const PORT = process.env['PORT'] ? Number(process.env['PORT']) : 3000;

const app = createApp();

const server = app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
});

function shutdown(signal: string): void {
  logger.info(`${signal} recibido, cerrando servidor...`);
  server.close(() => {
    logger.info('Servidor cerrado correctamente');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
