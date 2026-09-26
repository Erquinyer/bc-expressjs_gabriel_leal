import { AppError } from '../errors/AppError.js';
import type { CreateDocumentDto, UpdateDocumentDto } from '../types/index.js';
import type { IDocument } from '../models/document.model.js';
import * as documentRepo from '../repositories/document.repository.js';

// ============================================================
// DOCUMENT SERVICE — lógica de negocio del trámite notarial
// ============================================================
// GET es público (getAll/getById no reciben rol); crear requiere estar
// autenticado; actualizar exige ser el dueño (createdBy) o admin; eliminar
// es admin-only, enforced con authorize('admin') en la ruta — remove() ya
// no necesita requesterId/requesterRole.
// ============================================================

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 11000;
}

export async function getAll(createdBy?: string): Promise<IDocument[]> {
  return documentRepo.findAllDocuments(createdBy);
}

export async function getById(id: string): Promise<IDocument> {
  const document = await documentRepo.findDocumentById(id);
  if (!document) throw new AppError(404, 'Document not found');
  return document;
}

export async function create(dto: CreateDocumentDto, createdBy: string): Promise<IDocument> {
  try {
    return await documentRepo.createDocument(dto, createdBy);
  } catch (err) {
    if (isDuplicateKeyError(err)) throw new AppError(409, 'A document with that code already exists');
    throw err;
  }
}

export async function update(
  id: string,
  dto: UpdateDocumentDto,
  requesterId: string,
  requesterRole: string,
): Promise<IDocument> {
  const existing = await documentRepo.findDocumentById(id);
  if (!existing) throw new AppError(404, 'Document not found');

  // Solo el creador o un admin puede actualizar
  if (existing.createdBy !== requesterId && requesterRole !== 'admin') {
    throw new AppError(403, 'Insufficient permissions');
  }

  try {
    const updated = await documentRepo.updateDocument(id, dto);
    if (!updated) throw new AppError(404, 'Document not found');
    return updated;
  } catch (err) {
    if (isDuplicateKeyError(err)) throw new AppError(409, 'A document with that code already exists');
    throw err;
  }
}

export async function remove(id: string): Promise<void> {
  const existing = await documentRepo.findDocumentById(id);
  if (!existing) throw new AppError(404, 'Document not found');

  await documentRepo.deleteDocument(id);
}
