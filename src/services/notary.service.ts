// ============================================
// SERVICE: Notary — delega al repositorio
// ============================================
import * as repo from '../repositories/notary.repository';
import type { CreateNotaryDto, UpdateNotaryDto } from '../schemas/notary.schema';

export async function getAll() {
  return repo.findAll();
}

export async function getById(id: string) {
  return repo.findById(id);
}

export async function createNotary(dto: CreateNotaryDto) {
  return repo.create(dto);
}

export async function updateNotary(id: string, dto: UpdateNotaryDto) {
  return repo.update(id, dto);
}

export async function deleteNotary(id: string) {
  return repo.remove(id);
}
