// ============================================
// SERVICE — Lógica de negocio
// ============================================
// Cero imports de Express. Contiene la paginación y delega el acceso
// a datos al repository. Retorna undefined/false cuando no encuentra
// el recurso; el controller decide qué status HTTP corresponde.

import type { CreateDocumentDto, UpdateDocumentDto, Document, PaginatedResponse, PaginationParams } from '../types.js';
import * as repo from '../repositories/documents.repository.js';

export async function findAll(params: PaginationParams): Promise<PaginatedResponse<Document>> {
  const { page, limit } = params;
  const all = await repo.findAll();
  const start = (page - 1) * limit;
  const data = all.slice(start, start + limit);
  return { data, total: all.length, page, limit };
}

export async function findById(id: number): Promise<Document | undefined> {
  return repo.findById(id);
}

export async function create(dto: CreateDocumentDto): Promise<Document> {
  return repo.create(dto);
}

export async function update(id: number, dto: UpdateDocumentDto): Promise<Document | undefined> {
  const exists = await repo.findById(id);
  if (!exists) return undefined;
  return repo.update(id, dto);
}

export async function remove(id: number): Promise<boolean> {
  const exists = await repo.findById(id);
  if (!exists) return false;
  return repo.remove(id);
}
