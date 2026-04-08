import React, { useRef, useEffect } from 'react'
import { Editor, Range } from 'slate'
import { useFocused, useSlate } from 'slate-react'
import { Bold, Italic, Underline, Code, Highlighter, GripHorizontal } from 'lucide-react'
import { motion, useDragControls } from 'framer-motion'
import { clsx } from 'clsx'

export const FloatingToolbar: React.FC = () => {
    const ref = useRef<HTMLDivElement | null>(null)
    const editor = useSlate()
    const inFocus = useFocused()
    const dragControls = useDragControls()

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
            el.style.display = 'none'
            return
        }

        const domSelection = window.getSelection()
        if (!domSelection || domSelection.rangeCount === 0) return

        const domRange = domSelection.getRangeAt(0)
        const rect = domRange.getBoundingClientRect()
        el.style.display = 'flex'
        el.style.opacity = '1'
        // Initial positioning near selection, but user can drag it afterwards
        if (el.style.top === '' || el.style.top === '0px') {
            el.style.top = `${rect.top + window.pageYOffset - el.offsetHeight - 15}px`
            el.style.left = `${rect.left + window.pageXOffset - el.offsetWidth / 2 + rect.width / 2}px`
        }
    }, [editor, inFocus])

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
        <motion.div
            ref={ref}
            drag
            dragMomentum={false}
            dragControls={dragControls}
            dragListener={false}
            className="glass-effect no-select"
            style={{
                position: 'absolute',
                zIndex: 1000,
                display: 'none',
                opacity: 0,
                borderRadius: '24px',
                padding: '6px 12px',
                gap: '4px',
                alignItems: 'center',
                boxShadow: '0 20px 40px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.05)',
                touchAction: 'none'
            }}
        >
            {/* Drag Handle */}
            <div
                onPointerDown={(e) => dragControls.start(e)}
                className="p-2 cursor-grab active:cursor-grabbing text-slate-500 hover:text-blue-400 transition-colors"
                title="Arrastrar herramienta"
            >
                <GripHorizontal size={18} />
            </div>

            <div className="w-[1px] h-6 bg-white/10 mx-1" />

            <ToolbarButton active={isMarkActive(editor, 'bold')} onClick={() => toggleMark('bold')}>
                <Bold size={18} />
            </ToolbarButton>
            <ToolbarButton active={isMarkActive(editor, 'italic')} onClick={() => toggleMark('italic')}>
                <Italic size={18} />
            </ToolbarButton>
            <ToolbarButton active={isMarkActive(editor, 'underline')} onClick={() => toggleMark('underline')}>
                <Underline size={18} />
            </ToolbarButton>
            <ToolbarButton active={isMarkActive(editor, 'code')} onClick={() => toggleMark('code')}>
                <Code size={18} />
            </ToolbarButton>
            <ToolbarButton active={isMarkActive(editor, 'highlight')} onClick={() => toggleMark('highlight')}>
                <Highlighter size={18} />
            </ToolbarButton>
        </motion.div>
    )
}

const ToolbarButton: React.FC<{ onClick: () => void; children: React.ReactNode, active?: boolean }> = ({ onClick, children, active }) => (
    <button
        onMouseDown={e => {
            e.preventDefault()
            onClick()
        }}
        className={clsx(
            "p-3 rounded-xl transition-all duration-200 active:scale-90 touch-target",
            active
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
        )}
    >
        {children}
    </button>
)
