import { useAuthStore } from '../store/authStore';

export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = useAuthStore.getState().token;

    let res: Response;
    try {
        res = await fetch(`${BASE_URL}${path}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...options.headers,
            },
        });
    } catch (err) {
        if (err instanceof TypeError) {
            throw new Error('No se puede conectar al servidor. Comprueba tu conexión.');
        }
        throw err;
    }

    if (res.status === 401) {
        const err = await res.json().catch(() => ({}));
        if (token) {
            useAuthStore.getState().logout();
            throw new Error('Sessió expirada');
        }
        throw new Error(err.error || 'Credencials incorrectes');
    }

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const error = new Error(err.error || 'Error del servidor');
        (error as any).code = err.code;
        throw error;
    }

    return res.json();
}

export const apiClient = {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
    put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
    delete: <T>(path: string, body?: unknown) => request<T>(path, {
        method: 'DELETE',
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }),
};
