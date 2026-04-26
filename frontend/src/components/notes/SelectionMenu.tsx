import React, { useState } from 'react';
import { BubbleMenu } from '@tiptap/react/menus';
import {
    Scissors,
    Copy,
    Clipboard,
    CopyPlus,
    Trash2,
    Sparkles,
    Calculator,
    Languages,
    Wand2,
} from 'lucide-react';
import { mathFix } from '../../api/mathApi';
import { apiClient } from '../../api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SelectionMenuProps {
    editor: any;
    onOpenSolvePanel: (selectedText: string) => void;
}

interface ActionBtnProps {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    danger?: boolean;
    loading?: boolean;
    active?: boolean;
}

interface ColorDotProps {
    color: string;
    label: string;
    active: boolean;
    onClick: () => void;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const TEXT_COLORS = [
    { label: 'Default',  value: '#E2E8F0' },
    { label: 'Azul',     value: '#60A5FA' },
    { label: 'Verde',    value: '#34D399' },
    { label: 'Rojo',     value: '#F87171' },
    { label: 'Naranja',  value: '#FB923C' },
    { label: 'Morado',   value: '#A78BFA' },
    { label: 'Amarillo', value: '#FBBF24' },
    { label: 'Rosa',     value: '#F472B6' },
];

const LANGUAGES = [
    { code: 'en', flag: '🇬🇧', label: 'Inglés' },
    { code: 'es', flag: '🇪🇸', label: 'Español' },
    { code: 'fr', flag: '🇫🇷', label: 'Francés' },
    { code: 'de', flag: '🇩🇪', label: 'Alemán' },
    { code: 'zh', flag: '🇨🇳', label: 'Chino' },
];

const LANG_NAMES: Record<string, string> = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    zh: 'Chinese',
};

// ─── Internal sub-components ──────────────────────────────────────────────────

function ActionBtn({ icon: Icon, label, onClick, danger = false, loading = false, active = false }: ActionBtnProps) {
    return (
        <button
            onClick={onClick}
            title={label}
            className={`flex flex-col items-center justify-center gap-0.5 w-[52px] min-h-[52px] rounded-xl transition-all duration-150 active:scale-[0.92] select-none
                ${danger
                    ? 'hover:bg-red-500/15 text-red-400'
                    : active
                    ? 'bg-blue-500/20 text-blue-300'
                    : 'hover:bg-white/8 text-slate-300'
                }`}
        >
            {loading ? (
                <span className="w-4 h-4 border-2 border-white/20 border-t-blue-400 rounded-full animate-spin" />
            ) : (
                <Icon size={18} strokeWidth={1.75} />
            )}
            <span className="text-[9px] uppercase tracking-widest font-semibold leading-none">
                {label}
            </span>
        </button>
    );
}

function ColorDot({ color, label, active, onClick }: ColorDotProps) {
    return (
        <button
            onClick={onClick}
            title={label}
            className="relative w-5 h-5 rounded-full transition-transform duration-150 hover:scale-125 active:scale-90 flex-shrink-0"
            style={{
                backgroundColor: color,
                border: active
                    ? '2px solid rgba(255,255,255,0.9)'
                    : '1.5px solid rgba(255,255,255,0.15)',
                minWidth: '20px',
                minHeight: '20px',
            }}
        >
            {active && (
                <svg
                    className="absolute inset-0 w-full h-full"
                    viewBox="0 0 20 20"
                    fill="none"
                >
                    <path
                        d="M5 10l3.5 3.5L15 7"
                        stroke="white"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            )}
        </button>
    );
}

function Divider() {
    return (
        <div
            className="my-1 mx-1"
            style={{ height: '1px', background: 'rgba(255,255,255,0.08)' }}
        />
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SelectionMenu({ editor, onOpenSolvePanel }: SelectionMenuProps) {
    const [showTranslate, setShowTranslate] = useState(false);
    const [loadingAction, setLoadingAction] = useState<string | null>(null);

    if (!editor) return null;

    // ── Helpers ───────────────────────────────────────────────────────────────

    const getSelectedText = (): string => {
        const { from, to } = editor.state.selection;
        return editor.state.doc.textBetween(from, to, '\n');
    };

    // ── Basic actions ─────────────────────────────────────────────────────────

    const handleCut = () => {
        const text = getSelectedText();
        navigator.clipboard.writeText(text).then(() => {
            editor.chain().focus().deleteSelection().run();
        });
    };

    const handleCopy = () => {
        const text = getSelectedText();
        navigator.clipboard.writeText(text);
    };

    const handlePaste = () => {
        navigator.clipboard.readText().then((t) => {
            editor.chain().focus().insertContent(t).run();
        });
    };

    const handleDuplicate = () => {
        const text = getSelectedText();
        const { to } = editor.state.selection;
        editor.chain().focus().insertContentAt(to, text).run();
    };

    const handleDelete = () => {
        editor.chain().focus().deleteSelection().run();
    };

    const handleSetColor = (color: string) => {
        editor.chain().focus().setColor(color).run();
    };

    // ── AI actions ────────────────────────────────────────────────────────────

    const handleBeautify = async () => {
        const text = getSelectedText();
        if (!text) return;
        setLoadingAction('beautify');
        try {
            const res = await mathFix(text, 'beautify');
            if (res.latex) {
                editor.chain().focus().deleteSelection().insertContent(`$${res.latex}$`).run();
            }
        } catch (err) {
            console.error('Embellecer error:', err);
        } finally {
            setLoadingAction(null);
        }
    };

    const handleResolve = () => {
        const text = getSelectedText();
        if (!text) return;
        onOpenSolvePanel(text);
    };

    const handleTranslate = async (code: string) => {
        const text = getSelectedText();
        if (!text) return;
        setShowTranslate(false);
        setLoadingAction('translate');
        try {
            const res = await apiClient.post<{ reply: string }>('/ai/chat', {
                messages: [
                    {
                        role: 'user',
                        content: `Translate to ${LANG_NAMES[code]}. Return ONLY the translation:\n\n${text}`,
                    },
                ],
            });
            if (res.reply) {
                editor.chain().focus().deleteSelection().insertContent(res.reply).run();
            }
        } catch (err) {
            console.error('Traducir error:', err);
        } finally {
            setLoadingAction(null);
        }
    };

    const handleEnderezar = async () => {
        const text = getSelectedText();
        if (!text) return;
        setLoadingAction('enderezar');
        try {
            const res = await apiClient.post<{ result: string }>('/ai/improve', { text });
            if (res.result) {
                editor.chain().focus().deleteSelection().insertContent(res.result).run();
            }
        } catch (err) {
            console.error('Enderezar error:', err);
        } finally {
            setLoadingAction(null);
        }
    };

    // ── Container style ───────────────────────────────────────────────────────

    const containerStyle: React.CSSProperties = {
        background: 'rgba(15, 15, 30, 0.96)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px',
        padding: '6px',
        boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)',
        minWidth: '260px',
    };

    const dropdownStyle: React.CSSProperties = {
        background: 'rgba(15, 15, 30, 0.96)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)',
        minWidth: '160px',
        overflow: 'hidden',
    };

    // ── Translate dropdown ────────────────────────────────────────────────────

    const TranslateDropdown = () => (
        <div
            className="absolute top-full left-0 mt-2 z-[300]"
            style={dropdownStyle}
        >
            {LANGUAGES.map((lang) => (
                <button
                    key={lang.code}
                    onClick={() => handleTranslate(lang.code)}
                    className="flex items-center gap-2 w-full py-2.5 px-3 text-[13px] text-slate-300 hover:bg-white/6 hover:text-white transition-colors rounded-lg"
                >
                    <span>{lang.flag}</span>
                    <span>{lang.label}</span>
                </button>
            ))}
        </div>
    );

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <BubbleMenu
            editor={editor}
            appendTo={() => document.body}
            shouldShow={({ state }: { state: any }) => {
                const { from, to } = state.selection;
                return from !== to;
            }}
        >
            <style>{`
                @keyframes selection-menu-spring {
                    from { opacity: 0; transform: scale(0.85); }
                    to   { opacity: 1; transform: scale(1); }
                }
                .selection-menu-enter {
                    animation: selection-menu-spring 180ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
                }
            `}</style>

            <div className="selection-menu-enter" style={containerStyle}>

                {/* ROW 1: Basic actions */}
                <div className="flex items-center gap-0.5 px-1">
                    <ActionBtn icon={Scissors}  label="Cortar"   onClick={handleCut} />
                    <ActionBtn icon={Copy}      label="Copiar"   onClick={handleCopy} />
                    <ActionBtn icon={Clipboard} label="Pegar"    onClick={handlePaste} />
                    <ActionBtn icon={CopyPlus}  label="Duplicar" onClick={handleDuplicate} />
                    <ActionBtn icon={Trash2}    label="Borrar"   onClick={handleDelete} danger />
                </div>

                <Divider />

                {/* ROW 2: AI actions */}
                <div className="flex items-center gap-0.5 px-1">
                    <ActionBtn
                        icon={Sparkles}
                        label="Embellecer"
                        onClick={handleBeautify}
                        loading={loadingAction === 'beautify'}
                    />
                    <ActionBtn
                        icon={Calculator}
                        label="Resolver"
                        onClick={handleResolve}
                    />
                    <div className="relative">
                        <ActionBtn
                            icon={Languages}
                            label="Traducir"
                            onClick={() => setShowTranslate((v) => !v)}
                            loading={loadingAction === 'translate'}
                            active={showTranslate}
                        />
                        {showTranslate && <TranslateDropdown />}
                    </div>
                    <ActionBtn
                        icon={Wand2}
                        label="Enderezar"
                        onClick={handleEnderezar}
                        loading={loadingAction === 'enderezar'}
                    />
                </div>

                <Divider />

                {/* ROW 3: Color picker */}
                <div className="flex items-center gap-2 px-3 py-1.5">
                    {TEXT_COLORS.map((c) => (
                        <ColorDot
                            key={c.value}
                            color={c.value}
                            label={c.label}
                            active={editor.isActive('textStyle', { color: c.value })}
                            onClick={() => handleSetColor(c.value)}
                        />
                    ))}
                </div>

            </div>
        </BubbleMenu>
    );
}
