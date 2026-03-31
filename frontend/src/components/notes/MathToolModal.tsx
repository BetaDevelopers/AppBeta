import React, { useEffect } from 'react';

interface MathToolModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    canInsert?: boolean;
    onInsert?: () => void;
    insertLabel?: string;
}

export default function MathToolModal({
    isOpen,
    onClose,
    title,
    children,
    canInsert = false,
    onInsert,
    insertLabel = 'Inserir a la nota',
}: MathToolModalProps) {
    // Tanca amb Escape
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    // Bloqueja scroll del body mentre el modal és obert
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[400] flex items-center justify-center p-4"
            style={{ touchAction: 'none' }}
        >
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/75 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Panel */}
            <div
                className="relative z-10 w-full max-w-4xl max-h-[85vh] flex flex-col
                           bg-[#0d1117] border border-white/10 rounded-3xl shadow-2xl
                           overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-shrink-0">
                    <span className="text-sm font-black uppercase tracking-widest text-slate-300">
                        {title}
                    </span>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/10 transition-all"
                        aria-label="Tancar"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body — scrollable */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                    {children}
                </div>

                {/* Footer — botó inserir */}
                {onInsert && (
                    <div className="px-6 py-4 border-t border-white/5 flex-shrink-0 flex justify-end">
                        <button
                            onClick={onInsert}
                            disabled={!canInsert}
                            className="flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest
                                       bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/20
                                       transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                            </svg>
                            {insertLabel}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
