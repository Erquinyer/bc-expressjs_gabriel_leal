import { app } from './app';
import { connectDB, disconnectDB } from './lib/mongoose';

const PORT = process.env['PORT'] ?? '3000';

async function main(): Promise<void> {
  await connectDB();
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  function shutdown(signal: string): void {
    console.log(`${signal} recibido, cerrando servidor...`);
    server.close(() => {
      void disconnectDB().finally(() => process.exit(0));
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
