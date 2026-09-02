import { HTTPError } from 'ky';
import { apiClient } from '@/lib/api';
import { fileNameFromDisposition, type BackendOptions } from './backendOptions';

/** Resultado de pedir el backend generado a la API. */
export type GenerateBackendResult =
  { ok: true; fileName: string; fileCount: number } | { ok: false; error: string };

/** Tiempo maximo de espera: la generacion es sincrona pero comprime en memoria. */
const GENERATION_TIMEOUT_MS = 120000;

/** Traduce el error de la API a un mensaje presentable en la interfaz. */
async function describeError(error: unknown): Promise<string> {
  if (error instanceof HTTPError) {
    try {
      const body = await error.response.json<{ message?: string | string[] }>();
      const message = body.message;
      if (Array.isArray(message)) {
        return message.join('; ');
      }
      if (typeof message === 'string') {
        return message;
      }
    } catch {
      // Respuesta sin cuerpo JSON: se cae al mensaje generico de mas abajo.
    }
    return `La API respondio ${error.response.status}`;
  }
  return error instanceof Error ? error.message : 'Error desconocido';
}

/** Entrega el ZIP al navegador como descarga. */
function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Pide a la API el proyecto Spring Boot del modelo y lo descarga. La generacion
 * ocurre en el servidor porque alli vive el documento Yjs consolidado y el
 * generador comparte codigo con la compilacion real de Maven en CI.
 */
export async function downloadSpringBootZip(
  projectId: string,
  options: BackendOptions,
): Promise<GenerateBackendResult> {
  try {
    const response = await apiClient.post(`projects/${projectId}/codegen/springboot`, {
      json: options,
      timeout: GENERATION_TIMEOUT_MS,
    });

    const blob = await response.blob();
    const fileName = fileNameFromDisposition(
      response.headers.get('content-disposition'),
      `${options.artifactId}.zip`,
    );
    const fileCount = Number(response.headers.get('x-generated-files') ?? '0');

    triggerDownload(blob, fileName);
    return { ok: true, fileName, fileCount };
  } catch (error) {
    return { ok: false, error: await describeError(error) };
  }
}
