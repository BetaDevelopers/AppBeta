import { useState } from 'react';
import { Descendant, Text } from 'slate';

export const useAIAssistant = () => {
    const [isOptimizing, setIsOptimizing] = useState(false);

    // Helper to extract plain text for AI processing
    const extractText = (nodes: Descendant[]): string => {
        return nodes.map(n => {
            if (Text.isText(n)) return n.text;
            return n.children ? extractText(n.children) : '';
        }).join('\n');
    };

    const optimizeNote = async (content: Descendant[]): Promise<Descendant[] | null> => {
        setIsOptimizing(true);

        try {
            // Simulated AI Delay
            await new Promise(resolve => setTimeout(resolve, 1500));

            const plainText = extractText(content);

            // Simulated AI Logic: Refine text, fix grammar, and add a summary block
            // In a real app, this would call OpenAI/Gemini API
            const refinedText = `[Optimizado por AI]\n${plainText}\n\n--- RESUMEN ---\nEste documento ha sido revisado para mejorar su claridad y concisión.`;

            const newContent: Descendant[] = [
                {
                    type: 'paragraph',
                    children: [{ text: refinedText }]
                } as any
            ];

            return newContent;
        } catch (err) {
            console.error('AI Optimization Error:', err);
            return null;
        } finally {
            setIsOptimizing(false);
        }
    };

    return {
        optimizeNote,
        isOptimizing
    };
};
