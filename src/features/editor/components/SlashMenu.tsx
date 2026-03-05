import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Editor, Range, Transforms } from 'slate'
import { ReactEditor, useSlate } from 'slate-react'
import {
    Heading1, Heading2, Heading3, Sigma,
    Type, List, Square, Image, Code, Palette, Sparkles, X
} from 'lucide-react'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'

const COMMANDS = [
    { label: 'Título 1', desc: 'Encabezado grande para secciones', icon: <Heading1 size={18} />, type: 'heading-one' },
    { label: 'Título 2', desc: 'Encabezado mediano', icon: <Heading2 size={18} />, type: 'heading-two' },
    { label: 'Título 3', desc: 'Subtítulo pequeño', icon: <Heading3 size={18} />, type: 'heading-three' },
    { label: 'Ecuación', desc: 'Fórmula matemática LaTeX', icon: <Sigma size={18} />, type: 'math-block' },
    { label: 'Dibujo', desc: 'Lienzo para bocetos a mano', icon: <Palette size={18} />, type: 'drawing-canvas' },
    { label: 'Lista Viñetas', desc: 'Organiza por puntos', icon: <List size={18} />, type: 'bulleted-list' },
    { label: 'Párrafo', desc: 'Texto normal de escritura', icon: <Type size={18} />, type: 'paragraph' },
]

export const SlashMenu = ({ target, search, onClose }: any) => {
    const editor = useSlate()
    const [index, setIndex] = useState(0)
    const menuRef = useRef<HTMLDivElement>(null)

    const filtered = COMMANDS.filter(c =>
        c.label.toLowerCase().startsWith(search.toLowerCase())
    )

    const onExecute = useCallback((type: string) => {
        if (!target) return
        Transforms.select(editor, target)

        if (type === 'drawing-canvas') {
            Transforms.insertNodes(editor, { type: 'drawing-canvas', children: [{ text: '' }] } as any)
        } else if (type === 'math-block') {
            Transforms.insertNodes(editor, { type: 'math-block', latex: '', children: [{ text: '' }] } as any)
        } else {
            Transforms.setNodes(editor, { type: type } as any)
        }

        onClose()
    }, [editor, target, onClose])

    useEffect(() => {
        setIndex(0)
    }, [search])

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (!target) return
            if (e.key === 'ArrowDown') {
                e.preventDefault()
                setIndex(prev => (prev + 1) % filtered.length)
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault()
                setIndex(prev => (prev - 1 + filtered.length) % filtered.length)
            }
            if (e.key === 'Enter') {
                e.preventDefault()
                onExecute(filtered[index].type)
            }
            if (e.key === 'Escape') {
                e.preventDefault()
                onClose()
            }
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [filtered, index, target, onClose, onExecute])

    if (!target || filtered.length === 0) return null

    return (
        <>
            {/* Tablet Backdrop for easy dismissal */}
            <div
                className="fixed inset-0 z-[199] bg-black/5 backdrop-blur-[1px]"
                onPointerDown={onClose}
            />

            <div
                ref={menuRef}
                className="glass-effect shadow-2xl z-[200] overflow-hidden no-select"
                style={{
                    position: 'absolute',
                    top: '-10000px',
                    left: '-10000px',
                    width: '320px',
                    borderRadius: '24px',
                }}
            >
                <div className="bg-blue-600/10 px-5 py-3 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-blue-400" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400/80">IA & Comandos</span>
                    </div>
                    <button onClick={onClose} className="text-white/20 hover:text-white transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <div className="max-h-[420px] overflow-y-auto py-2 custom-scrollbar">
                    {filtered.map((cmd, i) => (
                        <button
                            key={cmd.label}
                            onClick={() => onExecute(cmd.type)}
                            onMouseEnter={() => setIndex(i)}
                            className={clsx(
                                "w-full px-5 py-4 flex items-start gap-4 transition-all duration-200 text-left relative active:scale-[0.98]",
                                i === index ? "bg-blue-600 shadow-lg shadow-blue-600/20" : "hover:bg-white/5"
                            )}
                        >
                            <div className={clsx(
                                "p-3 rounded-xl flex items-center justify-center transition-colors",
                                i === index ? "bg-white/20 text-white" : "bg-white/5 text-slate-400"
                            )}>
                                {cmd.icon}
                            </div>
                            <div className="flex-1 pt-0.5">
                                <div className={clsx(
                                    "text-sm font-bold tracking-tight",
                                    i === index ? "text-white" : "text-white/90"
                                )}>
                                    {cmd.label}
                                </div>
                                <div className={clsx(
                                    "text-[10px] mt-0.5 font-medium leading-relaxed",
                                    i === index ? "text-white/60" : "text-slate-500"
                                )}>
                                    {cmd.desc}
                                </div>
                            </div>
                            {i === index && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 px-2 py-1 rounded text-[8px] font-black text-white uppercase tracking-widest border border-white/10">
                                    Tocar
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>
            {/* Script for positioning - needed because positioning logic was missing in my prev template or needs to be reactive */}
            <MenuPositioner target={target} menuRef={menuRef} />
        </>
    )
}

const MenuPositioner = ({ target, menuRef }: any) => {
    const editor = useSlate() // Use useSlate here to get the editor instance
    useEffect(() => {
        const el = menuRef.current
        if (el && target) {
            const domRange = ReactEditor.toDOMRange(editor, target) // Pass editor instance
            const rect = domRange.getBoundingClientRect()
            el.style.top = `${rect.top + window.pageYOffset + 35}px` // +35 to move below text
            el.style.left = `${rect.left + window.pageXOffset}px`
        }
    }, [target, menuRef, editor]) // Add editor to dependencies
    return null
}
