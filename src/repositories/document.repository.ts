import { DocumentModel, type IDocument } from '../models/document.model.js';
import type { CreateDocumentDto, UpdateDocumentDto } from '../types/index.js';

// ============================================================
// REPOSITORIO DE DOCUMENTS — capa de acceso a datos
// ============================================================
// En los unit tests, ESTE módulo se mockea con jest.mock().
// En los integration tests, accede a MongoDB Memory Server.
// ============================================================

export async function findAllDocuments(createdBy?: string): Promise<IDocument[]> {
  const filter = createdBy ? { createdBy } : {};
  return DocumentModel.find(filter).lean<IDocument[]>().exec();
}

export async function findDocumentById(id: string): Promise<IDocument | null> {
  return DocumentModel.findById(id).lean<IDocument>().exec();
}

export async function createDocument(
  dto: CreateDocumentDto,
  createdBy: string,
): Promise<IDocument> {
  const document = new DocumentModel({ ...dto, createdBy });
  return document.save() as unknown as IDocument;
}

export async function updateDocument(
  id: string,
  dto: UpdateDocumentDto,
): Promise<IDocument | null> {
  return DocumentModel.findByIdAndUpdate(id, dto, { new: true }).lean<IDocument>().exec();
}

export async function deleteDocument(id: string): Promise<IDocument | null> {
  return DocumentModel.findByIdAndDelete(id).lean<IDocument>().exec();
}
