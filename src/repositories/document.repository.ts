import mongoose from 'mongoose';
import { DocumentModel, IDocument } from '../models/document.model';
import { CreateDocumentDto, UpdateDocumentDto } from '../schemas/document.schema';
import { AppError } from '../errors/AppError';

// ============================================
// REPOSITORIO: Document
// ============================================

// No se usa `instanceof MongoServerError`: con pnpm, mongoose puede resolver
// su propia copia interna del paquete `mongodb`, distinta de la instalada
// como dependencia directa — dos instancias de módulo distintas rompen el
// `instanceof` (ver nota técnica semana 06). Se compara `err.code === 11000`
// de forma estructural.
function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 11000;
}

export async function findAll(): Promise<IDocument[]> {
  return DocumentModel.find().sort({ createdAt: -1 });
}

export async function findById(id: string): Promise<IDocument | null> {
  try {
    return await DocumentModel.findById(id);
  } catch (err) {
    if (err instanceof mongoose.Error.CastError) throw new AppError(400, 'ID inválido');
    throw err;
  }
}

export async function create(data: CreateDocumentDto & { createdBy: string }): Promise<IDocument> {
  try {
    return await DocumentModel.create(data);
  } catch (err) {
    if (isDuplicateKeyError(err)) throw new AppError(409, 'Ya existe un trámite con ese code');
    throw err;
  }
}

export async function updateById(id: string, data: UpdateDocumentDto): Promise<IDocument | null> {
  try {
    return await DocumentModel.findByIdAndUpdate(id, data, {
      returnDocument: 'after',
      runValidators: true,
    });
  } catch (err) {
    if (err instanceof mongoose.Error.CastError) throw new AppError(400, 'ID inválido');
    if (isDuplicateKeyError(err)) throw new AppError(409, 'Ya existe un trámite con ese code');
    throw err;
  }
}

export async function deleteById(id: string): Promise<boolean> {
  try {
    const deleted = await DocumentModel.findByIdAndDelete(id);
    return deleted !== null;
  } catch (err) {
    if (err instanceof mongoose.Error.CastError) throw new AppError(400, 'ID inválido');
    throw err;
  }
}
