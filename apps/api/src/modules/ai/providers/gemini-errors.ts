import { ApiError } from '@google/genai';

/** Modelo saturado, sin cuota o retirado: otro modelo de Gemini si puede responder. */
export function isModelCapacityError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 404 || error.status === 429 || error.status >= 500)
  );
}

/**
 * Fallo de red antes de recibir respuesta ("fetch failed", conexion cortada o
 * DNS). El SDK solo reintenta respuestas HTTP; esto hay que reintentarlo aparte.
 */
export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error) || error instanceof ApiError) return false;
  const cause: unknown = error.cause;
  const code =
    typeof cause === 'object' && cause !== null && 'code' in cause ? String(cause.code) : '';
  return (
    /fetch failed|socket hang up|network/iu.test(error.message) ||
    /^(ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|UND_ERR_)/u.test(code)
  );
}

/** Traduce los errores de la API a un mensaje que la persona pueda resolver. */
export function describeGeminiError(error: unknown, model: string): string {
  if (error instanceof ApiError) {
    const detail = error.message.toLowerCase();
    if (error.status === 400 && detail.includes('api key')) {
      return 'La clave GEMINI_API_KEY no es valida. Revisala en Google AI Studio.';
    }
    if (error.status === 401 || error.status === 403) {
      return detail.includes('aiplatform')
        ? 'La cuenta de servicio no tiene permiso para Vertex AI (rol roles/aiplatform.user).'
        : 'La clave GEMINI_API_KEY no tiene permiso para usar la Gemini API.';
    }
    if (error.status === 404) {
      return `El modelo "${model}" no existe o no esta disponible. Revisa GEMINI_MODEL.`;
    }
    if (error.status === 429) {
      return 'Se agoto la cuota de Gemini. Espera un momento o revisa el plan de la clave.';
    }
    if (error.status >= 500) {
      return 'Gemini no esta disponible en este momento. Intentalo de nuevo en unos segundos.';
    }
    return `Gemini rechazo la solicitud (${error.status}): ${error.message}`;
  }
  if (isNetworkError(error)) {
    return 'No se pudo conectar con Gemini (fallo de red). Vuelve a preguntar en unos segundos.';
  }
  if (error instanceof Error && /timeout|aborted/iu.test(error.message)) {
    return 'Gemini tardo demasiado en responder. Prueba con una instruccion mas concreta.';
  }
  return error instanceof Error ? error.message : String(error);
}
