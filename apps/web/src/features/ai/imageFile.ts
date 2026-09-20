/** Tipos de imagen que aceptan los proveedores multimodales. */
export const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp';

/** Tamanno maximo de la foto de un diagrama. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export type ImageReadResult =
  { ok: true; imageBase64: string; mimeType: string } | { ok: false; error: string };

/** Quita el prefijo `data:` que anade FileReader: la API espera base64 puro. */
export function stripDataUrlPrefix(dataUrl: string): string {
  const separator = dataUrl.indexOf(',');
  return separator === -1 ? dataUrl : dataUrl.slice(separator + 1);
}

/** Lee la foto de un diagrama y la deja lista para `POST /api/ai/image`. */
export async function readImageAsBase64(file: File): Promise<ImageReadResult> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, error: 'Formato no admitido: usa PNG, JPEG o WebP' };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: 'La imagen supera los 5 MB admitidos' };
  }

  try {
    const dataUrl = await readAsDataUrl(file);
    return { ok: true, imageBase64: stripDataUrlPrefix(dataUrl), mimeType: file.type };
  } catch {
    return { ok: false, error: 'No se pudo leer la imagen seleccionada' };
  }
}

/** Lectura con `FileReader`, que es lo que soportan todos los navegadores. */
function readAsDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el fichero'));
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.readAsDataURL(file);
  });
}
