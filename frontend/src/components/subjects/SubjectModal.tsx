import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useSubjectsStore } from '../../store/subjectsStore';

interface SubjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    subject?: { id: number; name: string; color: string };
}

const COLORS = [
    '#048A81', '#3B82F6', '#8B5CF6', '#EC4899',
    '#F59E0B', '#10B981', '#EF4444', '#6B7280'
];

export const SubjectModal: React.FC<SubjectModalProps> = ({ isOpen, onClose, subject }) => {
    const [name, setName] = useState(subject?.name || '');
    const [color, setColor] = useState(subject?.color || COLORS[0]);
    const { createSubject, updateSubject, deleteSubject } = useSubjectsStore();
    const editorRef = React.useRef<HTMLDivElement>(null);

    // Reset state when opening/closing or when subject changes
    React.useLayoutEffect(() => {
        if (isOpen) {
            setName(subject?.name || '');
            setColor(subject?.color || COLORS[0]);
            setTimeout(() => editorRef.current?.focus(), 50);
        } else {
            setName('');
            setColor(COLORS[0]);
        }
    }, [isOpen, subject]);

    const handleSave = async () => {
        if (!name.trim()) return;

        if (subject) {
            await updateSubject(subject.id, name, color);
        } else {
            await createSubject(name, color);
        }
        onClose();
    };

    const handleDelete = async () => {
        if (!subject) return;
        if (window.confirm('¿Estás seguro de eliminar esta asignatura? Todas sus notas quedarán sin categoría.')) {
            await deleteSubject(subject.id);
            onClose();
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={subject ? 'Editar asignatura' : 'Identidad asignatura'}
        >
            <div className="flex flex-col gap-10 p-2">
                <div className="flex flex-col gap-2 w-full">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 font-display">
                        Nombre
                    </label>
                    <div className="relative group">
                        <div
                            ref={editorRef}
                            contentEditable="plaintext-only"
                            onInput={(e) => setName(e.currentTarget.textContent || '')}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSave();
                                }
                            }}
                            dangerouslySetInnerHTML={{ __html: subject?.name || '' }}
                            className="w-full py-4 px-6 bg-[#030712] border border-white/5 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all duration-300 text-slate-200 shadow-inner group-hover:border-white/10 min-h-[58px] empty:before:content-[attr(data-placeholder)] empty:before:text-slate-700"
                            data-placeholder="Nombre de la asignatura..."
                            style={{
                                appearance: 'none',
                                WebkitAppearance: 'none',
                                userSelect: 'text'
                            } as any}
                        />
                        <div className="absolute inset-0 rounded-2xl bg-blue-500/0 group-hover:bg-blue-500/[0.02] pointer-events-none transition-colors duration-500" />
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 font-display">Identidad visual</label>
                    <div className="grid grid-cols-4 gap-6">
                        {COLORS.map((c) => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                className={`group relative w-full aspect-square rounded-[1.25rem] transition-all duration-500 flex items-center justify-center p-1
                                    ${color === c ? 'ring-4 ring-offset-4 ring-offset-[#030712] scale-105' : 'hover:scale-105'}`}
                                style={{
                                    backgroundColor: c,
                                    boxShadow: color === c ? `0 0 40px -10px ${c}` : 'none',
                                    '--tw-ring-color': c
                                } as any}
                            >
                                <div className={`w-full h-full rounded-[1rem] bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity`} />
                                {color === c && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_10px_white]" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex gap-4 pt-6">
                    {subject && (
                        <Button
                            variant="secondary"
                            className="flex-1 rounded-2xl py-6 border-red-500/20 hover:bg-red-500/10 hover:text-red-400 transition-all"
                            onClick={handleDelete}
                        >
                            ELIMINAR
                        </Button>
                    )}
                    <Button variant="secondary" className="flex-1 rounded-2xl py-6" onClick={onClose}>DESCARTAR</Button>
                    <Button className="flex-1 rounded-2xl py-6" onClick={handleSave} disabled={!name.trim()}>ESTABLECER</Button>
                </div>
            </div>
        </Modal>
    );
};
