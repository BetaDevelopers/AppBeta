import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
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

export default function RichEditor({ content, onChange, isTypingAI, onEditorReady }: RichEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                codeBlock: false,
                heading: { levels: [1, 2, 3] }
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

            {/* Bubble Menu — Contextual floating magic */}
            <BubbleMenu
                editor={editor}
                appendTo={() => document.body}
                shouldShow={({ state }: { state: any }) => {
                    const { from, to } = state.selection;
                    return from !== to;
                }}
            >
                <div className="flex items-center gap-1 glass-card border border-white/10 rounded-2xl px-2 py-2 shadow-[0_32px_64px_rgba(0,0,0,0.8)] backdrop-blur-3xl ring-1 ring-white/10">
                    <BubbleBtn onClick={() => editor.chain().focus().toggleBold().run()}
                        active={editor.isActive('bold')} title="Negrita">
                        <Bold size={14} />
                    </BubbleBtn>
                    <BubbleBtn onClick={() => editor.chain().focus().toggleHighlight({ color: '#2563eb' }).run()}
                        active={editor.isActive('highlight')} title="Resaltar">
                        <div className="w-3 h-3 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50" />
                    </BubbleBtn>

                    <div className="w-px h-5 bg-white/10 mx-1" />

                    <BubbleBtn onClick={() => editor.chain().focus().toggleCode().run()}
                        active={editor.isActive('code')} title="Código">
                        <span className="text-[10px]">&lt;/&gt;</span>
                    </BubbleBtn>
                </div>
            </BubbleMenu>

            <EditorContent editor={editor} className="w-full prose prose-invert max-w-none" />
        </div>
    );
}
