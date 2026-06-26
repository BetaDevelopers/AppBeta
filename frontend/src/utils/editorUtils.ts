/**
 * Utilitats per interactuar amb l'editor Tiptap i conversió de contingut.
 */

/**
 * Converteix markdown bàsic a HTML compatible amb Tiptap.
 * Suporta títols, negretes, cursives, llistes i paràgrafs.
 */
export const markdownToHtml = (md: string): string => {
    if (!md) return '';
    return md
        // Títols
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        // Format
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/~~(.+?)~~/g, '<s>$1</s>')
        // Llistes desordenades — agrupa els <li> dins <ul>
        .replace(/((?:^- .+\n?)+)/gm, (block) => {
            const items = block
                .trim()
                .split('\n')
                .map((l) => `<li>${l.replace(/^- /, '')}</li>`)
                .join('');
            return `<ul>${items}</ul>`;
        })
        // Llistes numerades
        .replace(/((?:^\d+\. .+\n?)+)/gm, (block) => {
            const items = block
                .trim()
                .split('\n')
                .map((l) => `<li>${l.replace(/^\d+\. /, '')}</li>`)
                .join('');
            return `<ol>${items}</ol>`;
        })
        // Paràgrafs (línies que no comencen per etiqueta HTML o llista)
        .replace(/^(?!<[a-z])(?!- |\d+\. )(.*\S.*)$/gm, '<p>$1</p>')
        // Neteja paràgrafs buits
        .replace(/<p>\s*<\/p>/g, '');
};

/**
 * Insereix contingut a l'editor. Si és Markdown, el converteix primer a HTML.
 */
export const insertContentIntoEditor = (editor: any, content: string, asMarkdown: boolean = false) => {
    if (!editor || !content) return;

    const finalContent = asMarkdown ? markdownToHtml(content) : content;

    editor.chain()
        .focus()
        .insertContent(finalContent)
        .run();
};

/**
 * Insereix una equació LaTeX a l'editor.
 */
export const insertLatexIntoEditor = (editor: any, latex: string) => {
    if (!editor || !latex) return;

    editor.chain()
        .focus()
        .insertContent(`$$${latex}$$`)
        .run();
};
