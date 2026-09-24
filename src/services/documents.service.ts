// ============================================
// SERVICE — lógica de negocio (sin Express, sin Prisma directo)
// ============================================
import * as repo from '../repositories/documents.repository';
import { AppError } from '../errors/AppError';
import type { CreateDocumentDto, UpdateDocumentDto } from '../schemas/document.schema';
import type { DocumentWithNotary } from '../repositories/documents.repository';

interface FindAllResult {
  data: DocumentWithNotary[];
  total: number;
  page: number;
  limit: number;
}

export async function listDocuments(page: number, limit: number): Promise<FindAllResult> {
  return repo.findAll(page, limit);
}

export async function getDocument(id: number): Promise<DocumentWithNotary> {
  const document = await repo.findById(id);
  if (!document) throw new AppError(404, `Trámite ${id} no encontrado`);
  return document;
}

export async function createDocument(dto: CreateDocumentDto): Promise<DocumentWithNotary> {
  return repo.create(dto);
}

export async function updateDocument(id: number, dto: UpdateDocumentDto): Promise<DocumentWithNotary> {
  return repo.update(id, dto);
}

export async function deleteDocument(id: number): Promise<void> {
  return repo.remove(id);
}
