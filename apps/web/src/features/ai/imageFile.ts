/** Tipos de imagen que aceptan los proveedores multimodales. */
export const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp';

/** Tamanno maximo del fichero elegido: una foto de movil puede pasar de 10 MB. */
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

/**
 * Lado mayor tras reducir la foto. Basta para leer el texto de un diagrama y
 * deja la imagen muy por debajo del limite de 12 MB de la API (ADR 0036).
 */
const MAX_SIDE = 2000;

/** Base64 maximo que se envia; por encima la API responderia 413. */
const MAX_BASE64_LENGTH = 11 * 1024 * 1024;

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
    return { ok: false, error: 'La imagen supera los 20 MB admitidos' };
  }

  try {
    const shrunk = await shrinkImage(file);
    const source = shrunk ?? file;
    const imageBase64 = stripDataUrlPrefix(await readAsDataUrl(source));
    if (imageBase64.length > MAX_BASE64_LENGTH) {
      return {
        ok: false,
        error: 'La imagen es demasiado grande: recortala o reduce su resolucion',
      };
    }
    return { ok: true, imageBase64, mimeType: source.type || file.type };
  } catch {
    return { ok: false, error: 'No se pudo leer la imagen seleccionada' };
  }
}

/**
 * Reduce la foto a `MAX_SIDE` pixeles de lado mayor y la recomprime en JPEG,
 * sobre fondo blanco para que un PNG transparente no quede negro. Devuelve null
 * si el navegador no puede hacerlo (o no merece la pena): entonces se envia el
 * fichero original.
 */
async function shrinkImage(file: File): Promise<Blob | null> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') {
    return null;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  // Una imagen pequenna y ligera ya esta bien como viene.
  if (scale === 1 && file.size < 1024 * 1024) {
    bitmap.close();
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (context === null) {
    bitmap.close();
    return null;
  }
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.88);
  });
  return blob !== null && blob.size < file.size ? blob : null;
}

/** Lectura con `FileReader`, que es lo que soportan todos los navegadores. */
function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el fichero'));
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.readAsDataURL(file);
  });
}
