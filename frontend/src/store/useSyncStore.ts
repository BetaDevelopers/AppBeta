import { create } from 'zustand';

interface SyncStore {
    status: 'synced' | 'syncing' | 'offline' | 'conflict';
    lastSyncedAt: number | null;

    // Actions
    setStatus: (status: 'synced' | 'syncing' | 'offline' | 'conflict') => void;
    syncData: () => Promise<void>;
}

export const useSyncStore = create<SyncStore>((set) => ({
    status: 'synced',
    lastSyncedAt: null,

    setStatus: (status) => set({ status }),

    syncData: async () => {
        set({ status: 'syncing' });
        try {
            // Placeholder for actual Firebase Firestore sync logic
            await new Promise(r => setTimeout(r, 2000));
            set({ status: 'synced', lastSyncedAt: Date.now() });
        } catch (error) {
            set({ status: 'offline' });
        }
    }
}));
