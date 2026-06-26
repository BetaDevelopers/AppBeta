import { useRef, useState } from 'react';

export function useVoiceInput(
    onResult: (text: string, isFinal: boolean) => void,
    lang = 'auto',
) {
    const recognition = useRef<any>(null);
    const [isListening, setIsListening] = useState(false);
    const [isSupported] = useState(
        () => !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    );

    const start = () => {
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) return;

        recognition.current = new SR();
        recognition.current.continuous = true;
        recognition.current.interimResults = true;
        recognition.current.lang = lang === 'auto' ? (navigator.language || 'es-ES') : lang;

        recognition.current.onresult = (e: any) => {
            let interim = '';
            let final = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const t = e.results[i][0].transcript;
                if (e.results[i].isFinal) final += t;
                else interim += t;
            }
            if (final) onResult(final, true);
            else if (interim) onResult(interim, false);
        };

        recognition.current.onerror = () => setIsListening(false);
        recognition.current.onend   = () => setIsListening(false);
        recognition.current.start();
        setIsListening(true);
    };

    const stop = () => {
        recognition.current?.stop();
        setIsListening(false);
    };

    const toggle = () => (isListening ? stop() : start());

    return { isListening, isSupported, start, stop, toggle };
}
