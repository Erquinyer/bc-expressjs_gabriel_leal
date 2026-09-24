// ============================================
// REPOSITORY: Notary (entidad secundaria)
// ============================================
import mongoose from 'mongoose';
import { Notary } from '../models/notary.model';
import { AppError } from '../errors/AppError';
import type { CreateNotaryDto, UpdateNotaryDto } from '../schemas/notary.schema';

// No se usa `instanceof MongoServerError`: con pnpm, mongoose puede resolver
// su propia copia interna del paquete `mongodb`, distinta de la que se
// instala como dependencia directa — dos instancias de módulo distintas
// rompen el `instanceof`. El código 11000 es estable, así que se compara
// estructuralmente.
function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 11000;
}

export async function findAll(): Promise<unknown[]> {
  return Notary.find().sort({ name: 1 }).lean();
}

export async function findById(id: string): Promise<unknown> {
  let notary;
  try {
    notary = await Notary.findById(id).lean();
  } catch (err) {
    if (err instanceof mongoose.Error.CastError) throw new AppError(400, 'ID inválido');
    throw err;
  }
  if (!notary) throw new AppError(404, `Notaría ${id} no encontrada`);
  return notary;
}

export async function create(dto: CreateNotaryDto): Promise<unknown> {
  try {
    const notary = await Notary.create(dto);
    return notary.toJSON();
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      throw new AppError(409, 'Ya existe una notaría con ese licenseNumber');
    }
    throw err;
  }
}

export async function update(id: string, dto: UpdateNotaryDto): Promise<unknown> {
  let notary;
  try {
    notary = await Notary.findByIdAndUpdate(id, dto, { returnDocument: 'after', runValidators: true }).lean();
  } catch (err) {
    if (err instanceof mongoose.Error.CastError) throw new AppError(400, 'ID inválido');
    if (isDuplicateKeyError(err)) {
      throw new AppError(409, 'Ya existe una notaría con ese licenseNumber');
    }
    throw err;
  }
  if (!notary) throw new AppError(404, `Notaría ${id} no encontrada`);
  return notary;
}

export async function remove(id: string): Promise<void> {
  let notary;
  try {
    notary = await Notary.findByIdAndDelete(id).lean();
  } catch (err) {
    if (err instanceof mongoose.Error.CastError) throw new AppError(400, 'ID inválido');
    throw err;
  }
  if (!notary) throw new AppError(404, `Notaría ${id} no encontrada`);
}
