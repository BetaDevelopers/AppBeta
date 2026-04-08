import React, { useState, useEffect } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { Transforms } from 'slate'
import { ReactEditor, useSlate, useSelected, useFocused } from 'slate-react'
import { Sigma, Sparkles, RefreshCw, X, Check } from 'lucide-react'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'

export const MathBlock = ({ attributes, children, element }: any) => {
    const editor = useSlate()
    const selected = useSelected()
    const focused = useFocused()
    const [isEditing, setIsEditing] = useState(false)
    const [inputValue, setInputValue] = useState(element.latex || '')
    const [isSolving, setIsSolving] = useState(false)

    useEffect(() => {
        if (selected && focused) {
            setIsEditing(true)
        } else {
            setIsEditing(false)
        }
    }, [selected, focused])

    const onInputChange = (val: string) => {
        setInputValue(val)
        const path = ReactEditor.findPath(editor, element)
        Transforms.setNodes(editor, { latex: val } as any, { at: path })
    }

    const handleSolve = async () => {
        if (!inputValue) return
        setIsSolving(true)
        // Simulate AI solving/explaining mathematical logic
        await new Promise(resolve => setTimeout(resolve, 1200))

        const path = ReactEditor.findPath(editor, element)
        Transforms.insertNodes(
            editor,
            {
                type: 'paragraph',
                children: [{ text: `[AI Solución]: Analizando "${inputValue}"... Esta es una expresión fundamental en física/matemáticas. Si buscamos resolver una incógnita, necesitaría los valores de las variables o una igualdad.` }]
            } as any,
            { at: [path[0] + 1] }
        )
        setIsSolving(false)
    }

    return (
        <div {...attributes} className="my-8 relative group">
            <div contentEditable={false} className={clsx(
                "p-8 rounded-[32px] flex flex-col items-center justify-center transition-all duration-500 overflow-hidden relative",
                selected && focused
                    ? "bg-[#161b22] border-blue-500 ring-4 ring-blue-500/10 shadow-2xl"
                    : "bg-white/5 border-white/5 hover:bg-white/[0.07]"
            )}>
                {/* Math Symbol Header */}
                <div className="absolute top-4 left-6 flex items-center gap-2 opacity-30 select-none">
                    <Sigma size={14} className="text-blue-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ecuación Beta</span>
                </div>

                {/* Rendered Math */}
                <div className="min-h-[60px] flex items-center justify-center py-4">
                    {inputValue ? (
                        <div
                            dangerouslySetInnerHTML={{
                                __html: katex.renderToString(inputValue, { displayMode: true, throwOnError: false })
                            }}
                            className="text-white text-3xl transition-transform"
                        />
                    ) : (
                        <div className="text-slate-500 italic text-sm font-medium tracking-tight">Escribe una fórmula en LaTeX para empezar...</div>
                    )}
                </div>

                {/* AI Tools */}
                <AnimatePresence>
                    {(selected && focused) && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="mt-6 w-full space-y-4"
                        >
                            <div className="flex items-center gap-3">
                                <input
                                    autoFocus
                                    value={inputValue}
                                    onChange={(e) => onInputChange(e.target.value)}
                                    className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-sm font-mono text-blue-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                                    placeholder="e.g. \int_a^b x^2 dx"
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault()
                                            setIsEditing(false)
                                        }
                                    }}
                                />
                                <button
                                    onClick={handleSolve}
                                    disabled={isSolving || !inputValue}
                                    className={clsx(
                                        "px-5 py-3 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all select-none active:scale-95",
                                        isSolving
                                            ? "bg-slate-800 text-slate-500"
                                            : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20"
                                    )}
                                >
                                    {isSolving ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                    Resolver
                                </button>
                            </div>

                            <div className="flex items-center justify-between px-2">
                                <div className="text-[9px] font-medium text-slate-500 tracking-wide">
                                    TIP: Usa <code className="text-blue-400/80 bg-white/5 px-1 rounded font-mono">^</code> para potencias y <code className="text-blue-400/80 bg-white/5 px-1 rounded font-mono">_</code> para subíndices.
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white transition-colors">
                                        <Check size={16} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            {children}
        </div>
    )
}
