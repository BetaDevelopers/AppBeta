import { create } from 'zustand';

type AuthModalView = 'selection' | 'login' | 'register';
export type Theme = 'dark' | 'light';

interface UIStore {
    isAuthModalOpen: boolean;
    authModalView: AuthModalView;
    postAuthAction: (() => void) | null;
    theme: Theme;
    openAuthModal: (view?: AuthModalView, onComplete?: (() => void) | null) => void;
    closeAuthModal: () => void;
    setAuthModalView: (view: AuthModalView) => void;
    toggleTheme: () => void;
}

export function applyTheme(theme: Theme) {
    document.documentElement.classList.toggle('light', theme === 'light');
}

const savedTheme = (localStorage.getItem('beta-theme') as Theme) ?? 'dark';

export const useUIStore = create<UIStore>((set) => ({
    isAuthModalOpen: false,
    authModalView: 'selection',
    postAuthAction: null,
    theme: savedTheme,
    openAuthModal: (view = 'selection', onComplete = null) => set({
        isAuthModalOpen: true,
        authModalView: view,
        postAuthAction: onComplete
    }),
    closeAuthModal: () => set({ isAuthModalOpen: false, postAuthAction: null, authModalView: 'selection' }),
    setAuthModalView: (view) => set({ authModalView: view }),
    toggleTheme: () => set(state => {
        const next: Theme = state.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('beta-theme', next);
        applyTheme(next);
        return { theme: next };
    }),
}));
