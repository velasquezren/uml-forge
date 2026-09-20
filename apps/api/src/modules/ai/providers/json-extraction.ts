/**
 * Aisla, limpia y repara objetos JSON de respuestas de modelos de lenguaje
 * locales (Ollama: Qwen, Llama, Llava, DeepSeek, etc.) y remotos (Gemini).
 *
 * Los modelos pequeños y locales suelen:
 * 1. Envolver respuestas en bloques de deliberación <think>...</think> o <thought>.
 * 2. Agregar vallas de código markdown ```json ... ```.
 * 3. Incluir comentarios estilo JS/C++ (// y /* ... * /).
 * 4. Dejar comas finales (trailing commas) en objetos y arrays.
 * 5. Usar comillas simples en lugar de dobles o claves sin comillas.
 * 6. Usar literales Python (True, False, None).
 * 7. Truncar la respuesta si se agotan los tokens de salida (falta cerrar ] o }).
 */

/** Limpia comentarios de linea y de bloque fuera de cadenas de texto. */
function stripComments(jsonStr: string): string {
  let insideString = false;
  let stringChar = '';
  let isEscaped = false;
  let result = '';

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];
    const nextChar = jsonStr[i + 1];

    if (insideString) {
      result += char;
      if (isEscaped) {
        isEscaped = false;
      } else if (char === '\\') {
        isEscaped = true;
      } else if (char === stringChar) {
        insideString = false;
      }
      continue;
    }

    // Inicio de string
    if (char === '"' || char === "'") {
      insideString = true;
      stringChar = char;
      result += char;
      continue;
    }

    // Comentario de linea //
    if (char === '/' && nextChar === '/') {
      // Saltar hasta el fin de linea
      while (i < jsonStr.length && jsonStr[i] !== '\n') {
        i++;
      }
      result += '\n';
      continue;
    }

    // Comentario de bloque /* ... */
    if (char === '/' && nextChar === '*') {
      i += 2;
      while (i < jsonStr.length - 1 && !(jsonStr[i] === '*' && jsonStr[i + 1] === '/')) {
        i++;
      }
      i++; // saltar '/'
      continue;
    }

    result += char;
  }

  return result;
}

/** Corrige comas finales, literales Python y problemas comunes de sintaxis JSON. */
function repairSyntax(text: string): string {
  let s = text;

  // 1. Eliminar comentarios
  s = stripComments(s);

  // 2. Normalizar literales Python
  s = s
    .replace(/:\s*True\b/gu, ': true')
    .replace(/:\s*False\b/gu, ': false')
    .replace(/:\s*None\b/gu, ': null');

  // 3. Eliminar trailing commas antes de } o ]
  s = s.replace(/,\s*([}\]])/gu, '$1');

  // 4. Claves sin comillas: { name: "User" } -> { "name": "User" }
  s = s.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/gu, '$1"$2":');

  // 5. Trailing commas de nuevo por si se generaron
  s = s.replace(/,\s*([}\]])/gu, '$1');

  return s;
}

/** Balancea y cierra comillas, corchetes y llaves faltantes en JSONs truncados. */
function balanceAndCloseJson(text: string): string {
  let s = text.trim();

  // Si hay una comilla sin cerrar al final
  const quoteMatches = s.match(/"/gu);
  if (quoteMatches && quoteMatches.length % 2 !== 0) {
    s += '"';
  }

  // Eliminar comas huérfanas al final
  s = s.replace(/,\s*$/u, '');

  // Contar llaves y corchetes abiertos vs cerrados
  let openBrackets = 0;
  let openBraces = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (c === '\\') {
        escaped = true;
      } else if (c === '"') {
        inString = false;
      }
      continue;
    }

    if (c === '"') {
      inString = true;
    } else if (c === '[') {
      openBrackets++;
    } else if (c === ']') {
      if (openBrackets > 0) openBrackets--;
    } else if (c === '{') {
      openBraces++;
    } else if (c === '}') {
      if (openBraces > 0) openBraces--;
    }
  }

  // Cerrar corchetes y llaves pendientes
  while (openBrackets > 0) {
    s += ']';
    openBrackets--;
  }
  while (openBraces > 0) {
    s += '}';
    openBraces--;
  }

  return s;
}

/**
 * Extrae y repara un objeto JSON válido a partir de cualquier respuesta de LLM.
 * Devuelve la cadena JSON parseable o null si no contiene estructura reconocible.
 */
export function extractJsonObject(rawText: string): string | null {
  if (!rawText || typeof rawText !== 'string') {
    return null;
  }

  // 1. Eliminar deliberaciones de modelos de razonamiento (<think>, <thought>, <reasoning>)
  let clean = rawText
    .replace(/<think>[\s\S]*?<\/think>/giu, '')
    .replace(/<thought>[\s\S]*?<\/thought>/giu, '')
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/giu, '')
    .trim();

  // 2. Extraer de vallas de código markdown si existen
  const codeBlockMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/iu);
  if (codeBlockMatch && codeBlockMatch[1]) {
    clean = codeBlockMatch[1].trim();
  }

  // 3. Localizar primer '{'
  const start = clean.indexOf('{');
  if (start === -1) {
    // Probar si el modelo devolvió un array directo: [ { "type": "add_class" }, ... ]
    const arrayStart = clean.indexOf('[');
    if (arrayStart !== -1) {
      const arrayEnd = clean.lastIndexOf(']');
      const rawArray =
        arrayEnd !== -1 && arrayEnd > arrayStart
          ? clean.slice(arrayStart, arrayEnd + 1)
          : balanceAndCloseJson(clean.slice(arrayStart));
      try {
        const repaired = repairSyntax(rawArray);
        JSON.parse(repaired);
        return `{"explanation":"Diagrama extraído automáticamente","operations":${repaired}}`;
      } catch {
        // continuar
      }
    }
    return null;
  }

  const end = clean.lastIndexOf('}');
  let candidate: string;

  if (end === -1 || end < start) {
    // JSON truncado sin llave de cierre
    candidate = clean.slice(start);
  } else {
    candidate = clean.slice(start, end + 1);
  }

  // 4. Intentar parseo directo
  try {
    JSON.parse(candidate);
    return candidate;
  } catch {
    // Requiere limpieza y reparación
  }

  // 5. Aplicar reparación de sintaxis
  let repaired = repairSyntax(candidate);
  try {
    JSON.parse(repaired);
    return repaired;
  } catch {
    // Continuar con balanceo
  }

  // 6. Balancear llaves/corchetes si fue truncado
  repaired = balanceAndCloseJson(repaired);
  try {
    JSON.parse(repaired);
    return repaired;
  } catch {
    return null;
  }
}
