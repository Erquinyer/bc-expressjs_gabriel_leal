// ============================================
// TIPOS — Dominio: Notaría
// ============================================
// Recurso principal: Document (trámite notarial).

export interface Document {
  id: string;
  name: string;
  category: string;
  fee: number;
  availableSlots: number;
  active: boolean;
}

// Resumen que el procesador calcula sobre el catálogo de trámites
export interface DocumentSummary {
  total: number;
  active: number;
  inactive: number;
  averageFee: number;
  mostExpensive: Document;
  cheapest: Document;
  categories: string[];
}

// Reporte final que se escribe en output/report.json
export interface Report {
  generatedAt: string;
  appliedFilter: string | null;
  summary: DocumentSummary;
  documents: Document[];
}
