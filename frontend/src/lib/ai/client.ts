/**
 * Beta AI Client Abstraction
 */

export interface SummaryOptions {
    mode: 'brief' | 'structured' | 'flashcards';
}

export interface FormField {
    label: string;
    type: 'text' | 'checkbox' | 'date';
    value?: string;
}

export interface AIClient {
    generateSummary: (content: string, options: SummaryOptions) => Promise<string>;
    extractFormFields: (content: string) => Promise<FormField[]>;
    suggestTags: (content: string) => Promise<string[]>;
}

export const aiClient: AIClient = {
    generateSummary: async (content, options) => {
        // Placeholder for LLM integration (Claude/OpenAI)
        await new Promise(r => setTimeout(r, 1500));
        return `Esto es un resumen [${options.mode}] de tus notas sobre ${content.substring(0, 50)}...`;
    },

    extractFormFields: async (content) => {
        // Placeholder for form extraction
        await new Promise(r => setTimeout(r, 1000));
        return [
            { label: 'Título del tema', type: 'text' },
            { label: 'Completado', type: 'checkbox' },
            { label: 'Fecha de examen', type: 'date' }
        ];
    },

    suggestTags: async (content) => {
        await new Promise(r => setTimeout(r, 500));
        return ['Física', 'Relatividad', 'Estudio'];
    }
};
