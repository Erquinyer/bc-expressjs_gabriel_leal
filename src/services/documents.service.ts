// ============================================
// SERVICE — lógica de negocio (sin Express)
// ============================================
import { Document, PaginatedResponse } from '../types';
import * as repo from '../repositories/documents.repository';
import { AppError } from '../errors/AppError';

interface FindAllOptions {
  page: number;
  limit: number;
}

export async function findAll(opts: FindAllOptions): Promise<PaginatedResponse<Document>> {
  const { page, limit } = opts;
  const all = await repo.findAll();
  const start = (page - 1) * limit;
  const data = all.slice(start, start + limit);
  return { data, total: all.length, page, limit };
}

export async function findById(id: number): Promise<Document> {
  const document = await repo.findById(id);
  if (!document) throw new AppError(404, `Trámite ${id} no encontrado`);
  return document;
}

export async function create(dto: repo.CreateDocumentRepoDto): Promise<Document> {
  return repo.create(dto);
}

export async function update(
  id: number,
  dto: repo.UpdateDocumentRepoDto
): Promise<Document> {
  const exists = await repo.findById(id);
  if (!exists) throw new AppError(404, `Trámite ${id} no encontrado`);
  const updated = await repo.update(id, dto);
  return updated!;
}

export async function remove(id: number): Promise<void> {
  const exists = await repo.findById(id);
  if (!exists) throw new AppError(404, `Trámite ${id} no encontrado`);
  await repo.remove(id);
}
