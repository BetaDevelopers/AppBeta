/**
 * Beta Export Utility
 */
import { NoteDocument } from '@/lib/db';

export const exportToMarkdown = (note: NoteDocument) => {
    const content = `# ${note.title}\n\n${JSON.stringify(note.content)}\n\nTags: ${note.tags.join(', ')}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title}.md`;
    a.click();
    URL.revokeObjectURL(url);
};

export const exportToPDF = (note: NoteDocument) => {
    // Placeholder: In a real app, use jspdf or a specialized library
    console.log('Exporting to PDF:', note.title);
    window.print();
};
