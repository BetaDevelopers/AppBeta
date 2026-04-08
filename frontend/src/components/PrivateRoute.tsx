import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export const PrivateRoute: React.FC = () => {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    
    // Check if token exists in localStorage as a backup check
    const token = localStorage.getItem('beta3m_token');
    
    if (!isAuthenticated && !token) {
        return <Navigate to="/login" replace />;
    }
    
    return <Outlet />;
};
