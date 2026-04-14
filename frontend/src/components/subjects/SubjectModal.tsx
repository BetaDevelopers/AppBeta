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
    const { createSubject, updateSubject } = useSubjectsStore();

    const handleSave = async () => {
        if (!name.trim()) return;

        if (subject) {
            await updateSubject(subject.id, name, color);
        } else {
            await createSubject(name, color);
        }
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={subject ? 'Editar asignatura' : 'Identidad asignatura'}
        >
            <div className="flex flex-col gap-10 p-2">
                <Input
                    label="Nombre de la asignatura"
                    placeholder="Ej: Física Cuántica, Historia..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                />

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
                    <Button variant="secondary" className="flex-1 rounded-2xl py-6" onClick={onClose}>DESCARTAR</Button>
                    <Button className="flex-1 rounded-2xl py-6" onClick={handleSave} disabled={!name.trim()}>ESTABLECER</Button>
                </div>
            </div>
        </Modal>
    );
};
