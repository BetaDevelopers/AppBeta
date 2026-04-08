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
import { BubbleMenu as BubbleMenuExtension } from '@tiptap/extension-bubble-menu';
import Mathematics from '@tiptap/extension-mathematics';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import 'katex/dist/katex.min.css';
import { common, createLowlight } from 'lowlight';
import { SlashCommandExtension } from './SlashCommands';

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
            className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center min-w-[36px]
        ${active
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                    : 'text-slate-500 hover:text-white hover:bg-white/10'
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
            Placeholder.configure({
                placeholder: 'Empieza a escribir tus apuntes... (escribe / para ver opciones de formato)',
            }),
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Highlight.configure({ multicolor: true }),
            Table.configure({ resizable: true }),
            TableRow,
            TableHeader,
            TableCell,
            CodeBlockLowlight.configure({ lowlight }),
            BubbleMenuExtension,
            Mathematics,
            SlashCommandExtension,
        ],
        content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: `tiptap focus:outline-none py-10 px-0 min-h-[500px] w-full text-slate-300 ${isTypingAI ? 'ai-typing' : ''}`,
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
            // Evitar reset del cursor si el contingut és el mateix però s'ha salvat manualment
            editor.commands.setContent(content, { emitUpdate: false });
        }
    }, [content, editor]);

    if (!editor) return null;

    return (
        <div className="flex-1 w-full max-w-4xl mx-auto flex flex-col">
            {/* Toolbar Permanent — Word-like experience */}
            <div className="flex items-center gap-1.5 bg-[#0f172a]/50 border-b border-white/5 px-2 py-3 mb-6 sticky top-[80px] z-[90] backdrop-blur-xl rounded-t-2xl">
                <BubbleBtn onClick={() => editor.chain().focus().toggleBold().run()}
                    active={editor.isActive('bold')} title="Negrita"><strong>B</strong></BubbleBtn>
                <BubbleBtn onClick={() => editor.chain().focus().toggleItalic().run()}
                    active={editor.isActive('italic')} title="Cursiva"><i>I</i></BubbleBtn>
                <BubbleBtn onClick={() => editor.chain().focus().toggleUnderline().run()}
                    active={editor.isActive('underline')} title="Subrayado"><u>U</u></BubbleBtn>

                <div className="w-px h-5 bg-white/10 mx-1" />

                <BubbleBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    active={editor.isActive('heading', { level: 1 })}>H1</BubbleBtn>
                <BubbleBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    active={editor.isActive('heading', { level: 2 })}>H2</BubbleBtn>
                <BubbleBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    active={editor.isActive('heading', { level: 3 })}>H3</BubbleBtn>

                <div className="w-px h-5 bg-white/10 mx-1" />

                <BubbleBtn onClick={() => editor.chain().focus().toggleBulletList().run()}
                    active={editor.isActive('bulletList')}>•</BubbleBtn>
                <BubbleBtn onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    active={editor.isActive('orderedList')}>1.</BubbleBtn>

                <div className="w-px h-5 bg-white/10 mx-1" />

                <BubbleBtn onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    active={editor.isActive({ textAlign: 'left' })}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M4 12h10M4 18h16" /></svg>
                </BubbleBtn>
                <BubbleBtn onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    active={editor.isActive({ textAlign: 'center' })}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M7 12h10M4 18h16" /></svg>
                </BubbleBtn>
            </div>

            {/* Bubble Menu — Contextual formatting */}
            <BubbleMenu
                editor={editor}
                shouldShow={({ state }: { state: any }) => {
                    const { from, to } = state.selection;
                    return from !== to;
                }}
            >
                <div className="flex items-center gap-1.5 bg-[#0f172a] border border-white/10
                        rounded-2xl px-2 py-2 shadow-[0_20px_50px_rgba(0,0,0,0.8)] glass-effect">
                    <BubbleBtn onClick={() => editor.chain().focus().toggleBold().run()}
                        active={editor.isActive('bold')} title="Negrita (Ctrl+B)">
                        <strong>B</strong>
                    </BubbleBtn>
                    <BubbleBtn onClick={() => editor.chain().focus().toggleItalic().run()}
                        active={editor.isActive('italic')} title="Cursiva (Ctrl+I)">
                        <span className="italic">I</span>
                    </BubbleBtn>
                    <BubbleBtn onClick={() => editor.chain().focus().toggleUnderline().run()}
                        active={editor.isActive('underline')} title="Subrayado (Ctrl+U)">
                        <span className="underline">U</span>
                    </BubbleBtn>
                    <BubbleBtn onClick={() => editor.chain().focus().toggleStrike().run()}
                        active={editor.isActive('strike')} title="Tachado">
                        <span className="line-through underline-offset-4">S</span>
                    </BubbleBtn>
                    <BubbleBtn onClick={() => editor.chain().focus().toggleHighlight({ color: '#2563eb' }).run()}
                        active={editor.isActive('highlight')} title="Destacar">
                        <div className="w-4 h-4 rounded bg-blue-500/20 border border-blue-500/40" />
                    </BubbleBtn>

                    <div className="w-px h-5 bg-white/10 mx-1" />

                    <BubbleBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                        active={editor.isActive('heading', { level: 1 })}>H1</BubbleBtn>
                    <BubbleBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        active={editor.isActive('heading', { level: 2 })}>H2</BubbleBtn>
                    <BubbleBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                        active={editor.isActive('heading', { level: 3 })}>H3</BubbleBtn>

                    <div className="w-px h-5 bg-white/10 mx-1" />

                    <BubbleBtn onClick={() => editor.chain().focus().toggleBulletList().run()}
                        active={editor.isActive('bulletList')} title="Lista de puntos">•</BubbleBtn>
                    <BubbleBtn onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        active={editor.isActive('orderedList')} title="Lista numerada">1.</BubbleBtn>
                    <BubbleBtn onClick={() => editor.chain().focus().toggleCode().run()}
                        active={editor.isActive('code')} title="Código inline">&lt;/&gt;</BubbleBtn>
                </div>
            </BubbleMenu>

            <EditorContent editor={editor} className="w-full" />
        </div>
    );
}
