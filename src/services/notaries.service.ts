// ============================================
// SERVICE — lógica de negocio del recurso secundario (solo lectura)
// ============================================
import * as repo from '../repositories/notaries.repository';
import { AppError } from '../errors/AppError';
import type { NotaryWithDocuments } from '../repositories/notaries.repository';

interface FindAllResult {
  data: NotaryWithDocuments[];
  total: number;
  page: number;
  limit: number;
}

export async function listNotaries(page: number, limit: number): Promise<FindAllResult> {
  return repo.findAll(page, limit);
}

export async function getNotary(id: number): Promise<NotaryWithDocuments> {
  const notary = await repo.findById(id);
  if (!notary) throw new AppError(404, `Notaría ${id} no encontrada`);
  return notary;
}
