import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Document {
    id: string;
    name: string;
    isFolder: boolean;
    parentId: string | null;
    children?: Document[];
    content?: string; // For documents
}

interface FileSystemState {
    documents: Document[];
    addDocument: (doc: Omit<Document, 'id'>) => void;
    removeDocument: (id: string) => void;
    renameDocument: (id: string, newName: string) => void;
    moveDocument: (id: string, newParentId: string | null) => void;
}

export const useFileSystem = create<FileSystemState>()(
    persist(
        (set) => ({
            documents: [
                { id: 'root', name: 'Mis Asignaturas', isFolder: true, parentId: null, children: [] }
            ],
            addDocument: (doc) => set((state) => ({
                documents: [...state.documents, { ...doc, id: Math.random().toString(36).substr(2, 9) }]
            })),
            removeDocument: (id) => set((state) => ({
                documents: state.documents.filter(d => d.id !== id)
            })),
            renameDocument: (id, newName) => set((state) => ({
                documents: state.documents.map(d => d.id === id ? { ...d, name: newName } : d)
            })),
            moveDocument: (id, newParentId) => set((state) => ({
                documents: state.documents.map(d => d.id === id ? { ...d, parentId: newParentId } : d)
            })),
        }),
        {
            name: 'gemini-filesystem',
        }
    )
)
