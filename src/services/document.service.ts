import { IDocument } from '../models/document.model';
import * as documentRepository from '../repositories/document.repository';
import { CreateDocumentDto, UpdateDocumentDto } from '../schemas/document.schema';
import { AppError } from '../errors/AppError';

// ============================================
// SERVICIO: Document
// ============================================

export async function getAll(): Promise<IDocument[]> {
  return documentRepository.findAll();
}

export async function getById(id: string): Promise<IDocument> {
  const document = await documentRepository.findById(id);
  if (!document) throw new AppError(404, `Trámite ${id} no encontrado`);
  return document;
}

export async function create(dto: CreateDocumentDto, userId: string): Promise<IDocument> {
  return documentRepository.create({ ...dto, createdBy: userId });
}

export async function update(id: string, dto: UpdateDocumentDto): Promise<IDocument> {
  await getById(id);
  const updated = await documentRepository.updateById(id, dto);
  return updated!;
}

export async function remove(id: string): Promise<void> {
  const deleted = await documentRepository.deleteById(id);
  if (!deleted) throw new AppError(404, `Trámite ${id} no encontrado`);
}
