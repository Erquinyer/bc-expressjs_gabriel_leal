// prisma/seed.ts — Datos iniciales del dominio Notaría
// Ejecutar con: pnpm dlx prisma db seed

import { PrismaClient, DocumentCategory } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🌱 Iniciando seed...');

  // 1. Limpiar datos existentes (idempotencia)
  await prisma.document.deleteMany();
  await prisma.notary.deleteMany();

  // 2. Recurso secundario primero (Notary)
  const [central, norte] = await Promise.all([
    prisma.notary.create({
      data: { name: 'Notaría Primera del Círculo de Bogotá', licenseNumber: 'NOT-001', city: 'Bogotá' },
    }),
    prisma.notary.create({
      data: { name: 'Notaría Segunda de Medellín', licenseNumber: 'NOT-002', city: 'Medellín' },
    }),
  ]);
  console.log('✅ 2 notarías creadas');

  // 3. Recurso principal (Document), mínimo 5 registros
  const result = await prisma.document.createMany({
    data: [
      {
        code: 'ESC-001',
        name: 'Escritura de compraventa de inmueble',
        category: DocumentCategory.escrituras,
        fee: 350000,
        availableSlots: 8,
        active: true,
        notaryId: central.id,
      },
      {
        code: 'POD-001',
        name: 'Poder general',
        category: DocumentCategory.poderes,
        fee: 45000,
        availableSlots: 20,
        active: true,
        notaryId: central.id,
      },
      {
        code: 'TES-001',
        name: 'Testamento abierto',
        category: DocumentCategory.testamentos,
        fee: 220000,
        availableSlots: 5,
        active: true,
        notaryId: norte.id,
      },
      {
        code: 'AUT-001',
        name: 'Autenticación de firma',
        category: DocumentCategory.autenticaciones,
        fee: 18000,
        availableSlots: 30,
        active: true,
        notaryId: norte.id,
      },
      {
        code: 'ACT-001',
        name: 'Acta de conciliación extrajudicial',
        category: DocumentCategory.actas,
        fee: 60000,
        availableSlots: 12,
        active: true,
        notaryId: central.id,
      },
    ],
  });

  console.log(`✅ ${result.count} trámites creados`);
}

main()
  .catch((err: unknown) => {
    console.error('❌ Error en seed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
