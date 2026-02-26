import React, { useState, useEffect } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { Transforms } from 'slate'
import { ReactEditor, useSlate, useSelected, useFocused } from 'slate-react'

export const MathBlock = ({ attributes, children, element }: any) => {
    const editor = useSlate()
    const selected = useSelected()
    const focused = useFocused()
    const [isEditing, setIsEditing] = useState(false)
    const [inputValue, setInputValue] = useState(element.latex || '')

    useEffect(() => {
        if (selected && focused) {
            setIsEditing(true)
        } else {
            setIsEditing(false)
        }
    }, [selected, focused])

    const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setInputValue(val)
        const path = ReactEditor.findPath(editor, element)
        Transforms.setNodes(editor, { latex: val } as any, { at: path })
    }

    return (
        <div {...attributes} className="my-4 relative group">
            <div contentEditable={false} className={clsx(
                "p-4 rounded-lg flex flex-col items-center justify-center transition-all bg-slate-900 border",
                selected && focused ? "border-violet-500 ring-2 ring-violet-500/20" : "border-slate-800"
            )}>
                {inputValue ? (
                    <div
                        dangerouslySetInnerHTML={{
                            __html: katex.renderToString(inputValue, { displayMode: true, throwOnError: false })
                        }}
                        className="text-white text-xl"
                    />
                ) : (
                    <div className="text-slate-500 italic text-sm">Vacío. Escribe una ecuación en LaTeX...</div>
                )}

                {isEditing && (
                    <input
                        autoFocus
                        value={inputValue}
                        onChange={onInputChange}
                        className="mt-4 w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs font-mono text-violet-300 focus:outline-none focus:border-violet-500"
                        placeholder="E.g. e = mc^2"
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                e.preventDefault()
                                setIsEditing(false)
                            }
                        }}
                    />
                )}
            </div>
            {children}
        </div>
    )
}

function clsx(...args: any[]) {
    return args.filter(Boolean).join(' ')
}
