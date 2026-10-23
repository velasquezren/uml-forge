import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { Pause, Play } from 'lucide-react';
import { formatDuration } from './attachmentFiles';

interface VoiceNotePlayerProps {
  src: string;
  /** Duracion conocida al grabar: el WebM de MediaRecorder no la lleva en la cabecera. */
  durationMs: number | null;
}

/**
 * Reproductor de notas de voz (ADR 0044). Los controles nativos no dibujan la
 * barra de progreso de una grabacion WebM de `MediaRecorder`, porque no saben
 * cuanto dura; este usa la duracion guardada al grabar y se ve igual en todos
 * los navegadores y en cualquier burbuja.
 */
export function VoiceNotePlayer({ src, durationMs }: VoiceNotePlayerProps) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [mediaMs, setMediaMs] = useState<number | null>(null);
  const totalMs = mediaMs ?? durationMs ?? 0;

  useEffect(() => {
    const element = audio.current;
    if (!element) return;
    const onTime = () => setCurrentMs(element.currentTime * 1000);
    const onMeta = () => {
      if (Number.isFinite(element.duration)) setMediaMs(element.duration * 1000);
    };
    const onEnd = () => {
      setPlaying(false);
      setCurrentMs(0);
    };
    element.addEventListener('timeupdate', onTime);
    element.addEventListener('loadedmetadata', onMeta);
    element.addEventListener('durationchange', onMeta);
    element.addEventListener('ended', onEnd);
    return () => {
      element.removeEventListener('timeupdate', onTime);
      element.removeEventListener('loadedmetadata', onMeta);
      element.removeEventListener('durationchange', onMeta);
      element.removeEventListener('ended', onEnd);
    };
  }, []);

  const toggle = () => {
    const element = audio.current;
    if (!element) return;
    if (element.paused) {
      void element.play().then(() => setPlaying(true));
    } else {
      element.pause();
      setPlaying(false);
    }
  };

  const seek = (event: MouseEvent<HTMLDivElement>) => {
    const element = audio.current;
    if (!element || totalMs === 0) return;
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    element.currentTime = (ratio * totalMs) / 1000;
    setCurrentMs(ratio * totalMs);
  };

  const progress = totalMs > 0 ? Math.min(100, (currentMs / totalMs) * 100) : 0;

  return (
    <div className="flex w-64 max-w-[65vw] items-center gap-2 rounded-full bg-background px-2 py-1.5 text-foreground">
      <audio ref={audio} src={src} preload="metadata" />
      <button
        type="button"
        onClick={toggle}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
        aria-label={playing ? 'Pausar la nota de voz' : 'Reproducir la nota de voz'}
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="ml-0.5 h-3.5 w-3.5" />}
      </button>
      <div
        className="relative h-1.5 flex-1 cursor-pointer rounded-full bg-muted"
        onClick={seek}
        role="progressbar"
        aria-label="Progreso de la nota de voz"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
      </div>
      <span className="shrink-0 whitespace-nowrap text-right font-mono text-[11px] tabular-nums text-muted-foreground">
        {formatDuration(playing || currentMs > 0 ? currentMs : totalMs)}
        {totalMs > 0 && (playing || currentMs > 0) ? ` / ${formatDuration(totalMs)}` : ''}
      </span>
    </div>
  );
}
