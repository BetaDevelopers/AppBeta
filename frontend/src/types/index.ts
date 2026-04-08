export interface User {
    id: number;
    email: string;
    plan: 'free' | 'pro' | 'premium';
    ai_uses_this_month: number;
    ai_uses_reset_at?: string;
    display_name?: string | null;
    avatar_url?: string | null;
    language?: string | null;
    theme?: string | null;
    onboarding_done?: boolean;
    last_seen_at?: string | null;
    created_at?: string;
}

export interface Subject {
    id: number;
    name: string;
    color: string;
    user_id: number;
    created_at?: string;
}

export interface Note {
    id: number;
    title: string;
    content: string;
    subject_id: number | null;
    subject_name?: string;
    subject_color?: string;
    user_id: number;
    ai_processed: boolean;
    content_plain?: string;
    created_at: string;
    updated_at: string;
}

export interface AuthResponse {
    token: string;
    user: User;
}

export interface UserStats {
    notes: number;
    subjects: number;
    ai_usage: { action: string; total: number; tokens: number | null }[];
    plan: string;
    ai_uses_this_month: number;
    ai_uses_reset_at: string;
}
