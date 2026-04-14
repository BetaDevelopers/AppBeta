import { forwardRef, useImperativeHandle, useState } from 'react';
import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';

const COMMANDS = [
    // FORMAT
    { category: 'FORMAT', icon: 'H1', label: 'H1', desc: 'Títol principal gran', action: 'heading-1', search: 'h1 títol' },
    { category: 'FORMAT', icon: 'H2', label: 'H2', desc: 'Títol de secció mitjà', action: 'heading-2', search: 'h2 subtítol' },
    { category: 'FORMAT', icon: 'H3', label: 'H3', desc: 'Títol de subsecció petit', action: 'heading-3', search: 'h3 apartat' },
    { category: 'FORMAT', icon: 'B', label: 'Negreta', desc: 'Text en negreta', action: 'bold', search: 'bold negreta' },
    { category: 'FORMAT', icon: '•', label: 'Llista', desc: 'Llista de punts simple', action: 'bulletList', search: 'lista punts' },
    { category: 'FORMAT', icon: '1.', label: 'Numerada', desc: 'Llista ordenada', action: 'orderedList', search: 'numerada' },

    // EINES IA
    { category: 'EINES IA', icon: '✨', label: 'Optimitzar', desc: 'Millorar text amb IA', action: 'ai-optimize', search: 'optimizar millorar' },
    { category: 'EINES IA', icon: 'Σ', label: 'Resumir', desc: 'Resum automàtic', action: 'ai-summarize', search: 'resumir resum' },
    { category: 'EINES IA', icon: '💡', label: 'Suggerir', desc: 'Suggerir assignatura', action: 'ai-suggest', search: 'suggerir assignatura' },

    // INSERIR
    { category: 'INSERIR', icon: '▦', label: 'Taula', desc: 'Inserir taula 3x3', action: 'table', search: 'taula cuadrícula' },
    { category: 'INSERIR', icon: '∑', label: 'Fórmula', desc: 'Equació LaTeX ($...$)', action: 'math', search: 'formula equacio latex' },
    { category: 'INSERIR', icon: '✏', label: 'Dibuix', desc: 'Llenç de dibuix a mà', action: 'drawing', search: 'dibuix llapis' },
    { category: 'INSERIR', icon: '🖼', label: 'Imatge', desc: 'Pujar imatge', action: 'image', search: 'imatge foto' },
    { category: 'INSERIR', icon: '📊', label: 'Gràfic', desc: 'Generar gràfic de dades', action: 'chart', search: 'grafic' },
    { category: 'INSERIR', icon: '📸', label: 'MathVision', desc: 'OCR matemàtic visual', action: 'math-vision', search: 'mathvision camera' },
    { category: 'INSERIR', icon: '📉', label: 'DataVision', desc: 'Extreure dades de gràfics', action: 'data-vision', search: 'datavision' },
];

export const SlashCommandList = forwardRef((props: any, ref) => {
    const [selected, setSelected] = useState(0);
    const items = props.items || [];

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }: { event: KeyboardEvent }) => {
            if (event.key === 'ArrowUp') {
                setSelected((s) => (s - 1 + items.length) % items.length);
                return true;
            }
            if (event.key === 'ArrowDown') {
                setSelected((s) => (s + 1) % items.length);
                return true;
            }
            if (event.key === 'Enter') {
                props.command(items[selected]);
                return true;
            }
            return false;
        },
    }));

    return (
        <div className="slash-menu bg-[#0f172a] border border-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-1.5 w-[320px] overflow-hidden backdrop-blur-xl">
            <div className="max-h-[420px] overflow-y-auto scrollbar-hide py-1">
                {items.length === 0 && (
                    <div className="px-4 py-8 text-center">
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">No hi ha opcions</p>
                    </div>
                )}
                {items.map((item: any, i: number) => {
                    const showCategory = i === 0 || items[i - 1].category !== item.category;
                    return (
                        <div key={i}>
                            {showCategory && (
                                <div className="px-3 py-2 mt-2 first:mt-1">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{item.category}</span>
                                </div>
                            )}
                            <button
                                onClick={() => props.command(item)}
                                className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-all text-left group relative
                                    ${i === selected ? 'bg-blue-600 shadow-xl shadow-blue-600/20 translate-x-0.5' : 'hover:bg-white/5'}`}
                            >
                                <div className={`w-10 h-10 flex items-center justify-center rounded-lg text-lg font-black flex-shrink-0 transition-all
                                    ${i === selected ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300 group-hover:bg-slate-700'}`}>
                                    {item.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className={`text-sm font-black leading-none truncate ${i === selected ? 'text-white' : 'text-slate-100'}`}>
                                            {item.label}
                                        </p>
                                    </div>
                                    <p className={`text-[10.5px] font-medium leading-tight mt-1 truncate ${i === selected ? 'text-blue-100' : 'text-slate-500'}`}>
                                        {item.desc}
                                    </p>
                                </div>
                                {i === selected && (
                                    <div className="absolute right-3 opacity-50">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                    </div>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

export const SlashCommandExtension = Extension.create({
    name: 'slashCommand',
    addOptions() {
        return {
            suggestion: {
                char: '/',
                command: ({ editor, range, props }: any) => {
                    const isGuest = useAuthStore.getState().isGuest;
                    const restrictedActions = ['ai-optimize', 'ai-summarize', 'ai-suggest', 'math-vision', 'data-vision', 'chart'];

                    if (isGuest && (props.category === 'EINES IA' || restrictedActions.includes(props.action))) {
                        useUIStore.getState().openAuthModal('selection');
                        return;
                    }

                    editor.chain().focus().deleteRange(range)
                        .command(({ tr }: any) => { tr.scrollIntoView(); return true; })
                        .run();

                    const actions: Record<string, () => void> = {
                        'heading-1': () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
                        'heading-2': () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
                        'heading-3': () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
                        'bold': () => editor.chain().focus().toggleBold().run(),
                        'bulletList': () => editor.chain().focus().toggleBulletList().run(),
                        'orderedList': () => editor.chain().focus().toggleOrderedList().run(),
                        'codeBlock': () => editor.chain().focus().toggleCodeBlock().run(),
                        'blockquote': () => editor.chain().focus().toggleBlockquote().run(),
                        'horizontalRule': () => editor.chain().focus().setHorizontalRule().run(),
                        'table': () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
                        'math': () => editor.chain().focus().insertContent(' $ $ ').moveCursorToStart().run(),
                        'drawing': () => window.dispatchEvent(new CustomEvent('open-drawing-canvas')),
                        'math-vision': () => window.dispatchEvent(new CustomEvent('open-math-vision')),
                        'data-vision': () => window.dispatchEvent(new CustomEvent('open-data-vision')),
                        'ai-optimize': () => window.dispatchEvent(new CustomEvent('trigger-ai-optimize')),
                        'ai-summarize': () => window.dispatchEvent(new CustomEvent('trigger-ai-summarize')),
                        'ai-suggest': () => window.dispatchEvent(new CustomEvent('trigger-ai-suggest')),
                        'image': () => window.dispatchEvent(new CustomEvent('trigger-image-upload')),
                        'chart': () => window.dispatchEvent(new CustomEvent('trigger-generate-chart')),
                    };

                    actions[props.action]?.();
                }
            }
        };
    },
    addProseMirrorPlugins() {
        return [
            Suggestion({
                editor: this.editor,
                ...this.options.suggestion,
                items: ({ query }: { query: string }) => {
                    const search = query.toLowerCase();
                    return COMMANDS.filter((c) =>
                        c.label.toLowerCase().includes(search) ||
                        c.desc.toLowerCase().includes(search) ||
                        c.search.toLowerCase().includes(search) ||
                        c.action.toLowerCase().includes(search)
                    );
                },
                render: () => {
                    let component: ReactRenderer;
                    let popup: any;
                    return {
                        onStart: (props: any) => {
                            component = new ReactRenderer(SlashCommandList, { props, editor: props.editor });
                            popup = tippy('body', {
                                getReferenceClientRect: props.clientRect,
                                appendTo: () => document.body,
                                content: component.element,
                                showOnCreate: true,
                                interactive: true,
                                trigger: 'manual',
                                placement: 'bottom-start',
                                zIndex: 999,
                            });
                        },
                        onUpdate: (props: any) => {
                            component.updateProps(props);
                            popup[0].setProps({ getReferenceClientRect: props.clientRect });
                        },
                        onKeyDown: (props: any) => {
                            if (props.event.key === 'Escape') {
                                popup[0].hide();
                                return true;
                            }
                            return (component.ref as any)?.onKeyDown(props);
                        },
                        onExit: () => {
                            popup[0].destroy();
                            component.destroy();
                        },
                    };
                },
            })
        ];
    },
});
