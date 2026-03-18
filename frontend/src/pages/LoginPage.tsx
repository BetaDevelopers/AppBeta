import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const login = useAuthStore((s) => s.login);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!email || !password) {
            setError('Introduce tu correo y contraseña');
            return;
        }

        setLoading(true);
        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Credenciales incorrectas');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center p-4">
            <div className="w-full max-w-[460px] bg-[#0f172a] rounded-[48px] shadow-2xl border border-white/5 p-8 sm:p-14">
                <div className="text-center mb-12">
                    <div className="inline-flex w-24 h-24 bg-blue-600 rounded-[32px] items-center justify-center mb-10 shadow-3xl shadow-blue-600/40 ring-12 ring-blue-600/5 relative">
                        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.286L11 21l-2.286-6.857L1 12l7.714-2.286L11 3z" />
                        </svg>
                        <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 -z-10" />
                    </div>
                    <h1 className="text-4xl font-bold text-white tracking-tight mb-4">Bienvenido a Beta 3M</h1>
                    <p className="text-slate-500 text-lg font-medium">Ingresa a tu cuenta para continuar</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 text-red-400 p-4 rounded-2xl text-sm mb-10 border border-red-500/20 animate-pulse">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-8">
                    <Input
                        label="Correo Electrónico"
                        type="email"
                        placeholder="estudiante@ejemplo.com"
                        value={email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    />
                    <Input
                        label="Contraseña"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    />

                    <div className="pt-4">
                        <Button type="submit" loading={loading} className="w-full gap-4 text-xl h-16 rounded-2xl shadow-2xl shadow-blue-600/30">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M11 16l4-4m0 0l-4-4m4 4H4m13 4h1a2 2 0 002-2V7a2 2 0 00-2-2h-1" />
                            </svg>
                            Acceder
                        </Button>
                    </div>
                </form>

                <div className="text-center mt-12">
                    <p className="text-slate-600 text-sm font-semibold">
                        ¿No tienes cuenta?{' '}
                        <Link to="/register" className="text-blue-500 hover:text-blue-400 transition-all">
                            Regístrate gratis
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
