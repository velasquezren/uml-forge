import { useCallback, useEffect, useRef, useState } from 'react';

/** Una nota de voz no puede durar mas que lo que admite la API. */
export const MAX_RECORDING_MS = 5 * 60 * 1000;

/** Formatos que graban los navegadores y que entiende Gemini, por preferencia. */
const CANDIDATE_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];

/** Nota de voz terminada. */
export interface Recording {
  blob: Blob;
  mimeType: string;
  durationMs: number;
}

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return CANDIDATE_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

/**
 * Graba una nota de voz con `MediaRecorder` (ADR 0044). Chrome y Firefox
 * graban WebM/Opus y Safari MP4/AAC; ambos llegan tal cual a Gemini. Se para
 * sola al llegar al limite y libera el microfono al terminar o al cancelar.
 */
export function useVoiceRecorder(onRecorded: (recording: Recording) => void) {
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const cancelledRef = useRef(false);
  const onRecordedRef = useRef(onRecorded);
  onRecordedRef.current = onRecorded;

  const supported =
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    pickMimeType() !== undefined;

  const start = useCallback(async () => {
    setError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError('No se pudo usar el microfono: revisa los permisos del navegador');
      return;
    }

    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    const startedAt = Date.now();
    cancelledRef.current = false;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      setRecording(false);
      if (cancelledRef.current || chunks.length === 0) return;
      const type = recorder.mimeType || mimeType || 'audio/webm';
      onRecordedRef.current({
        blob: new Blob(chunks, { type }),
        mimeType: type,
        durationMs: Date.now() - startedAt,
      });
    };

    recorderRef.current = recorder;
    recorder.start();
    setElapsedMs(0);
    setRecording(true);
  }, []);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    stop();
  }, [stop]);

  // Cronometro visible y parada automatica al llegar al limite.
  useEffect(() => {
    if (!recording) return;
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setElapsedMs(elapsed);
      if (elapsed >= MAX_RECORDING_MS) stop();
    }, 250);
    return () => clearInterval(timer);
  }, [recording, stop]);

  // Si se cierra el panel grabando, se descarta y se suelta el microfono.
  useEffect(() => () => cancel(), [cancel]);

  return { supported, recording, elapsedMs, error, start, stop, cancel };
}
