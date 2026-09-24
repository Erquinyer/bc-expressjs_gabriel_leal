// ============================================
// SEED — Datos iniciales del dominio Notaría
// Ejecutar con: pnpm seed
// ============================================
import { connectDB, disconnectDB } from './lib/mongoose';
import { Notary } from './models/notary.model';
import { Document } from './models/document.model';

async function seed(): Promise<void> {
  await connectDB();

  // Limpiar colecciones (orden inverso: principal primero, luego secundaria)
  await Document.deleteMany({});
  await Notary.deleteMany({});
  console.log('Collections cleared');

  // Paso A — insertar Notary (secundaria) y capturar _id
  const [central, norte] = await Notary.insertMany([
    { name: 'Notaría Primera del Círculo de Bogotá', licenseNumber: 'NOT-001', city: 'Bogotá' },
    { name: 'Notaría Segunda de Medellín', licenseNumber: 'NOT-002', city: 'Medellín' },
  ]);
  console.log('Notaries inserted');

  // Paso B — insertar Document (principal) referenciando notary._id
  await Document.insertMany([
    {
      code: 'ESC-001',
      name: 'Escritura de compraventa de inmueble',
      category: 'escrituras',
      fee: 350000,
      availableSlots: 8,
      active: true,
      notary: central._id,
    },
    {
      code: 'POD-001',
      name: 'Poder general',
      category: 'poderes',
      fee: 45000,
      availableSlots: 20,
      active: true,
      notary: central._id,
    },
    {
      code: 'TES-001',
      name: 'Testamento abierto',
      category: 'testamentos',
      fee: 220000,
      availableSlots: 5,
      active: true,
      notary: norte._id,
    },
    {
      code: 'AUT-001',
      name: 'Autenticación de firma',
      category: 'autenticaciones',
      fee: 18000,
      availableSlots: 30,
      active: true,
      notary: norte._id,
    },
    {
      code: 'ACT-001',
      name: 'Acta de conciliación extrajudicial',
      category: 'actas',
      fee: 60000,
      availableSlots: 12,
      active: true,
      notary: central._id,
    },
  ]);
  console.log('Documents inserted');

  console.log('Seed completed successfully');
  await disconnectDB();
}

seed().catch((err: unknown) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
