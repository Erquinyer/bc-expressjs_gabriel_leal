// ============================================
// PROCESSOR — Filtra y calcula estadísticas del catálogo
// ============================================

import type { Document, DocumentSummary } from './types.js';

export function filterByCategory(
  documents: Document[],
  categoryFilter: string | null,
): Document[] {
  if (categoryFilter === null) return documents;

  const filtered = documents.filter(
    (doc) => doc.category.toLowerCase() === categoryFilter.toLowerCase(),
  );

  if (filtered.length === 0) {
    const available = Array.from(new Set(documents.map((doc) => doc.category)));
    throw new Error(
      `No hay trámites en la categoría "${categoryFilter}". Categorías disponibles: ${available.join(', ')}`,
    );
  }

  return filtered;
}

export function calculateSummary(documents: Document[]): DocumentSummary {
  const active = documents.filter((doc) => doc.active).length;
  const inactive = documents.length - active;

  const totalFee = documents.reduce((sum, doc) => sum + doc.fee, 0);
  const averageFee = Math.round((totalFee / documents.length) * 100) / 100;

  const mostExpensive = documents.reduce((max, doc) => (doc.fee > max.fee ? doc : max));
  const cheapest = documents.reduce((min, doc) => (doc.fee < min.fee ? doc : min));

  const categories = Array.from(new Set(documents.map((doc) => doc.category)));

  return {
    total: documents.length,
    active,
    inactive,
    averageFee,
    mostExpensive,
    cheapest,
    categories,
  };
}
