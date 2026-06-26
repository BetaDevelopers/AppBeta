import React from 'react';

interface ConfirmModalProps {
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ title, description, onConfirm, onCancel }) => (
  <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}
    onClick={onCancel}>
    <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: 24, maxWidth: 360, width: '90%' }}
      onClick={e => e.stopPropagation()}>
      <h2 style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{title}</h2>
      <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>{description}</p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button onClick={onCancel}
          style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 14 }}>
          Cancelar
        </button>
        <button onClick={onConfirm}
          style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
          Eliminar
        </button>
      </div>
    </div>
  </div>
);
