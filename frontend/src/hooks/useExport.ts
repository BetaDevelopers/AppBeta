import JSZip from 'jszip';
import { NoteDocument, Subject } from '@/lib/db';
import { Text } from 'slate';

export const useExport = () => {

    // Simple Slate to Markdown converter
    const serializeToMarkdown = (nodes: any[]): string => {
        return nodes.map(n => {
            if (Text.isText(n)) {
                let text = n.text;
                if ((n as any).bold) text = `**${text}**`;
                if ((n as any).italic) text = `*${text}*`;
                if ((n as any).code) text = `\`${text}\``;
                return text;
            }

            const children = n.children ? serializeToMarkdown(n.children) : '';

            switch (n.type) {
                case 'heading-one': return `# ${children}\n\n`;
                case 'heading-two': return `## ${children}\n\n`;
                case 'heading-three': return `### ${children}\n\n`;
                case 'paragraph': return `${children}\n\n`;
                case 'math-block': return `\n$$\n${(n as any).latex || ''}\n$$\n\n`;
                case 'drawing-canvas': return `\n> [Dibujo/Canvas omitido en exportación de texto]\n\n`;
                default: return children;
            }
        }).join('');
    };

    const downloadFile = (filename: string, content: string, type: string) => {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    };

    const exportNoteAsMarkdown = (note: NoteDocument) => {
        const content = serializeToMarkdown(note.content as any[]);
        downloadFile(`${note.title}.md`, `# ${note.title}\n\n${content}`, 'text/markdown');
    };

    const exportNoteAsPDF = () => {
        // We use the browser's native print engine for perfect PDF fidelity.
        // The @media print styles in index.css handle the document layout.
        window.print();
    };

    const exportSubjectAsZip = async (subject: Subject, notes: NoteDocument[]) => {
        const zip = new JSZip();
        const subjectFolder = zip.folder(subject.name);

        notes.forEach(note => {
            const content = serializeToMarkdown(note.content as any[]);
            subjectFolder?.file(`${note.title}.md`, `# ${note.title}\n\n${content}`);
        });

        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${subject.name}.zip`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return {
        exportNoteAsMarkdown,
        exportNoteAsPDF,
        exportSubjectAsZip
    };
};
