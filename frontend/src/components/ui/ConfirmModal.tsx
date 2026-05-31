import React from 'react';

interface ConfirmModalProps {
    title: string;
    description: string;
    confirmLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    title,
    description,
    confirmLabel = 'Eliminar',
    onConfirm,
    onCancel,
}) => (
    <div
        className="fixed inset-0 z-[500] flex items-center justify-center p-4"
        onClick={onCancel}
    >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div
            className="relative bg-[#111] border border-[#1a1a1a] rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
        >
            <h3 className="text-[15px] font-bold text-[#fafafa] mb-2">{title}</h3>
            <p className="text-[13px] text-[#555] mb-6 leading-relaxed">{description}</p>
            <div className="flex gap-3 justify-end">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 rounded-lg text-[13px] font-semibold text-[#555] bg-[#1a1a1a] hover:text-[#fafafa] transition-colors"
                >
                    Cancelar
                </button>
                <button
                    onClick={onConfirm}
                    className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors"
                >
                    {confirmLabel}
                </button>
            </div>
        </div>
    </div>
);
