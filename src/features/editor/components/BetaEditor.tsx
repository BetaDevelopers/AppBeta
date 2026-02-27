import React, { useMemo, useState, useCallback, useEffect } from 'react'
import { createEditor, Descendant, Editor, Transforms, Range, Element as SlateElement } from 'slate'
import { Slate, Editable, withReact, ReactEditor } from 'slate-react'
import { withHistory } from 'slate-history'
import { FloatingToolbar } from './FloatingToolbar'
import { SlashMenu } from './SlashMenu'
import { MathBlock } from './MathBlock'
import { DrawingCanvas } from './DrawingCanvas'
import { useFilesystemStore } from '../../filesystem/store/useFilesystemStore'

const initialValue: Descendant[] = [
    {
        type: 'paragraph',
        children: [{ text: '' }],
    } as any,
];

export const BetaEditor: React.FC = () => {
    const { activeNoteId, notes, updateNote } = useFilesystemStore()
    const activeNote = useMemo(() => notes.find(n => n.id === activeNoteId), [activeNoteId, notes])

    const [target, setTarget] = useState<Range | null>(null)
    const [search, setSearch] = useState('')
    const editor = useMemo(() => withHistory(withReact(createEditor())), [])

    // Internal state for the editor
    const [value, setValue] = useState<Descendant[]>(initialValue)

    // Sync editor with activeNote when selection changes
    useEffect(() => {
        if (activeNote) {
            // Transform editor content if it's different from stored content
            // Need to handle empty content cases
            const content = (activeNote.content && activeNote.content.length > 0)
                ? activeNote.content as Descendant[]
                : [{ type: 'paragraph', children: [{ text: '' }] } as any]

            // Set local state
            setValue(content)

            // Reset editor state
            editor.children = content
            editor.onChange()
        }
    }, [activeNoteId, editor])

    const renderElement = useCallback((props: any) => {
        switch (props.element.type) {
            case 'heading-one':
                return <h1 {...props.attributes} style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--beta-text-primary)', marginBottom: '1.25rem', marginTop: '2rem', letterSpacing: '-0.03em', lineHeight: 1.15 }}>{props.children}</h1>
            case 'heading-two':
                return <h2 {...props.attributes} style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--beta-text-primary)', marginBottom: '1rem', marginTop: '1.75rem', letterSpacing: '-0.02em' }}>{props.children}</h2>
            case 'heading-three':
                return <h3 {...props.attributes} style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--beta-text-secondary)', marginBottom: '0.75rem', marginTop: '1.5rem' }}>{props.children}</h3>
            case 'math-block':
                return <MathBlock {...props} />
            case 'drawing-canvas':
                return <DrawingCanvas {...props} />
            case 'paragraph':
            default:
                return <p {...props.attributes} style={{ color: 'var(--beta-text-secondary)', lineHeight: 1.8, marginBottom: '1rem', fontSize: '1rem' }}>{props.children}</p>
        }
    }, [])

    const renderLeaf = useCallback((props: any) => {
        let { children, leaf } = props
        if (leaf.bold) children = <strong>{children}</strong>
        if (leaf.italic) children = <em>{children}</em>
        if (leaf.underline) children = <u>{children}</u>
        if (leaf.code) children = <code style={{ background: 'rgba(37,99,235,0.12)', padding: '1px 6px', borderRadius: '4px', color: 'var(--beta-accent)', fontFamily: 'monospace', fontSize: '0.9em' }}>{children}</code>
        if (leaf.highlight) children = <mark style={{ background: 'rgba(37,99,235,0.2)', color: '#93c5fd', borderRadius: '3px', padding: '0 3px' }}>{children}</mark>
        return <span {...props.attributes}>{children}</span>
    }, [])

    const onChange = (val: Descendant[]) => {
        setValue(val)

        // Auto-save logic
        if (activeNoteId) {
            updateNote(activeNoteId, { content: val })
        }

        const { selection } = editor
        if (selection && Range.isCollapsed(selection)) {
            const [start] = Range.edges(selection)
            const wordBefore = Editor.before(editor, start, { unit: 'word' })
            const before = wordBefore && Editor.before(editor, start)
            const beforeRange = before && Editor.range(editor, before, start)
            const beforeText = beforeRange && Editor.string(editor, beforeRange)
            const tagMatch = beforeText && beforeText.match(/^\/(\w+)$/)
            const slashMatch = beforeText && beforeText === '/'

            if (slashMatch) {
                setTarget(beforeRange)
                setSearch('')
                return
            }

            if (tagMatch) {
                setTarget(beforeRange)
                setSearch(tagMatch[1])
                return
            }
        }
        setTarget(null)
    }

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <Slate editor={editor} initialValue={value} onChange={onChange}>
                <FloatingToolbar />
                <SlashMenu target={target} search={search} onClose={() => setTarget(null)} />
                <Editable
                    renderElement={renderElement}
                    renderLeaf={renderLeaf}
                    placeholder="Empieza a escribir… escribe '/' para comandos"
                    className="beta-editor"
                    style={{ minHeight: '60vh', outline: 'none', fontSize: '1rem' }}
                    spellCheck={false}
                />
            </Slate>
        </div>
    )
}
