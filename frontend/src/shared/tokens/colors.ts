/**
 * The Lawin Design System - Color Tokens
 */
export const BetaColors = {
    primary: {
        50: '#f5f3ff',
        100: '#ede9fe',
        500: '#8b5cf6',
        600: '#7c3aed',
        700: '#6d28d9',
    },
    background: {
        light: '#ffffff',
        dark: '#0f172a',
        card: '#1e293b',
    },
    text: {
        light: {
            primary: '#0f172a',
            secondary: '#475569',
            muted: '#94a3b8',
        },
        dark: {
            primary: '#f8fafc',
            secondary: '#cbd5e1',
            muted: '#64748b',
        }
    },
    border: {
        light: '#e2e8f0',
        dark: '#334155',
    },
    status: {
        error: '#ef4444',
        success: '#22c55e',
        warning: '#f59e0b',
        info: '#3b82f6',
    }
} as const;
