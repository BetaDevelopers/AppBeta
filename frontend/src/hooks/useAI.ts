import { useState } from 'react';

export const useAI = () => {
    const [loading, setLoading] = useState(false);

    const generateSummary = async (text: string) => {
        setLoading(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 2500));
            return `### 📊 Resumen Inteligente del Apunte\n\nEste documento analiza los conceptos clave relacionados con **${text.split(' ').slice(0, 3).join(' ')}**. \n\n**Puntos clave:**\n1. Resumen estructural de la sesión.\n2. Fórmulas y derivaciones detectadas.\n3. Conexiones con temas anteriores de la asignatura.\n\n*IA de Beta optimizada para estudiantes.*`;
        } catch (error) {
            console.error('AI Error:', error);
            return "Lo siento, hubo un error procesando tu apunte con la IA.";
        } finally {
            setLoading(false);
        }
    };

    const createFormFromNotes = async (text: string) => {
        setLoading(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1800));
            return [
                "Repasar los axiomas principales",
                "Resolver los problemas de la página 42",
                "Preparar esquema para el examen parcial"
            ];
        } finally {
            setLoading(false);
        }
    };

    return { generateSummary, createFormFromNotes, loading };
};
