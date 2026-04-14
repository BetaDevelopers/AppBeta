import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import AuthPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PlansPage from './pages/PlansPage';
import { PerfilPage } from './pages/PerfilPage';
import { GuestAuthModal } from './components/auth/GuestAuthModal';

function PrivateRoute({ children }: { children: React.ReactNode }) {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
    const initAuth = useAuthStore((s) => s.initAuth);
    const isInitializing = useAuthStore((s) => s.isInitializing);

    useEffect(() => {
        initAuth();
    }, []);

    if (isInitializing) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-600 border-t-transparent" />
            </div>
        );
    }

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/login" element={<AuthPage />} />
                <Route path="/register" element={<AuthPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/plans" element={<PlansPage />} />
                <Route path="/perfil" element={
                    <PrivateRoute><PerfilPage /></PrivateRoute>
                } />

            </Routes>
            <GuestAuthModal />
        </BrowserRouter>
    );
}
