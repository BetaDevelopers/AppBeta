import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const register = useAuthStore((s) => s.register);
    const navigate = useNavigate();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!email || !password || !confirmPassword) {
            setError('Omple tots els camps');
            return;
        }

        if (password.length < 8) {
            setError('La contraseña debe tener mínimo 8 caracteres');
            return;
        }

        if (password !== confirmPassword) {
            setError('Les contrasenyes no coincideixen');
            return;
        }

        setLoading(true);
        try {
            await register(email, password);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Error en crear el compte');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center p-4">
            <div className="w-full max-w-[440px] bg-[#0f172a] rounded-[32px] shadow-2xl border border-white/5 p-8 sm:p-12">
                <div className="text-center mb-10">
                    <div className="inline-flex w-16 h-16 bg-blue-600 rounded-2xl items-center justify-center mb-6 shadow-xl shadow-blue-600/20 ring-4 ring-blue-600/10">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight leading-tight">Crea tu cuenta</h1>
                    <p className="text-slate-400 text-base mt-3">Empieza a digitalizar tus apuntes ahora</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 text-red-400 p-4 rounded-xl text-sm mb-8 border border-red-500/20">
                        {error}
                    </div>
                )}

                <form onSubmit={handleRegister} className="space-y-6">
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
                        placeholder="Mínimo 8 caracteres"
                        value={password}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    />
                    <Input
                        label="Confirmar Contraseña"
                        type="password"
                        placeholder="Repite tu contraseña"
                        value={confirmPassword}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                    />

                    <div className="pt-2">
                        <Button type="submit" loading={loading} className="w-full gap-3 text-lg h-14">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                            Crear cuenta
                        </Button>
                    </div>
                </form>

                <div className="text-center mt-8">
                    <p className="text-slate-500 text-sm">
                        ¿Ya tienes cuenta?{' '}
                        <Link to="/login" className="text-blue-500 font-bold hover:text-blue-400 transition-colors">
                            Inicia sesión
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
