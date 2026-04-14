import { create } from 'zustand';
import { apiClient } from '../api/client';
import { db } from '../db/dexie';
import type { Subject } from '../types';
import { useAuthStore } from './authStore';

interface SubjectsStore {
    subjects: Subject[];
    isLoading: boolean;
    fetchSubjects: () => Promise<void>;
    createSubject: (name: string, color: string) => Promise<void>;
    updateSubject: (id: number, name: string, color: string) => Promise<void>;
    deleteSubject: (id: number) => Promise<void>;
    cleanup: () => void;
}

export const useSubjectsStore = create<SubjectsStore>((set) => ({
    subjects: [],
    isLoading: false,

    fetchSubjects: async () => {
        set({ isLoading: true });
        try {
            if (useAuthStore.getState().isGuest) throw new Error('Guest mode');
            const subjects = await apiClient.get<Subject[]>('/subjects');
            await db.subjects.bulkPut(subjects);
            set({ subjects, isLoading: false });
        } catch {
            const userId = useAuthStore.getState().user?.id || 0;
            const cached = await db.subjects.where('user_id').equals(userId).toArray();
            set({ subjects: cached, isLoading: false });
        }
    },

    createSubject: async (name, color) => {
        const subject = await apiClient.post<Subject>('/subjects', { name, color });
        await db.subjects.put(subject);
        set((s) => ({ subjects: [...s.subjects, subject] }));
    },

    updateSubject: async (id, name, color) => {
        const updated = await apiClient.put<Subject>(`/subjects/${id}`, { name, color });
        await db.subjects.put(updated);
        set((s) => ({ subjects: s.subjects.map((sub) => (sub.id === id ? updated : sub)) }));
    },

    deleteSubject: async (id) => {
        await apiClient.delete(`/subjects/${id}`);
        await db.subjects.delete(id);
        set((s) => ({ subjects: s.subjects.filter((sub) => sub.id !== id) }));
    },

    cleanup: () => {
        set({ subjects: [], isLoading: false });
    },
}));
