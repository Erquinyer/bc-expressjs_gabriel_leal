// ============================================
// SERVICE: Document — delega al repositorio,
// valida que la notaría referenciada exista antes de crear/actualizar
// ============================================
import * as repo from '../repositories/document.repository';
import * as notaryRepo from '../repositories/notary.repository';
import { AppError } from '../errors/AppError';
import type { CreateDocumentDto, UpdateDocumentDto } from '../schemas/document.schema';

async function assertNotaryExists(notaryId: string): Promise<void> {
  try {
    await notaryRepo.findById(notaryId);
  } catch (err) {
    if (err instanceof AppError && err.statusCode === 404) {
      throw new AppError(400, 'La notaría indicada no existe');
    }
    throw err;
  }
}

export async function getAll(page: number, limit: number, search?: string) {
  return repo.findAll(page, limit, search);
}

export async function getById(id: string) {
  return repo.findById(id);
}

export async function createDocument(dto: CreateDocumentDto) {
  await assertNotaryExists(dto.notary);
  return repo.create(dto);
}

export async function updateDocument(id: string, dto: UpdateDocumentDto) {
  if (dto.notary) await assertNotaryExists(dto.notary);
  return repo.update(id, dto);
}

export async function deleteDocument(id: string) {
  return repo.remove(id);
}
