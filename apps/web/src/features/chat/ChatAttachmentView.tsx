import { useEffect, useState } from 'react';
import { ImageOff, Loader2 } from 'lucide-react';
import { attachmentUrl } from './chatClient';
import type { ChatAttachment } from './chatTypes';
import { VoiceNotePlayer } from './VoiceNotePlayer';

/** Descarga el adjunto con autenticacion y devuelve su URL local. */
function useAttachmentUrl(projectId: string, attachmentId: string) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    attachmentUrl(projectId, attachmentId)
      .then((value) => alive && setUrl(value))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [projectId, attachmentId]);
  return { url, failed };
}

interface ChatAttachmentViewProps {
  projectId: string;
  attachment: ChatAttachment;
  transcript: string | null;
}

/** Imagen ampliable o nota de voz con su transcripcion, dentro de un mensaje. */
export function ChatAttachmentView({ projectId, attachment, transcript }: ChatAttachmentViewProps) {
  const { url, failed } = useAttachmentUrl(projectId, attachment.id);

  if (failed) {
    return (
      <p className="flex items-center gap-1 text-xs opacity-80">
        <ImageOff className="h-3.5 w-3.5" /> No se pudo cargar el adjunto
      </p>
    );
  }
  if (url === null) {
    return <Loader2 className="h-4 w-4 animate-spin opacity-70" aria-label="Cargando adjunto" />;
  }

  if (attachment.kind === 'IMAGE') {
    return (
      <a href={url} target="_blank" rel="noreferrer" title="Abrir la imagen a tamanno completo">
        <img
          src={url}
          alt="Imagen adjunta"
          className="max-h-60 w-auto max-w-full rounded-md border border-border/50 bg-background object-contain"
        />
      </a>
    );
  }

  return (
    <div className="space-y-1">
      <VoiceNotePlayer src={url} durationMs={attachment.durationMs} />
      <p className="text-xs italic opacity-80">
        {transcript === null
          ? 'Transcribiendo la nota de voz...'
          : transcript === ''
            ? 'Transcripcion no disponible'
            : `"${transcript}"`}
      </p>
    </div>
  );
}
