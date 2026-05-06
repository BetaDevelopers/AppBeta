import React, { useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import Mathematics from '@tiptap/extension-mathematics';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import 'katex/dist/katex.min.css';
import { common, createLowlight } from 'lowlight';
import { SlashCommandExtension } from './SlashCommands';
import { ChartBlock } from '../../extensions/ChartBlock';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Bold, Italic, Underline as UnderlineIcon, Heading1, Heading2, Heading3, List, ListOrdered, AlignLeft, AlignCenter } from 'lucide-react';

const lowlight = createLowlight(common);

interface RichEditorProps {
    content: string;
    onChange: (html: string) => void;
    isTypingAI?: boolean;
    onEditorReady?: (editor: any) => void;
    onEqualsDetected?: (
        show: boolean,
        pos: { top: number; left: number } | null,
        resolve: () => void
    ) => void;
}

function BubbleBtn({ onClick, active, children, title }: any) {
    return (
        <button
            onClick={onClick}
            title={title}
            className={`px-3 py-1.5 rounded-xl transition-all duration-150 flex items-center justify-center min-w-[36px] active:scale-[0.92]
        ${active
                    ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(59,130,246,0.4)] scale-105'
                    : 'text-slate-500 hover:text-white hover:bg-white/5'
                }`}
        >
            {children}
        </button>
    );
}

export default function RichEditor({ content, onChange, isTypingAI, onEditorReady, onEqualsDetected }: RichEditorProps) {
    const onEqualsDetectedRef = useRef(onEqualsDetected);
    useEffect(() => { onEqualsDetectedRef.current = onEqualsDetected; }, [onEqualsDetected]);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                codeBlock: false,
                heading: { levels: [1, 2, 3] },
                // StarterKit v3 bundles underline — disable to avoid duplicate
                // @ts-ignore
                underline: false,
            }),
            Underline,
            TextStyle,
            Color,
            Placeholder.configure({
                placeholder: 'Escribe tus pensamientos aquí... (escribe / para comandos mágicos)',
            }),
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Highlight.configure({ multicolor: true }),
            Table.configure({ resizable: true }),
            TableRow,
            TableHeader,
            TableCell,
            CodeBlockLowlight.configure({ lowlight }),
            Mathematics,
            SlashCommandExtension,
            ChartBlock,
        ],
        content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: `tiptap focus:outline-none py-10 px-0 min-h-[600px] w-full text-slate-200 leading-relaxed text-lg ${isTypingAI ? 'ai-typing' : ''}`,
            },
        },
    });

    useEffect(() => {
        if (editor && onEditorReady) {
            onEditorReady(editor);
        }
    }, [editor, onEditorReady]);


    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content, { emitUpdate: false });
        }
    }, [content, editor]);

    // "=" detection — Apple Math Notes style
    useEffect(() => {
        if (!editor) return;
        let equalsTimer: ReturnType<typeof setTimeout> | null = null;

        const handleUpdate = () => {
            const cb = onEqualsDetectedRef.current;
            if (!cb) return;

            const { state } = editor;
            const { from } = state.selection;
            const resolved = state.doc.resolve(from);
            const lineText = resolved.parent.textContent;

            const hasEquals = /^.+[^=\s]\s*=\s*$/.test(lineText.trimEnd());
            if (hasEquals) {
                const coords = editor.view.coordsAtPos(Math.min(from, state.doc.content.size - 1));
                const expr = lineText.replace(/=\s*$/, '').trim();

                cb(true, { top: coords.top, left: coords.right }, async () => {
                    const { mathSolve } = await import('../../api/mathApi');
                    try {
                        const res = await mathSolve(expr);
                        const result = res.result ?? '';
                        if (result) {
                            editor.chain().focus().insertContent(` ${result}`).run();
                        }
                    } catch { /* silent */ }
                    onEqualsDetectedRef.current?.(false, null, () => {});
                });

                if (equalsTimer) clearTimeout(equalsTimer);
                equalsTimer = setTimeout(() => {
                    onEqualsDetectedRef.current?.(false, null, () => {});
                }, 6000);
            } else {
                if (equalsTimer) clearTimeout(equalsTimer);
                cb(false, null, () => {});
            }
        };

        editor.on('update', handleUpdate);
        return () => {
            editor.off('update', handleUpdate);
            if (equalsTimer) clearTimeout(equalsTimer);
        };
    }, [editor]);

    if (!editor) return null;

    return (
        <div className="flex-1 w-full max-w-4xl mx-auto flex flex-col">
            {/* Toolbar Permanent — Super Sleek */}
            <div className="flex items-center gap-1.5 glass border border-white/5 px-3 py-2.5 mb-10 sticky top-[80px] z-[90] backdrop-blur-3xl rounded-2xl shadow-xl">
                <div className="flex items-center gap-1 px-1">
                    <BubbleBtn onClick={() => editor.chain().focus().toggleBold().run()}
                        active={editor.isActive('bold')} title="Negrita"><Bold size={14} /></BubbleBtn>
                    <BubbleBtn onClick={() => editor.chain().focus().toggleItalic().run()}
                        active={editor.isActive('italic')} title="Cursiva"><Italic size={14} /></BubbleBtn>
                    <BubbleBtn onClick={() => editor.chain().focus().toggleUnderline().run()}
                        active={editor.isActive('underline')} title="Subrayado"><UnderlineIcon size={14} /></BubbleBtn>
                </div>

                <div className="w-px h-5 bg-white/[0.12] mx-1.5" />

                <div className="flex items-center gap-1">
                    <BubbleBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                        active={editor.isActive('heading', { level: 1 })} title="Título 1"><Heading1 size={14} /></BubbleBtn>
                    <BubbleBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        active={editor.isActive('heading', { level: 2 })} title="Título 2"><Heading2 size={14} /></BubbleBtn>
                    <BubbleBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                        active={editor.isActive('heading', { level: 3 })} title="Título 3"><Heading3 size={14} /></BubbleBtn>
                </div>

                <div className="w-px h-5 bg-white/[0.12] mx-1.5" />

                <div className="flex items-center gap-1">
                    <BubbleBtn onClick={() => editor.chain().focus().toggleBulletList().run()}
                        active={editor.isActive('bulletList')} title="Lista">
                        <List size={16} />
                    </BubbleBtn>
                    <BubbleBtn onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        active={editor.isActive('orderedList')} title="Lista numerada">
                        <ListOrdered size={16} />
                    </BubbleBtn>
                </div>

                <div className="w-px h-5 bg-white/[0.12] mx-1.5" />

                <div className="flex items-center gap-1">
                    <BubbleBtn onClick={() => editor.chain().focus().setTextAlign('left').run()}
                        active={editor.isActive({ textAlign: 'left' })} title="Alinear izquierda">
                        <AlignLeft size={14} />
                    </BubbleBtn>
                    <BubbleBtn onClick={() => editor.chain().focus().setTextAlign('center').run()}
                        active={editor.isActive({ textAlign: 'center' })} title="Centrar">
                        <AlignCenter size={14} />
                    </BubbleBtn>
                </div>
            </div>

            <EditorContent editor={editor} className="w-full prose prose-invert max-w-none" />
        </div>
    );
}
