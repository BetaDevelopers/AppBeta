import { create } from 'zustand';

export type ToolName =
    | 'mathOCR'
    | 'mathOCRImage'
    | 'mathEditor'
    | 'tableToChart'
    | 'chartToTable'
    | 'geometry'
    | 'diagram'
    | 'calibrate'
    | 'smartCamera'
    | 'fileUpload';

interface MathToolsState {
    activeTool: ToolName | null;
    pendingResult: string | null;
    editor: any | null;
    openTool: (tool: ToolName) => void;
    closeTool: () => void;
    setPendingResult: (r: string | null) => void;
    setEditor: (e: any | null) => void;
}

export const useMathToolsStore = create<MathToolsState>((set) => ({
    activeTool: null,
    pendingResult: null,
    editor: null,
    openTool: (tool) => set({ activeTool: tool, pendingResult: null }),
    closeTool: () => set({ activeTool: null, pendingResult: null }),
    setPendingResult: (pendingResult) => set({ pendingResult }),
    setEditor: (editor) => set({ editor }),
}));
