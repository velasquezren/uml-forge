import { UnprocessableEntityException } from '@nestjs/common';

/** Tamanno maximo de un adjunto ya decodificado. */
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

/** Duracion maxima de una nota de voz. */
export const MAX_AUDIO_MS = 5 * 60 * 1000;

/**
 * Formatos que la PWA puede producir y que Gemini entiende: imagenes de fotos y
 * capturas, y el audio que graban los navegadores (WebM/Opus en Chrome y
 * Firefox, MP4/AAC en Safari) o los ficheros habituales.
 */
const ALLOWED: Record<'image' | 'audio', readonly string[]> = {
  image: ['image/png', 'image/jpeg', 'image/webp'],
  audio: [
    'audio/webm',
    'audio/ogg',
    'audio/mp4',
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/x-wav',
    'audio/aac',
    'audio/flac',
    'audio/x-m4a',
  ],
};

/** Adjunto recibido y comprobado, listo para guardar. */
export interface ValidatedAttachment {
  readonly kind: 'image' | 'audio';
  readonly mimeType: string;
  readonly data: Buffer;
  readonly durationMs: number | null;
}

/**
 * Comprueba tipo, formato y tamanno de un adjunto. El tipo MIME se normaliza sin
 * parametros (`audio/webm;codecs=opus` pasa a `audio/webm`), que es la forma
 * que acepta Gemini.
 */
export function validateAttachment(input: {
  kind: 'image' | 'audio';
  mimeType: string;
  dataBase64: string;
  durationMs?: number;
}): ValidatedAttachment {
  const mimeType = input.mimeType.split(';')[0]?.trim().toLowerCase() ?? '';
  if (!ALLOWED[input.kind].includes(mimeType)) {
    throw new UnprocessableEntityException(
      input.kind === 'image'
        ? 'Formato de imagen no admitido: usa PNG, JPEG o WebP'
        : `Formato de audio no admitido (${mimeType || 'desconocido'})`,
    );
  }

  const data = Buffer.from(input.dataBase64, 'base64');
  if (data.length === 0) {
    throw new UnprocessableEntityException('El adjunto esta vacio');
  }
  if (data.length > MAX_ATTACHMENT_BYTES) {
    throw new UnprocessableEntityException('El adjunto supera los 5 MB admitidos');
  }

  const durationMs =
    input.kind === 'audio' && input.durationMs !== undefined ? Math.round(input.durationMs) : null;
  if (durationMs !== null && durationMs > MAX_AUDIO_MS) {
    throw new UnprocessableEntityException('La nota de voz supera los 5 minutos');
  }

  return { kind: input.kind, mimeType, data, durationMs };
}
