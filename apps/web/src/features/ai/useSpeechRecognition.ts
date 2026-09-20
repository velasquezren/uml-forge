import { useCallback, useEffect, useRef, useState } from 'react';

/** Constructor nativo, con el prefijo que todavia usan los navegadores WebKit. */
function speechRecognitionConstructor(): typeof SpeechRecognition | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

interface UseSpeechRecognitionOptions {
  /** Idioma del dictado. Por defecto espanol. */
  lang?: string;
  /** Se invoca con el texto definitivo cuando el usuario termina de hablar. */
  onResult?: (transcript: string) => void;
}

/**
 * Dictado por voz con la Web Speech API nativa. No se carga ningun modelo en el
 * navegador (ADR 0018): si el navegador no la soporta, `isSupported` es falso y
 * la interfaz se queda con la entrada de texto.
 */
export function useSpeechRecognition({
  lang = 'es-ES',
  onResult,
}: UseSpeechRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onResultRef = useRef(onResult);

  const isSupported = speechRecognitionConstructor() !== null;

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const start = useCallback(() => {
    const Constructor = speechRecognitionConstructor();
    if (!Constructor) {
      setError('Este navegador no reconoce voz. Escribe la instruccion.');
      return;
    }

    const recognition = new Constructor();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = '';
      let interimText = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result?.[0]?.transcript ?? '';
        if (result?.isFinal) {
          finalText += text;
        } else {
          interimText += text;
        }
      }
      setInterimTranscript(interimText);
      if (finalText.trim().length > 0) {
        onResultRef.current?.(finalText.trim());
        setInterimTranscript('');
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setError(
        event.error === 'not-allowed'
          ? 'El navegador no dio permiso para usar el microfono'
          : `No se pudo escuchar: ${event.error}`,
      );
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
    };

    recognitionRef.current = recognition;
    setError(null);
    setIsListening(true);
    recognition.start();
  }, [lang]);

  // Un componente que se desmonta mientras escucha dejaria el microfono abierto.
  useEffect(() => {
    return () => recognitionRef.current?.abort();
  }, []);

  return { isSupported, isListening, interimTranscript, error, start, stop };
}
