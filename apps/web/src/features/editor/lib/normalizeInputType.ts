/**
 * Normaliza el tipo ingresado en texto libre para atributos a los tipos estandar
 * o a los identificadores de clasificadores existentes.
 */
export function normalizeInputType(input: string, typeNames?: Record<string, string>): string {
  const trimmed = input.trim();
  if (!trimmed) return 'String';

  const lower = trimmed.toLowerCase();
  if (lower === 'string' || lower === 'str' || lower === 'varchar' || lower === 'char')
    return 'String';
  if (lower === 'int' || lower === 'integer' || lower === 'short' || lower === 'byte')
    return 'Integer';
  if (lower === 'long' || lower === 'bigint') return 'Long';
  if (lower === 'double' || lower === 'float' || lower === 'real' || lower === 'number')
    return 'Double';
  if (lower === 'decimal' || lower === 'bigdecimal' || lower === 'numeric') return 'BigDecimal';
  if (lower === 'bool' || lower === 'boolean') return 'Boolean';
  if (lower === 'date') return 'Date';
  if (lower === 'datetime' || lower === 'timestamp' || lower === 'time') return 'DateTime';
  if (lower === 'uuid' || lower === 'guid') return 'UUID';
  if (lower === 'text' || lower === 'clob') return 'Text';

  if (typeNames) {
    for (const [id, name] of Object.entries(typeNames)) {
      if (name.toLowerCase() === lower) {
        return id;
      }
    }
  }

  return trimmed;
}
