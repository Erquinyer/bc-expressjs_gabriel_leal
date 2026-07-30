// ============================================
// READER — Lee el catálogo de trámites notariales
// ============================================

import { readFile } from 'fs/promises';
import { join } from 'path';
import type { Document } from './types.js';

export async function readDocuments(): Promise<Document[]> {
  const filePath = join(import.meta.dirname, '..', 'data', 'documents.json');
  try {
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw) as Document[];
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`No se pudo leer "${filePath}": ${reason}`);
  }
}
