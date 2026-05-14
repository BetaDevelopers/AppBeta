import Dexie from 'dexie';
import type { Note, Subject } from '../types';
import type { FloatingObject } from '../types/canvas';

interface NoteHistoryRecord {
    noteId: string;
    stack: FloatingObject[][];
}

class Beta3MDatabase extends Dexie {
    notes!: Dexie.Table<Note, number>;
    subjects!: Dexie.Table<Subject, number>;
    noteHistory!: Dexie.Table<NoteHistoryRecord, string>;

    constructor() {
        super('beta3m_db');
        this.version(1).stores({
            notes: '++id, title, subject_id, user_id, updated_at',
            subjects: '++id, name, user_id',
        });
        this.version(2).stores({
            noteHistory: 'noteId',
        });
    }
}

export const db = new Beta3MDatabase();
