// ============================================
// REPOSITORY — acceso a datos con Prisma Client (recurso secundario, solo lectura)
// ============================================
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

const notaryInclude = { documents: true } satisfies Prisma.NotaryInclude;

export type NotaryWithDocuments = Prisma.NotaryGetPayload<{ include: typeof notaryInclude }>;

interface FindAllResult {
  data: NotaryWithDocuments[];
  total: number;
  page: number;
  limit: number;
}

export async function findAll(page: number, limit: number): Promise<FindAllResult> {
  const [data, total] = await Promise.all([
    prisma.notary.findMany({
      skip: (page - 1) * limit,
      take: limit,
      include: notaryInclude,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notary.count(),
  ]);
  return { data, total, page, limit };
}

export async function findById(id: number): Promise<NotaryWithDocuments | null> {
  return prisma.notary.findUnique({ where: { id }, include: notaryInclude });
}
