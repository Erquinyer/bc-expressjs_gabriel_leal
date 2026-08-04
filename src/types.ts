// ============================================
// TYPES — Dominio: Notaría
// ============================================
// Recurso principal: Document (trámite notarial).

export interface Document {
  id: number;
  name: string;
  category: string;
  fee: number;
  availableSlots: number;
  active: boolean;
}

// DTO para crear un trámite (sin id, se genera automáticamente)
export type CreateDocumentDto = Omit<Document, 'id'>;

// DTO para actualización completa (PUT reemplaza el recurso completo)
export type UpdateDocumentDto = CreateDocumentDto;
