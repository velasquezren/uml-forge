/**
 * Saca el valor de `reply` de un JSON que todavia esta llegando a trozos, para
 * mostrar la respuesta mientras la IA la escribe (ADR 0044). Decodifica los
 * escapes de cadena JSON hasta donde haya llegado el texto y se detiene en la
 * comilla de cierre. Devuelve null si `reply` aun no ha empezado.
 */
export function extractPartialReply(partialJson: string): string | null {
  const start = /"reply"\s*:\s*"/u.exec(partialJson);
  if (start === null) return null;

  let index = start.index + start[0].length;
  let out = '';
  while (index < partialJson.length) {
    const char = partialJson.charAt(index);
    if (char === '"') return out;
    if (char !== '\\') {
      out += char;
      index += 1;
      continue;
    }
    const next = partialJson.charAt(index + 1);
    if (next === '') return out; // el escape se corto entre dos trozos
    if (next === 'u') {
      const hex = partialJson.slice(index + 2, index + 6);
      if (hex.length < 4) return out;
      out += String.fromCharCode(parseInt(hex, 16));
      index += 6;
      continue;
    }
    const escapes: Record<string, string> = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f' };
    out += escapes[next] ?? next;
    index += 2;
  }
  return out;
}
