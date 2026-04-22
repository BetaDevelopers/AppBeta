import React, { useState, useRef, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useSubjectsStore } from '../../store/subjectsStore';

interface SubjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    subject?: { id: number; name: string; color: string; icon?: string | null };
}

const COLORS = [
    '#048A81', '#3B82F6', '#10B981', '#F59E0B',
    '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4',
    '#84CC16', '#F97316', '#6366F1', '#14B8A6',
];

const EMOJIS = [
    '📝', '📐', '🌿', '⚡', '📚', '🔬',
    '🎨', '💻', '🏛️', '🎵', '🌍', '💡',
    '🧮', '⚗️', '📊',
];

export const SubjectModal: React.FC<SubjectModalProps> = ({ isOpen, onClose, subject }) => {
    const [name, setName] = useState('');
    const [color, setColor] = useState(COLORS[0]);
    const [icon, setIcon] = useState<string | null>(null);
    const [nameError, setNameError] = useState('');
    const [saving, setSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const { createSubject, updateSubject, deleteSubject } = useSubjectsStore();

    useEffect(() => {
        if (isOpen) {
            setName(subject?.name ?? '');
            setColor(subject?.color ?? COLORS[0]);
            setIcon(subject?.icon ?? null);
            setNameError('');
            setSaving(false);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen, subject]);

    const validate = () => {
        const trimmed = name.trim();
        if (!trimmed) { setNameError('El nombre es obligatorio'); return false; }
        if (trimmed.length < 2) { setNameError('Mínimo 2 caracteres'); return false; }
        setNameError('');
        return true;
    };

    const handleSave = async () => {
        if (!validate() || saving) return;
        setSaving(true);
        try {
            if (subject) {
                await updateSubject(subject.id, name.trim(), color, icon);
            } else {
                await createSubject(name.trim(), color, icon);
                setName('');
                setColor(COLORS[0]);
                setIcon(null);
            }
            onClose();
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!subject) return;
        const confirmed = window.confirm(
            `¿Eliminar "${subject.name}"? Las notas quedarán sin asignatura.`
        );
        if (!confirmed) return;
        await deleteSubject(subject.id);
        onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={subject ? 'Editar asignatura' : 'Nueva asignatura'}
        >
            <div className="flex flex-col gap-8 p-2">

                {/* Name input — standard <input> to prevent mobile keyboard autocomplete bug */}
                <div className="flex flex-col gap-2 w-full">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 font-display">
                        Nombre
                    </label>
                    <div className="relative group">
                        <input
                            ref={inputRef}
                            type="text"
                            value={name}
                            onChange={(e) => { setName(e.target.value); if (nameError) setNameError(''); }}
                            onKeyDown={handleKeyDown}
                            placeholder="Ej: Matemáticas"
                            autoComplete="new-password"
                            autoCorrect="off"
                            autoCapitalize="none"
                            spellCheck={false}
                            data-form-type="other"
                            data-lpignore="true"
                            className="w-full py-4 px-6 bg-[#030712] border border-white/5 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all duration-300 placeholder:text-slate-700 text-slate-200 shadow-inner group-hover:border-white/10"
                        />
                        <div className="absolute inset-0 rounded-2xl bg-blue-500/0 group-hover:bg-blue-500/[0.02] pointer-events-none transition-colors duration-500" />
                    </div>
                    {nameError && (
                        <span className="text-[10px] font-bold text-red-500/80 uppercase tracking-tighter ml-3">
                            {nameError}
                        </span>
                    )}
                </div>

                {/* Color palette */}
                <div className="flex flex-col gap-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 font-display">
                        Color
                    </label>
                    <div className="grid grid-cols-6 gap-3">
                        {COLORS.map((c) => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => setColor(c)}
                                className={`relative w-full aspect-square rounded-xl transition-all duration-300 flex items-center justify-center
                                    ${color === c ? 'ring-2 ring-offset-2 ring-offset-[#030712] scale-110' : 'hover:scale-105 opacity-70 hover:opacity-100'}`}
                                style={{
                                    backgroundColor: c,
                                    minHeight: '40px',
                                    '--tw-ring-color': c,
                                } as React.CSSProperties}
                                aria-label={c}
                            >
                                {color === c && (
                                    <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_6px_white]" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Emoji grid */}
                <div className="flex flex-col gap-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 font-display">
                        Icono <span className="normal-case font-normal text-slate-600">(opcional)</span>
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                        {/* "none" option */}
                        <button
                            type="button"
                            onClick={() => setIcon(null)}
                            className={`h-11 rounded-xl text-xs font-medium transition-all duration-200 border
                                ${icon === null
                                    ? 'bg-[#21262D] border-blue-500/40 text-slate-300'
                                    : 'bg-transparent border-white/5 text-slate-600 hover:border-white/15 hover:text-slate-400'
                                }`}
                        >
                            —
                        </button>
                        {EMOJIS.map((e) => (
                            <button
                                key={e}
                                type="button"
                                onClick={() => setIcon(icon === e ? null : e)}
                                className={`h-11 rounded-xl text-lg transition-all duration-200 border
                                    ${icon === e
                                        ? 'bg-[#21262D] border-blue-500/40 scale-110'
                                        : 'bg-transparent border-white/5 hover:bg-[#21262D]/50 hover:border-white/10 hover:scale-105'
                                    }`}
                                style={{ minHeight: '44px' }}
                                aria-label={e}
                            >
                                {e}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 pt-2">
                    {subject && (
                        <Button
                            variant="secondary"
                            className="flex-1 rounded-2xl py-6 border-red-500/20 hover:bg-red-500/10 hover:text-red-400 transition-all"
                            onClick={handleDelete}
                        >
                            Eliminar
                        </Button>
                    )}
                    <Button variant="secondary" className="flex-1 rounded-2xl py-6" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        className="flex-1 rounded-2xl py-6"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? '...' : subject ? 'Guardar cambios' : 'Crear'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
