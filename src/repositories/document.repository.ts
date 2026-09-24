// ============================================
// REPOSITORY: Document (entidad principal, con populate)
// ============================================
import mongoose from 'mongoose';
import { Document } from '../models/document.model';
import { AppError } from '../errors/AppError';
import type { CreateDocumentDto, UpdateDocumentDto } from '../schemas/document.schema';

// No se usa `instanceof MongoServerError`: con pnpm, mongoose puede resolver
// su propia copia interna del paquete `mongodb`, distinta de la que se
// instala como dependencia directa — dos instancias de módulo distintas
// rompen el `instanceof`. El código 11000 es estable, así que se compara
// estructuralmente.
function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 11000;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export async function findAll(
  page: number,
  limit: number,
  search?: string,
): Promise<PaginatedResult<unknown>> {
  const skip = (page - 1) * limit;
  const filter = search ? { name: { $regex: search, $options: 'i' } } : {};
  const [data, total] = await Promise.all([
    Document.find(filter)
      .populate('notary')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Document.countDocuments(filter),
  ]);
  return { data, total, page, totalPages: Math.ceil(total / limit) };
}

export async function findById(id: string): Promise<unknown> {
  let document;
  try {
    document = await Document.findById(id).populate('notary').lean();
  } catch (err) {
    if (err instanceof mongoose.Error.CastError) throw new AppError(400, 'ID inválido');
    throw err;
  }
  if (!document) throw new AppError(404, `Trámite ${id} no encontrado`);
  return document;
}

export async function create(dto: CreateDocumentDto): Promise<unknown> {
  try {
    const document = await Document.create(dto);
    const populated = await document.populate('notary');
    return populated.toJSON();
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      throw new AppError(409, 'Ya existe un trámite con ese code');
    }
    if (err instanceof mongoose.Error.CastError) throw new AppError(400, 'ID de notaría inválido');
    throw err;
  }
}

export async function update(id: string, dto: UpdateDocumentDto): Promise<unknown> {
  let document;
  try {
    document = await Document.findByIdAndUpdate(id, dto, { returnDocument: 'after', runValidators: true })
      .populate('notary')
      .lean();
  } catch (err) {
    if (err instanceof mongoose.Error.CastError) throw new AppError(400, 'ID inválido');
    if (isDuplicateKeyError(err)) {
      throw new AppError(409, 'Ya existe un trámite con ese code');
    }
    throw err;
  }
  if (!document) throw new AppError(404, `Trámite ${id} no encontrado`);
  return document;
}

export async function remove(id: string): Promise<void> {
  let document;
  try {
    document = await Document.findByIdAndDelete(id).lean();
  } catch (err) {
    if (err instanceof mongoose.Error.CastError) throw new AppError(400, 'ID inválido');
    throw err;
  }
  if (!document) throw new AppError(404, `Trámite ${id} no encontrado`);
}
