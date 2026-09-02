/**
 * Aisla el objeto JSON de una respuesta de modelo local. Los modelos pequenos
 * suelen envolverlo en vallas de codigo, anteponer una frase de cortesia o, si
 * son de razonamiento, un bloque <think> con su deliberacion.
 */
export function extractJsonObject(rawText: string): string | null {
  const withoutThinking = rawText.replace(/<think>[\s\S]*?<\/think>/giu, '');
  const withoutFences = withoutThinking
    .replace(/```(?:json)?/giu, '')
    .replace(/```/gu, '')
    .trim();

  const start = withoutFences.indexOf('{');
  const end = withoutFences.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    return null;
  }

  return withoutFences.slice(start, end + 1);
}
