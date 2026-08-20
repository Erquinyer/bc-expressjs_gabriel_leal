// ============================================
// TYPES — recurso Document (trámite notarial)
// ============================================

export interface Document {
  id: number;
  name: string;
  category: string;
  fee: number;
  availableSlots: number;
  active: boolean;
  createdAt: Date;
}

// Tipos de respuesta REST — contrato estándar del bootcamp
export interface SingleResponse<T> {
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ValidationErrorResponse {
  error: string;
  message: string;
  issues: Array<{ field: string; message: string }>;
}

export interface ErrorResponse {
  error: string;
  message: string;
  stack?: string;
}
