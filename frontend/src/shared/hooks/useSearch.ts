import { useMemo } from 'react';
import Fuse from 'fuse.js';
import { NoteDocument } from '@/lib/db';

export const useSearch = (notes: NoteDocument[]) => {
    const fuse = useMemo(() => new Fuse(notes, {
        keys: ['title', 'tags'],
        threshold: 0.3,
        includeMatches: true
    }), [notes]);

    const search = (query: string) => {
        if (!query) return notes;
        return fuse.search(query).map(result => result.item);
    };

    return { search };
};
