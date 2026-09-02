import { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Mic, Send, Square } from 'lucide-react';
import { toast } from 'sonner';
import type { Result, UMLModel, UmlError, UmlOperationInput } from '@uml-forge/uml-core';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AiSuggestionReview } from './AiSuggestionReview';
import {
  applyAiOperations,
  fetchAiStatus,
  generateFromImage,
  generateFromPrompt,
  type AiStatus,
  type AiSuggestion,
} from './aiClient';
import { IMAGE_ACCEPT, readImageAsBase64 } from './imageFile';
import { useSpeechRecognition } from './useSpeechRecognition';

interface AiAssistantPanelProps {
  model: UMLModel | null;
  applyOperation: (op: UmlOperationInput) => Result<UMLModel, UmlError>;
}

/**
 * Asistente de modelado: dicta una instruccion, escribela o sube la foto de un
 * diagrama en papel. La IA responde con operaciones que solo se aplican tras
 * confirmarlas, siempre por `applyOperation` (ADR 0027).
 */
export function AiAssistantPanel({ model, applyOperation }: AiAssistantPanelProps) {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isWorking, setIsWorking] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [suggestion, setSuggestion] = useState<AiSuggestion | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelRef = useRef(model);

  useEffect(() => {
    modelRef.current = model;
  }, [model]);

  useEffect(() => {
    void fetchAiStatus().then(setStatus);
  }, []);

  const runPrompt = useCallback(async (text: string) => {
    const instruction = text.trim();
    if (instruction.length === 0) {
      toast.error('Escribe o dicta una instruccion');
      return;
    }

    setIsWorking(true);
    const result = await generateFromPrompt(instruction, modelRef.current ?? undefined);
    setIsWorking(false);

    if (result.ok) {
      setSuggestion(result.suggestion);
    } else {
      toast.error(`La IA no respondio: ${result.error}`);
    }
  }, []);

  const speech = useSpeechRecognition({
    onResult: (transcript) => {
      setPrompt(transcript);
      void runPrompt(transcript);
    },
  });

  const handleImageSelected = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) {
        return;
      }

      const image = await readImageAsBase64(file);
      if (!image.ok) {
        toast.error(image.error);
        return;
      }

      setIsWorking(true);
      const result = await generateFromImage(
        image.imageBase64,
        image.mimeType,
        prompt.trim() || undefined,
        modelRef.current ?? undefined,
      );
      setIsWorking(false);

      if (result.ok) {
        setSuggestion(result.suggestion);
      } else {
        toast.error(`No se pudo leer el diagrama: ${result.error}`);
      }
    },
    [prompt],
  );

  const handleApply = useCallback(() => {
    if (!suggestion) {
      return;
    }
    setIsApplying(true);
    const report = applyAiOperations(suggestion.operations, applyOperation);
    setIsApplying(false);
    setSuggestion(null);
    setPrompt('');

    if (report.failed === 0) {
      toast.success(`${report.applied} operaciones aplicadas al modelo`);
      return;
    }
    toast.warning(
      `${report.applied} aplicadas, ${report.failed} descartadas. ${report.firstError ?? ''}`,
    );
  }, [suggestion, applyOperation]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span
          className={`h-2 w-2 rounded-full ${status?.available ? 'bg-emerald-500' : 'bg-amber-500'}`}
          aria-hidden="true"
        />
        {status
          ? `${status.provider} · ${status.model}${status.available ? '' : ' (no disponible)'}`
          : 'Consultando el proveedor de IA...'}
      </div>

      <Textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        placeholder="Una veterinaria tiene mascotas, duenos y consultas; cada dueno puede tener varias mascotas"
        rows={4}
        disabled={isWorking}
        aria-label="Instruccion para la IA"
      />

      {speech.isListening && (
        <p className="text-[11px] italic text-primary">Escuchando... {speech.interimTranscript}</p>
      )}
      {speech.error && <p className="text-[11px] text-destructive">{speech.error}</p>}

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={speech.isListening ? 'destructive' : 'outline'}
          className="gap-1.5"
          disabled={!speech.isSupported || isWorking}
          title={
            speech.isSupported
              ? 'Dictar la instruccion'
              : 'Este navegador no reconoce voz: escribe la instruccion'
          }
          onClick={() => (speech.isListening ? speech.stop() : speech.start())}
        >
          {speech.isListening ? (
            <Square className="h-3.5 w-3.5" />
          ) : (
            <Mic className="h-3.5 w-3.5" />
          )}
          {speech.isListening ? 'Parar' : 'Dictar'}
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={isWorking}
          onClick={() => fileInputRef.current?.click()}
          title="Subir la foto de un diagrama"
        >
          <ImagePlus className="h-3.5 w-3.5" />
          Imagen
        </Button>

        <Button
          type="button"
          size="sm"
          className="ml-auto gap-1.5"
          disabled={isWorking}
          onClick={() => void runPrompt(prompt)}
        >
          {isWorking ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          {isWorking ? 'Pensando...' : 'Generar'}
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="hidden"
        aria-label="Foto del diagrama"
        onChange={(event) => void handleImageSelected(event)}
      />

      {suggestion && (
        <AiSuggestionReview
          suggestion={suggestion}
          isApplying={isApplying}
          onApply={handleApply}
          onDiscard={() => setSuggestion(null)}
        />
      )}
    </div>
  );
}
