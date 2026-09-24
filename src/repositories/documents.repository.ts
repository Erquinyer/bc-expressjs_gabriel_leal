// ============================================
// REPOSITORY — acceso a datos con Prisma Client
// ============================================
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../errors/AppError';
import type { CreateDocumentDto, UpdateDocumentDto } from '../schemas/document.schema';

const documentInclude = { notary: true } satisfies Prisma.DocumentInclude;

export type DocumentWithNotary = Prisma.DocumentGetPayload<{ include: typeof documentInclude }>;

interface FindAllResult {
  data: DocumentWithNotary[];
  total: number;
  page: number;
  limit: number;
}

export async function findAll(page: number, limit: number): Promise<FindAllResult> {
  const [data, total] = await Promise.all([
    prisma.document.findMany({
      skip: (page - 1) * limit,
      take: limit,
      include: documentInclude,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.document.count(),
  ]);
  return { data, total, page, limit };
}

export async function findById(id: number): Promise<DocumentWithNotary | null> {
  return prisma.document.findUnique({ where: { id }, include: documentInclude });
}

export async function create(dto: CreateDocumentDto): Promise<DocumentWithNotary> {
  try {
    return await prisma.document.create({ data: dto, include: documentInclude });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') throw new AppError(409, 'Ya existe un trámite con ese code');
      if (err.code === 'P2003') throw new AppError(400, 'El notaryId indicado no existe');
    }
    throw err;
  }
}

export async function update(id: number, dto: UpdateDocumentDto): Promise<DocumentWithNotary> {
  try {
    return await prisma.document.update({ where: { id }, data: dto, include: documentInclude });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2025') throw new AppError(404, `Trámite ${id} no encontrado`);
      if (err.code === 'P2002') throw new AppError(409, 'Ya existe un trámite con ese code');
      if (err.code === 'P2003') throw new AppError(400, 'El notaryId indicado no existe');
    }
    throw err;
  }
}

export async function remove(id: number): Promise<void> {
  try {
    await prisma.document.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new AppError(404, `Trámite ${id} no encontrado`);
    }
    throw err;
  }
}
