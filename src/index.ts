// ============================================
// ENTRY POINT — Orquesta el flujo del procesador
// ============================================

import { readDocuments } from './reader.js';
import { filterByCategory, calculateSummary } from './processor.js';
import { writeReport } from './writer.js';
import type { Report } from './types.js';

function parseCategoryFilter(argv: string[]): string | null {
  const args = argv.slice(2);
  const categoryIndex = args.indexOf('--category');
  return categoryIndex !== -1 ? (args[categoryIndex + 1] ?? null) : null;
}

async function main(): Promise<void> {
  const categoryFilter = parseCategoryFilter(process.argv);

  try {
    const documents = await readDocuments();
    const filtered = filterByCategory(documents, categoryFilter);
    const summary = calculateSummary(filtered);

    const report: Report = {
      generatedAt: new Date().toISOString(),
      appliedFilter: categoryFilter,
      summary,
      documents: filtered,
    };

    console.log('=== Notaría — Catálogo de trámites ===');
    if (categoryFilter) console.log(`Filtro aplicado: ${categoryFilter}`);
    console.log(`Total de trámites: ${summary.total}`);
    console.log(`Activos: ${summary.active} · Inactivos: ${summary.inactive}`);
    console.log(`Tarifa promedio: $${summary.averageFee.toLocaleString('es-CO')}`);
    console.log(
      `Más caro: ${summary.mostExpensive.name} ($${summary.mostExpensive.fee.toLocaleString('es-CO')})`,
    );
    console.log(
      `Más barato: ${summary.cheapest.name} ($${summary.cheapest.fee.toLocaleString('es-CO')})`,
    );
    console.log(`Categorías: ${summary.categories.join(', ')}`);

    await writeReport(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}

main();
