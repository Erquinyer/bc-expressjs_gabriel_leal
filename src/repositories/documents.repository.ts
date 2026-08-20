// ============================================
// REPOSITORY — capa de acceso a datos (en memoria)
// ============================================
import { Document } from '../types';

export type CreateDocumentRepoDto = Omit<Document, 'id' | 'createdAt'>;
export type UpdateDocumentRepoDto = Partial<CreateDocumentRepoDto>;

let documents: Document[] = [
  {
    id: 1,
    name: 'Escritura de compraventa de inmueble',
    category: 'escrituras',
    fee: 350000,
    availableSlots: 8,
    active: true,
    createdAt: new Date('2026-01-05'),
  },
  {
    id: 2,
    name: 'Poder general',
    category: 'poderes',
    fee: 45000,
    availableSlots: 20,
    active: true,
    createdAt: new Date('2026-01-06'),
  },
  {
    id: 3,
    name: 'Testamento abierto',
    category: 'testamentos',
    fee: 220000,
    availableSlots: 5,
    active: true,
    createdAt: new Date('2026-01-07'),
  },
  {
    id: 4,
    name: 'Autenticación de firma',
    category: 'autenticaciones',
    fee: 18000,
    availableSlots: 30,
    active: true,
    createdAt: new Date('2026-01-08'),
  },
  {
    id: 5,
    name: 'Acta de conciliación extrajudicial',
    category: 'actas',
    fee: 60000,
    availableSlots: 12,
    active: true,
    createdAt: new Date('2026-01-09'),
  },
];

let nextId = 6;

export async function findAll(): Promise<Document[]> {
  return [...documents];
}

export async function findById(id: number): Promise<Document | undefined> {
  const document = documents.find((d) => d.id === id);
  return document ? { ...document } : undefined;
}

export async function create(dto: CreateDocumentRepoDto): Promise<Document> {
  const document: Document = { id: nextId++, ...dto, createdAt: new Date() };
  documents.push(document);
  return { ...document };
}

export async function update(
  id: number,
  dto: UpdateDocumentRepoDto
): Promise<Document | undefined> {
  const index = documents.findIndex((d) => d.id === id);
  if (index === -1) return undefined;
  documents[index] = { ...documents[index]!, ...dto };
  return { ...documents[index]! };
}

export async function remove(id: number): Promise<boolean> {
  const index = documents.findIndex((d) => d.id === id);
  if (index === -1) return false;
  documents.splice(index, 1);
  return true;
}
