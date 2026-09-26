import mongoose from 'mongoose';
import { DocumentModel, IDocument } from '../models/document.model.js';
import type { CreateDocumentDto, UpdateDocumentDto } from '../schemas/document.schema.js';
import { AppError } from '../errors/AppError.js';

// ============================================
// SERVICIO: Document
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
  return DocumentModel.find({ active: true }).sort({ createdAt: -1 });
}

export async function findById(id: string): Promise<IDocument | null> {
  try {
    return await DocumentModel.findById(id);
  } catch (err) {
    if (err instanceof mongoose.Error.CastError) throw new AppError(400, 'Invalid id');
    throw err;
  }
}

export async function create(data: CreateDocumentDto, userId: string): Promise<IDocument> {
  try {
    // createdBy guarda quién creó el trámite — se usa luego en update() para
    // decidir si el solicitante es el dueño.
    return await DocumentModel.create({ ...data, createdBy: userId });
  } catch (err) {
    if (isDuplicateKeyError(err)) throw new AppError(409, 'A document with that code already exists');
    throw err;
  }
}

export async function update(
  id: string,
  data: UpdateDocumentDto,
  requesterId: string,
  requesterRole: string
): Promise<IDocument | null> {
  let document;
  try {
    document = await DocumentModel.findById(id);
  } catch (err) {
    if (err instanceof mongoose.Error.CastError) throw new AppError(400, 'Invalid id');
    throw err;
  }
  if (!document) return null;

  // Un usuario solo puede editar SU trámite; admin puede editar cualquiera.
  if (requesterRole !== 'admin' && document.createdBy !== requesterId) {
    throw new Error('FORBIDDEN'); // capturado en el controller → AppError(403)
  }

  try {
    return await DocumentModel.findByIdAndUpdate(id, data, {
      returnDocument: 'after',
      runValidators: true,
    });
  } catch (err) {
    if (isDuplicateKeyError(err)) throw new AppError(409, 'A document with that code already exists');
    throw err;
  }
}

export async function remove(id: string): Promise<IDocument | null> {
  try {
    return await DocumentModel.findByIdAndDelete(id);
  } catch (err) {
    if (err instanceof mongoose.Error.CastError) throw new AppError(400, 'Invalid id');
    throw err;
  }
}
