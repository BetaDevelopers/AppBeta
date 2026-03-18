import Dexie from 'dexie';
import type { Note, Subject } from '../types';

class Beta3MDatabase extends Dexie {
    notes!: Dexie.Table<Note, number>;
    subjects!: Dexie.Table<Subject, number>;

    constructor() {
        super('beta3m_db');
        this.version(1).stores({
            notes: '++id, title, subject_id, user_id, updated_at',
            subjects: '++id, name, user_id',
        });
    }
}

export const db = new Beta3MDatabase();
