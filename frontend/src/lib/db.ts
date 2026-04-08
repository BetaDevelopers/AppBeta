import Dexie, { Table } from 'dexie';

export interface Workspace {
    id: string;
    name: string;
    createdAt: number;
    updatedAt: number;
    ownerId: string;
}

export interface Subject {
    id: string;
    workspaceId: string;
    name: string;
    color: string;
    icon: string;
    order: number;
    createdAt: number;
}

export interface NoteDocument {
    id: string;
    subjectId: string;
    title: string;
    content: any; // Slate.js serialized value
    tags: string[];
    isPinned: number; // 0 or 1 for indexing
    isTrashed: number;
    wordCount: number;
    createdAt: number;
    updatedAt: number;
    syncedAt: number | null;
}

export class BetaDatabase extends Dexie {
    workspaces!: Table<Workspace>;
    subjects!: Table<Subject>;
    notes!: Table<NoteDocument>;

    constructor() {
        super('BetaDB');
        this.version(1).stores({
            workspaces: 'id, name',
            subjects: 'id, workspaceId, name, order',
            notes: 'id, subjectId, title, isPinned, isTrashed, createdAt'
        });
    }
}

export const db = new BetaDatabase();

/** Ensures the default workspace exists on first run. */
export const bootstrapDB = async () => {
    const existing = await db.workspaces.get('default-workspace');
    if (!existing) {
        await db.workspaces.add({
            id: 'default-workspace',
            name: 'Mi Espacio',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            ownerId: 'local',
        });
    }
};
