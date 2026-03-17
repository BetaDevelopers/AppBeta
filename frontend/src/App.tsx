import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { BetaProvider } from './shared/components/BetaProvider'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { PerfilPage } from './pages/PerfilPage'
import { PrivateRoute } from './components/PrivateRoute'

const App: React.FC = () => {
    return (
        <BetaProvider>
            <Router>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />

                    {/* Protected Routes */}
                    <Route element={<PrivateRoute />}>
                        <Route path="/dashboard" element={<DashboardPage />} />
                        <Route path="/perfil" element={<PerfilPage />} />
                    </Route>

                    {/* Redirect root to dashboard (will let PrivateRoute handle auth check) */}
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </Router>
        </BetaProvider>
    )
}

export default App
