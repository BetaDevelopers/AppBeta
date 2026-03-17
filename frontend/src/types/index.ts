export interface User {
    id: number;
    email: string;
}

export interface AuthResponse {
    token: string;
    user: User;
}

export interface Note {
    id: number;
    title: string;
    content: string;
    subject_id: number | null;
    ai_processed: boolean;
    created_at: string;
    updated_at: string;
}

export interface Subject {
    id: number;
    name: string;
    color: string;
    user_id: number;
}
