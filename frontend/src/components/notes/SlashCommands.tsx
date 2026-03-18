import { forwardRef, useImperativeHandle, useState } from 'react';
import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';

const COMMANDS = [
    { icon: 'H1', label: 'Títol 1', desc: 'Títol principal gran', action: 'heading-1' },
    { icon: 'H2', label: 'Títol 2', desc: 'Títol de secció mitjà', action: 'heading-2' },
    { icon: 'H3', label: 'Títol 3', desc: 'Títol de subsecció petit', action: 'heading-3' },
    { icon: '•', label: 'Llista de punts', desc: 'Llista simple no ordenada', action: 'bulletList' },
    { icon: '1.', label: 'Llista numerada', desc: 'Llista ordenada seqüencial', action: 'orderedList' },
    { icon: '▦', label: 'Taula', desc: 'Inserir una taula de 3x3', action: 'table' },
    { icon: '</>', label: 'Bloc de codi', desc: 'Bloc amb ressaltat de sintaxi', action: 'codeBlock' },
    { icon: '"', label: 'Cita', desc: 'Bloc de text destacat o cita', action: 'blockquote' },
    { icon: '—', label: 'Separador', desc: 'Línia horitzontal divisòria', action: 'horizontalRule' },
];

export const SlashCommandList = forwardRef((props: any, ref) => {
    const [selected, setSelected] = useState(0);
    const items = props.items || COMMANDS;

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
        <div className="slash-menu bg-[#0f172a] border border-white/5 rounded-2xl shadow-2xl p-2 min-w-[300px] overflow-hidden">
            <p className="text-[10px] text-slate-500 px-3 py-2 uppercase tracking-[0.2em] font-black">
                Inserir bloc
            </p>
            <div className="max-h-[380px] overflow-y-auto scrollbar-hide">
                {items.map((item: any, i: number) => (
                    <button
                        key={i}
                        onClick={() => props.command(item)}
                        className={`w-full flex items-center gap-4 px-3 py-3 rounded-xl transition-all text-left group
              ${i === selected ? 'bg-blue-600 shadow-lg shadow-blue-500/20 translate-x-1' : 'hover:bg-white/5'}`}
                    >
                        <div className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-black flex-shrink-0 transition-colors
                             ${i === selected ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400 group-hover:text-slate-200 group-hover:bg-slate-700'}`}>
                            {item.icon}
                        </div>
                        <div>
                            <p className={`text-sm font-bold leading-none mb-1 ${i === selected ? 'text-white' : 'text-slate-200'}`}>{item.label}</p>
                            <p className={`text-[11px] font-medium leading-tight ${i === selected ? 'text-blue-100' : 'text-slate-500'}`}>{item.desc}</p>
                        </div>
                    </button>
                ))}
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
                    editor.chain().focus().deleteRange(range)
                        .command(({ tr }: any) => { tr.scrollIntoView(); return true; })
                        .run();

                    const actions: Record<string, () => void> = {
                        'heading-1': () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
                        'heading-2': () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
                        'heading-3': () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
                        'bulletList': () => editor.chain().focus().toggleBulletList().run(),
                        'orderedList': () => editor.chain().focus().toggleOrderedList().run(),
                        'codeBlock': () => editor.chain().focus().toggleCodeBlock().run(),
                        'blockquote': () => editor.chain().focus().toggleBlockquote().run(),
                        'horizontalRule': () => editor.chain().focus().setHorizontalRule().run(),
                        'table': () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
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
                items: ({ query }: { query: string }) =>
                    COMMANDS.filter((c) =>
                        c.label.toLowerCase().includes(query.toLowerCase()) ||
                        c.desc.toLowerCase().includes(query.toLowerCase())
                    ),
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
