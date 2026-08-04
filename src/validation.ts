// Validación básica del payload de Document para POST y PUT
export function validateDocumentPayload(body: unknown): string[] {
  const errors: string[] = [];

  if (typeof body !== 'object' || body === null) {
    return ['El cuerpo de la petición debe ser un objeto JSON'];
  }

  const data = body as Record<string, unknown>;

  if (typeof data.name !== 'string' || data.name.trim() === '') {
    errors.push('name es requerido y debe ser un texto no vacío');
  }
  if (typeof data.category !== 'string' || data.category.trim() === '') {
    errors.push('category es requerido y debe ser un texto no vacío');
  }
  if (typeof data.fee !== 'number' || Number.isNaN(data.fee) || data.fee < 0) {
    errors.push('fee es requerido y debe ser un número mayor o igual a 0');
  }
  if (typeof data.availableSlots !== 'number' || Number.isNaN(data.availableSlots) || data.availableSlots < 0) {
    errors.push('availableSlots es requerido y debe ser un número mayor o igual a 0');
  }
  if (typeof data.active !== 'boolean') {
    errors.push('active es requerido y debe ser booleano');
  }

  return errors;
}
