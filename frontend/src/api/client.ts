import { useAuthStore } from '../store/authStore';

export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = useAuthStore.getState().token;

    const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

    if (res.status === 401) {
        useAuthStore.getState().logout();
        // No redirigimos automáticamente a /login para permitir el Modo Invitado.
        // Las rutas protegidas (PrivateRoute) se encargarán de pedir login si es necesario.
        throw new Error('Sessió expirada');
    }

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error del servidor');
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
