import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import PlansPage from './pages/PlansPage';

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
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/dashboard" element={
                    <PrivateRoute><DashboardPage /></PrivateRoute>
                } />
                <Route path="/plans" element={
                    <PrivateRoute><PlansPage /></PrivateRoute>
                } />

            </Routes>
        </BrowserRouter>
    );
}
