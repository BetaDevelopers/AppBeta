import React, { useRef, useEffect } from 'react'
import { Editor, Range, Transforms, Text } from 'slate'
import { useFocused, useSlate } from 'slate-react'
import { Bold, Italic, Underline, Code, Highlighter } from 'lucide-react'

export const FloatingToolbar: React.FC = () => {
    const ref = useRef<HTMLDivElement | null>(null)
    const editor = useSlate()
    const inFocus = useFocused()

    useEffect(() => {
        const el = ref.current
        const { selection } = editor

        if (!el) return

        if (
            !selection ||
            !inFocus ||
            Range.isCollapsed(selection) ||
            Editor.string(editor, selection) === ''
        ) {
            el.removeAttribute('style')
            return
        }

        const domSelection = window.getSelection()
        if (!domSelection || domSelection.rangeCount === 0) return

        const domRange = domSelection.getRangeAt(0)
        const rect = domRange.getBoundingClientRect()
        el.style.opacity = '1'
        el.style.top = `${rect.top + window.pageYOffset - el.offsetHeight}px`
        el.style.left = `${rect.left + window.pageXOffset - el.offsetWidth / 2 + rect.width / 2}px`
    })

    const toggleMark = (format: string) => {
        const isActive = isMarkActive(editor, format)
        if (isActive) {
            Editor.removeMark(editor, format)
        } else {
            Editor.addMark(editor, format, true)
        }
    }

    const isMarkActive = (editor: Editor, format: string) => {
        const marks = Editor.marks(editor) as any
        return marks ? marks[format] === true : false
    }

    return (
        <div
            ref={ref}
            style={{
                position: 'absolute',
                zIndex: 1,
                top: '-10000px',
                left: '-10000px',
                marginTop: '-6px',
                opacity: 0,
                backgroundColor: '#1e293b',
                borderRadius: '4px',
                transition: 'opacity 0.75s',
                display: 'flex',
                padding: '4px',
                gap: '4px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                border: '1px solid #334155'
            }}
        >
            <ToolbarButton onMouseDown={() => toggleMark('bold')}>
                <Bold size={14} className={isMarkActive(editor, 'bold') ? 'text-violet-500' : 'text-slate-300'} />
            </ToolbarButton>
            <ToolbarButton onMouseDown={() => toggleMark('italic')}>
                <Italic size={14} className={isMarkActive(editor, 'italic') ? 'text-violet-500' : 'text-slate-300'} />
            </ToolbarButton>
            <ToolbarButton onMouseDown={() => toggleMark('underline')}>
                <Underline size={14} className={isMarkActive(editor, 'underline') ? 'text-violet-500' : 'text-slate-300'} />
            </ToolbarButton>
            <ToolbarButton onMouseDown={() => toggleMark('code')}>
                <Code size={14} className={isMarkActive(editor, 'code') ? 'text-violet-500' : 'text-slate-300'} />
            </ToolbarButton>
            <ToolbarButton onMouseDown={() => toggleMark('highlight')}>
                <Highlighter size={14} className={isMarkActive(editor, 'highlight') ? 'text-violet-500' : 'text-slate-300'} />
            </ToolbarButton>
        </div>
    )
}

const ToolbarButton: React.FC<{ onMouseDown: () => void; children: React.ReactNode }> = ({ onMouseDown, children }) => (
    <button
        onMouseDown={e => {
            e.preventDefault()
            onMouseDown()
        }}
        className="p-1 hover:bg-slate-800 rounded transition-colors"
    >
        {children}
    </button>
)
