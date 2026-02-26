import React, { useState, useEffect, useCallback } from 'react'
import { Editor, Range, Transforms } from 'slate'
import { ReactEditor, useSlate } from 'slate-react'
import { Heading1, Heading2, Heading3, Sigma, PenTool, Image as ImageIcon, List, ListOrdered } from 'lucide-react'
import { clsx } from 'clsx'

interface SlashMenuProps {
    target: Range | null;
    onClose: () => void;
    search: string;
}

export const SlashMenu: React.FC<SlashMenuProps> = ({ target, onClose, search }) => {
    const [index, setIndex] = useState(0)
    const editor = useSlate()

    const COMMANDS = [
        { label: 'Título 1', icon: <Heading1 size={14} />, type: 'heading-one' },
        { label: 'Título 2', icon: <Heading2 size={14} />, type: 'heading-two' },
        { label: 'Título 3', icon: <Heading3 size={14} />, type: 'heading-three' },
        { label: 'Ecuación', icon: <Sigma size={14} />, type: 'math-block' },
        { label: 'Dibujo', icon: <PenTool size={14} />, type: 'drawing-canvas' },
        { label: 'Lista con viñetas', icon: <List size={14} />, type: 'bulleted-list' },
        { label: 'Lista numerada', icon: <ListOrdered size={14} />, type: 'numbered-list' },
    ]

    const filtered = COMMANDS.filter(c =>
        c.label.toLowerCase().startsWith(search.toLowerCase())
    )

    useEffect(() => {
        setIndex(0)
    }, [search])

    useEffect(() => {
        if (target && filtered.length > 0) {
            const el = document.getElementById('slash-menu')
            const domRange = ReactEditor.toDOMRange(editor, target)
            const rect = domRange.getBoundingClientRect()
            if (el) {
                el.style.top = `${rect.bottom + window.pageYOffset}px`
                el.style.left = `${rect.left + window.pageXOffset}px`
            }
        }
    }, [editor, filtered.length, target])

    const onExecute = useCallback((type: string) => {
        Transforms.select(editor, target!)
        Transforms.delete(editor)

        if (type === 'heading-one' || type === 'heading-two' || type === 'heading-three') {
            Transforms.setNodes(editor, { type } as any)
        } else {
            Transforms.insertNodes(editor, { type, children: [{ text: '' }] } as any)
        }

        onClose()
    }, [editor, target, onClose])

    if (!target || filtered.length === 0) return null

    return (
        <div
            id="slash-menu"
            className="absolute z-50 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl p-2 w-56"
            style={{ top: '-10000px', left: '-10000px' }}
        >
            <div className="text-[10px] uppercase font-black text-slate-500 mb-2 px-3 tracking-[0.1em]">Comandos</div>
            {filtered.map((cmd, i) => (
                <div
                    key={cmd.type}
                    onMouseDown={(e) => { e.preventDefault(); onExecute(cmd.type); }}
                    className={clsx(
                        "flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-all text-sm font-medium",
                        index === i ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20" : "hover:bg-slate-800 text-slate-300"
                    )}
                >
                    <span className={clsx(index === i ? "text-violet-200" : "text-slate-500")}>{cmd.icon}</span>
                    <span>{cmd.label}</span>
                </div>
            ))}
        </div>
    )
}
