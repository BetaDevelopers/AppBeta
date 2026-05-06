import React from 'react';
import { 
  Pencil, 
  Eraser, 
  RotateCcw, 
  Trash2, 
  Sparkles, 
  Loader2,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

interface Props {
  active: boolean;
  thickness: number;
  onThicknessChange: (v: number) => void;
  onUndo: () => void;
  onClear: () => void;
  onEraser: () => void;
  onBeautify: () => void;
  processing: boolean;
}

const InkToolbar: React.FC<Props> = ({
  active,
  thickness,
  onThicknessChange,
  onUndo,
  onClear,
  onEraser,
  onBeautify,
  processing
}) => {
  if (!active) return null;

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 px-4 py-2 bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-fade-in-up">
      {/* Pen Tools */}
      <div className="flex items-center gap-1 pr-3 border-r border-white/10">
        <button 
          onClick={onEraser}
          className="p-2.5 rounded-full hover:bg-white/5 text-slate-400 transition-colors"
          title="Borrador (próximamente)"
        >
          <Eraser size={18} />
        </button>
        
        <div className="flex flex-col items-center gap-0.5 px-2">
          <button onClick={() => onThicknessChange(Math.min(10, thickness + 1))} className="text-slate-500 hover:text-white transition-colors">
            <ChevronUp size={14} />
          </button>
          <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[8px] font-bold">
            {thickness}
          </div>
          <button onClick={() => onThicknessChange(Math.max(1, thickness - 1))} className="text-slate-500 hover:text-white transition-colors">
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {/* History Tools */}
      <div className="flex items-center gap-1 px-2 border-r border-white/10">
        <button 
          onClick={onUndo}
          className="p-2.5 rounded-full hover:bg-white/5 text-slate-400 transition-colors"
          title="Deshacer"
        >
          <RotateCcw size={18} />
        </button>
        <button 
          onClick={onClear}
          className="p-2.5 rounded-full hover:bg-white/5 text-red-400/60 hover:text-red-400 transition-colors"
          title="Borrar todo"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* The Magic Button: BEAUTIFY */}
      <button
        onClick={onBeautify}
        disabled={processing}
        className={`flex items-center gap-2 pl-4 pr-5 py-2 rounded-full font-bold text-xs uppercase tracking-widest transition-all duration-300
          ${processing 
            ? 'bg-blue-600/50 cursor-not-allowed' 
            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-105 hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-95'
          } text-white`}
      >
        {processing ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Sparkles size={16} className="animate-pulse" />
        )}
        {processing ? 'Procesando...' : 'Beautify'}
      </button>
    </div>
  );
};

export default InkToolbar;
