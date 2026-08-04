import type { Document, CreateDocumentDto, UpdateDocumentDto } from './types.js';

// Store en memoria — simula una base de datos sin persistencia
// Los datos se pierden al reiniciar el servidor (se usará BD a partir de week-05)
const documents: Document[] = [
  { id: 1, name: 'Escritura de compraventa de inmueble', category: 'escrituras', fee: 350000, availableSlots: 8, active: true },
  { id: 2, name: 'Poder general', category: 'poderes', fee: 45000, availableSlots: 20, active: true },
  { id: 3, name: 'Testamento abierto', category: 'testamentos', fee: 220000, availableSlots: 5, active: true },
  { id: 4, name: 'Autenticación de firma', category: 'autenticaciones', fee: 15000, availableSlots: 40, active: true },
  { id: 5, name: 'Acta de conciliación extrajudicial', category: 'actas', fee: 90000, availableSlots: 6, active: true },
];
let nextId = 6;

export function getAll(): Document[] {
  return documents;
}

export function getById(id: number): Document | undefined {
  return documents.find((doc) => doc.id === id);
}

export function create(data: CreateDocumentDto): Document {
  const newDocument: Document = { id: nextId++, ...data };
  documents.push(newDocument);
  return newDocument;
}

export function update(id: number, data: UpdateDocumentDto): Document | undefined {
  const document = documents.find((doc) => doc.id === id);
  if (!document) return undefined;
  Object.assign(document, data);
  return document;
}

export function remove(id: number): boolean {
  const index = documents.findIndex((doc) => doc.id === id);
  if (index === -1) return false;
  documents.splice(index, 1);
  return true;
}
