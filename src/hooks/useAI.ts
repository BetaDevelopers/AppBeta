import { useState } from 'react';

export const useAI = () => {
    const [loading, setLoading] = useState(false);

    const generateSummary = async (text: string) => {
        setLoading(true);
        try {
            // Placeholder for actual API call to GPT-4 / Claude
            console.log("Generating summary for:", text.substring(0, 50) + "...");
            await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate latency
            return `[Resumen Automático]: Este documento trata sobre ${text.split(' ').slice(0, 5).join(' ')}...`;
        } catch (error) {
            console.error('AI Error:', error);
            return null;
        } finally {
            setLoading(false);
        }
    };

    const createFormFromNotes = async (text: string) => {
        setLoading(true);
        try {
            // Placeholder for checklist generation
            await new Promise(resolve => setTimeout(resolve, 1500));
            return ["Tarea 1", "Tarea 2", "Tarea 3"];
        } finally {
            setLoading(false);
        }
    };

    return { generateSummary, createFormFromNotes, loading };
};
