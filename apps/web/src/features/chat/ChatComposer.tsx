import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { Loader2, Mic, Paperclip, Send, Sparkles, Square, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatDuration, prepareAudio, prepareImage } from './attachmentFiles';
import type { OutgoingAttachment } from './chatTypes';
import { VoiceNotePlayer } from './VoiceNotePlayer';
import { useVoiceRecorder } from './useVoiceRecorder';

const ACCEPT = 'image/png,image/jpeg,image/webp,audio/*';

interface ChatComposerProps {
  onSend: (content: string, askAi: boolean, attachment?: OutgoingAttachment) => Promise<void>;
  disabled?: boolean;
  /** La IA acaba de hacer una pregunta a esta persona: su respuesta le llegara. */
  aiAwaitsReply?: boolean;
}

/**
 * Caja de escritura del chat (ADR 0044): texto, imagenes (boton o Ctrl+V),
 * notas de voz grabadas en el navegador o ficheros de audio. Enter envia,
 * Mayusculas+Enter salta de linea, y Enter mientras se compone un acento no
 * envia el mensaje a medias.
 */
export function ChatComposer({ onSend, disabled, aiAwaitsReply }: ChatComposerProps) {
  const [draft, setDraft] = useState('');
  const [askAi, setAskAi] = useState(false);
  const [attachment, setAttachment] = useState<OutgoingAttachment | null>(null);
  const [sending, setSending] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);

  const recorder = useVoiceRecorder((recording) => {
    void prepareAudio(recording.blob, recording.durationMs).then((result) => {
      if (result.ok) setAttachment(result.attachment);
      else toast.error(result.error);
    });
  });

  useEffect(() => {
    textarea.current?.focus();
  }, []);

  useEffect(() => {
    if (recorder.error) toast.error(recorder.error);
  }, [recorder.error]);

  const attachFile = async (file: File) => {
    const result = file.type.startsWith('audio/')
      ? await prepareAudio(file)
      : await prepareImage(file);
    if (result.ok) setAttachment(result.attachment);
    else toast.error(result.error);
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const image = [...event.clipboardData.files].find((file) => file.type.startsWith('image/'));
    if (image) {
      event.preventDefault();
      void attachFile(image);
    }
  };

  const send = async () => {
    const content = draft.trim();
    if ((content === '' && attachment === null) || sending) return;
    setSending(true);
    try {
      await onSend(content, askAi, attachment ?? undefined);
      // "Preguntar a la IA" se queda activado: se esta conversando con ella.
      setDraft('');
      setAttachment(null);
      textarea.current?.focus();
    } catch {
      // El panel ya avisa del error; se conserva lo escrito para reintentar.
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send();
    }
  };

  return (
    <div className="space-y-2">
      {attachment && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-2">
          {attachment.kind === 'image' ? (
            <img src={attachment.previewUrl} alt="Imagen a enviar" className="h-14 rounded" />
          ) : (
            <VoiceNotePlayer
              src={attachment.previewUrl}
              durationMs={attachment.durationMs ?? null}
            />
          )}
          <span className="flex-1 text-[11px] text-muted-foreground">
            {attachment.kind === 'image' ? 'Imagen lista para enviar' : 'Nota de voz lista'}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setAttachment(null)}
            aria-label="Quitar el adjunto"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {recorder.recording ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
          <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" aria-hidden />
          <span className="flex-1">Grabando {formatDuration(recorder.elapsedMs)}</span>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={recorder.cancel}>
            Descartar
          </Button>
          <Button size="sm" className="h-7 gap-1 text-xs" onClick={recorder.stop}>
            <Square className="h-3 w-3" /> Terminar
          </Button>
        </div>
      ) : (
        <Textarea
          ref={textarea}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={
            askAi
              ? 'Pregunta o pide algo a la IA...'
              : aiAwaitsReply
                ? 'Responde a la IA: te contestara sin necesidad de @ia'
                : 'Escribe al equipo (o usa @ia)'
          }
          aria-label="Mensaje para el chat del equipo"
          className="min-h-16 resize-none text-sm"
          maxLength={4000}
          disabled={disabled}
        />
      )}

      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant={askAi ? 'default' : 'outline'}
          size="sm"
          className="h-8 gap-1.5 text-xs"
          aria-pressed={askAi}
          onClick={() => setAskAi((value) => !value)}
          title="La IA respondera a este mensaje"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Preguntar a la IA</span>
          <span className="sm:hidden">IA</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => fileInput.current?.click()}
          disabled={recorder.recording}
          aria-label="Adjuntar imagen o audio"
          title="Adjuntar imagen o audio (tambien puedes pegar una imagen)"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        {recorder.supported && !recorder.recording && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => void recorder.start()}
            aria-label="Grabar nota de voz"
            title="Grabar nota de voz"
          >
            <Mic className="h-4 w-4" />
          </Button>
        )}
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPT}
          className="hidden"
          aria-label="Fichero para adjuntar al chat"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void attachFile(file);
          }}
        />
        <Button
          size="sm"
          className="ml-auto h-8 gap-1.5 text-xs"
          disabled={sending || recorder.recording || (draft.trim() === '' && attachment === null)}
          onClick={() => void send()}
        >
          {sending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          Enviar
        </Button>
      </div>
    </div>
  );
}
