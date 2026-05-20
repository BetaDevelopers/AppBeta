import { useState, useRef, useCallback } from 'react';

export type VoiceStatus = 'idle' | 'listening' | 'error';

export function useVoiceTranscription(onResult: (text: string) => void) {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const start = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMsg('Tu navegador no soporta reconocimiento de voz');
      setStatus('error');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = navigator.language || 'es-ES';

    recognition.onresult = (e: any) => {
      const transcript = Array.from(e.results)
        .map((r: any) => r[0].transcript)
        .join(' ')
        .trim();
      if (transcript) onResult(transcript + ' ');
    };

    recognition.onerror = (e: any) => {
      setErrorMsg(e.error === 'not-allowed' ? 'Permiso de micrófono denegado' : `Error: ${e.error}`);
      setStatus('error');
    };

    recognition.onend = () => setStatus('idle');

    recognitionRef.current = recognition;
    recognition.start();
    setStatus('listening');
    setErrorMsg(null);
  }, [onResult]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setStatus('idle');
  }, []);

  const toggle = useCallback(() => {
    if (status === 'listening') stop();
    else start();
  }, [status, start, stop]);

  return { status, errorMsg, toggle };
}
