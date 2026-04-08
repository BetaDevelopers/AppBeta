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
            title={subject ? 'Editar assignatura' : 'Nova assignatura'}
        >
            <div className="space-y-6">
                <Input
                    label="Nom de l'assignatura"
                    placeholder="Ex: Matemàtiques, Biologia..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />

                <div className="flex flex-col gap-3">
                    <label className="text-sm font-semibold text-slate-700 ml-1">Color</label>
                    <div className="grid grid-cols-4 gap-4">
                        {COLORS.map((c) => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                className={`w-12 h-12 rounded-full transition-all border-4 flex items-center justify-center ${color === c ? 'border-slate-300 scale-110' : 'border-transparent hover:scale-105'
                                    }`}
                                style={{ backgroundColor: c }}
                            >
                                {color === c && (
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex gap-3 justify-end pt-4">
                    <Button variant="secondary" onClick={onClose}>Cancel·lar</Button>
                    <Button onClick={handleSave} disabled={!name.trim()}>Guardar</Button>
                </div>
            </div>
        </Modal>
    );
};
