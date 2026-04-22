import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ChartBlockView } from './ChartBlockView';

export const ChartBlock = Node.create({
    name: 'chartBlock',
    group: 'block',
    atom: true,
    draggable: false, // we handle movement ourselves via tx/ty
    priority: 1000,

    addAttributes() {
        return {
            src:   { default: null },
            alt:   { default: '' },
            width: {
                default: 500,
                parseHTML: el => parseInt((el as HTMLElement).dataset.chartWidth || '') || 500,
            },
            tx: {
                default: 0,
                parseHTML: el => parseInt((el as HTMLElement).dataset.chartTx || '0') || 0,
                renderHTML: attrs => ({ 'data-chart-tx': String(attrs.tx ?? 0) }),
            },
            ty: {
                default: 0,
                parseHTML: el => parseInt((el as HTMLElement).dataset.chartTy || '0') || 0,
                renderHTML: attrs => ({ 'data-chart-ty': String(attrs.ty ?? 0) }),
            },
        };
    },

    parseHTML() {
        return [{
            tag: 'img[alt^="CHART:"]',
            getAttrs: (el) => {
                const img = el as HTMLImageElement;
                return {
                    src:   img.src,
                    alt:   img.alt,
                    width: parseInt(img.dataset.chartWidth || '') || 500,
                    tx:    parseInt(img.dataset.chartTx || '0') || 0,
                    ty:    parseInt(img.dataset.chartTy || '0') || 0,
                };
            },
        }];
    },

    renderHTML({ HTMLAttributes }) {
        const { width, src, alt, tx, ty } = HTMLAttributes;
        const translateStyle = (tx || ty)
            ? `transform:translate(${tx || 0}px,${ty || 0}px);`
            : '';
        return ['img', mergeAttributes({
            src, alt,
            'data-chart-width': String(width || 500),
            'data-chart-tx':    String(tx ?? 0),
            'data-chart-ty':    String(ty ?? 0),
            style: `width:${width || 500}px;max-width:100%;border-radius:12px;display:block;margin:16px auto;cursor:grab;${translateStyle}`,
        })];
    },

    addNodeView() {
        return ReactNodeViewRenderer(ChartBlockView);
    },
});
