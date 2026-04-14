import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';

export const PrivateRoute: React.FC = () => {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const openAuthModal = useUIStore((state) => state.openAuthModal);

    // Check if token exists in localStorage as a backup check
    const token = localStorage.getItem('beta3m_token');

    if (!isAuthenticated && !token) {
        // En lugar de redirigir a /login, abrimos el modal y redirigimos a dashboard
        // para que el usuario no se quede en una página vacía
        setTimeout(() => openAuthModal('selection'), 0);
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};
