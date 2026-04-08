import { BaseEditor } from 'slate'
import { ReactEditor } from 'slate-react'
import { HistoryEditor } from 'slate-history'

export type BetaElementType =
    | 'paragraph'
    | 'heading-one'
    | 'heading-two'
    | 'heading-three'
    | 'bulleted-list'
    | 'numbered-list'
    | 'list-item'
    | 'code-block'
    | 'math-block'
    | 'math-inline'
    | 'image'
    | 'drawing-canvas'
    | 'table'
    | 'table-row'
    | 'table-cell'
    | 'callout'
    | 'divider';

export type CustomElement = {
    type: BetaElementType
    children: CustomText[]
    url?: string
    latex?: string
    data?: Float32Array
}

export type CustomText = {
    text: string
    bold?: boolean
    italic?: boolean
    underline?: boolean
    code?: boolean
    highlight?: boolean
}

declare module 'slate' {
    interface CustomTypes {
        Editor: BaseEditor & ReactEditor & HistoryEditor
        Element: CustomElement
        Text: CustomText
    }
}
