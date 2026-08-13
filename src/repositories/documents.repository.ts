// ============================================
// REPOSITORY — Capa de acceso a datos
// ============================================
// Único punto de acceso al store en memoria. Todos los métodos son
// async y retornan copias defensivas (nunca la referencia interna).

import type { Document, CreateDocumentDto, UpdateDocumentDto } from '../types.js';

const documents: Document[] = [
  { id: 1, name: 'Escritura de compraventa de inmueble', category: 'escrituras', fee: 350000, availableSlots: 8, active: true },
  { id: 2, name: 'Poder general', category: 'poderes', fee: 45000, availableSlots: 20, active: true },
  { id: 3, name: 'Testamento abierto', category: 'testamentos', fee: 220000, availableSlots: 5, active: true },
  { id: 4, name: 'Autenticación de firma', category: 'autenticaciones', fee: 15000, availableSlots: 40, active: true },
  { id: 5, name: 'Acta de conciliación extrajudicial', category: 'actas', fee: 90000, availableSlots: 6, active: true },
];
let nextId = 6;

export async function findAll(): Promise<Document[]> {
  return [...documents];
}

export async function findById(id: number): Promise<Document | undefined> {
  const document = documents.find((doc) => doc.id === id);
  return document ? { ...document } : undefined;
}

export async function create(dto: CreateDocumentDto): Promise<Document> {
  const document: Document = { id: nextId++, ...dto };
  documents.push(document);
  return { ...document };
}

export async function update(id: number, dto: UpdateDocumentDto): Promise<Document | undefined> {
  const index = documents.findIndex((doc) => doc.id === id);
  if (index === -1) return undefined;
  documents[index] = { ...documents[index]!, ...dto };
  return { ...documents[index]! };
}

export async function remove(id: number): Promise<boolean> {
  const index = documents.findIndex((doc) => doc.id === id);
  if (index === -1) return false;
  documents.splice(index, 1);
  return true;
}
