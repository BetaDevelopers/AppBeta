import { create } from 'zustand';

type AuthModalView = 'selection' | 'login' | 'register';

interface UIStore {
    isAuthModalOpen: boolean;
    authModalView: AuthModalView;
    postAuthAction: (() => void) | null;
    openAuthModal: (view?: AuthModalView, onComplete?: (() => void) | null) => void;
    closeAuthModal: () => void;
    setAuthModalView: (view: AuthModalView) => void;
}

export const useUIStore = create<UIStore>((set) => ({
    isAuthModalOpen: false,
    authModalView: 'selection',
    postAuthAction: null,
    openAuthModal: (view = 'selection', onComplete = null) => set({
        isAuthModalOpen: true,
        authModalView: view,
        postAuthAction: onComplete
    }),
    closeAuthModal: () => set({ isAuthModalOpen: false, postAuthAction: null, authModalView: 'selection' }),
    setAuthModalView: (view) => set({ authModalView: view }),
}));
