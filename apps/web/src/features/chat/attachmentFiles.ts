import { readImageAsBase64, stripDataUrlPrefix } from '@/features/ai/imageFile';
import type { OutgoingAttachment } from './chatTypes';

/** Mismo limite que la API para un adjunto ya decodificado. */
const MAX_AUDIO_BYTES = 5 * 1024 * 1024;

type Prepared = { ok: true; attachment: OutgoingAttachment } | { ok: false; error: string };

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el fichero'));
    reader.onload = () =>
      resolve(typeof reader.result === 'string' ? stripDataUrlPrefix(reader.result) : '');
    reader.readAsDataURL(blob);
  });
}

/**
 * Prepara una imagen para el chat. Se reduce como en el asistente (lado mayor
 * de 2000 px, JPEG): una foto de movil pasa de varios MB a unos cientos de KB.
 */
export async function prepareImage(file: File): Promise<Prepared> {
  const image = await readImageAsBase64(file);
  if (!image.ok) return image;
  return {
    ok: true,
    attachment: {
      kind: 'image',
      mimeType: image.mimeType,
      dataBase64: image.imageBase64,
      previewUrl: `data:${image.mimeType};base64,${image.imageBase64}`,
    },
  };
}

/** Prepara una nota de voz grabada o un fichero de audio. */
export async function prepareAudio(blob: Blob, durationMs?: number): Promise<Prepared> {
  if (blob.size === 0) return { ok: false, error: 'La grabacion esta vacia' };
  if (blob.size > MAX_AUDIO_BYTES) {
    return { ok: false, error: 'El audio supera los 5 MB admitidos' };
  }
  try {
    return {
      ok: true,
      attachment: {
        kind: 'audio',
        mimeType: blob.type || 'audio/webm',
        dataBase64: await blobToBase64(blob),
        ...(durationMs === undefined ? {} : { durationMs: Math.round(durationMs) }),
        previewUrl: URL.createObjectURL(blob),
      },
    };
  } catch {
    return { ok: false, error: 'No se pudo leer el audio' };
  }
}

/** Duracion legible de una nota de voz: 0:42, 3:05. */
export function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
