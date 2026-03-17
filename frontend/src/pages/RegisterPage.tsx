import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export const RegisterPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const register = useAuthStore((s) => s.register);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validations
        if (!email || !password || !confirmPassword) {
            setError('Omple tots els camps');
            return;
        }

        if (password.length < 4) {
            setError('La contrasenya ha de tenir mínim 4 caràcters');
            return;
        }

        if (password !== confirmPassword) {
            setError('Les contrasenyes no coincideixen');
            return;
        }

        setIsLoading(true);
        try {
            await register(email, password);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Error en crear el compte');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-[#048A81] rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
                    <span className="text-white font-bold text-lg">3M</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Beta 3M</h1>
            </div>

            <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-8">
                    <h2 className="text-xl font-semibold text-slate-800 mb-2">Crear compte</h2>
                    <p className="text-slate-500 text-sm mb-6">
                        Ja tens compte? <Link to="/login" className="text-teal-600 font-medium hover:underline">Inicia sessió</Link>
                    </p>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm mb-6 animate-in fade-in slide-in-from-top-1">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="email">
                                Correu electrònic
                            </label>
                            <input
                                id="email"
                                type="email"
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full py-3 px-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                                placeholder="usuari@exemple.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="password">
                                Contrasenya <span className="text-slate-400 font-normal">(Mínim 4 caràcters)</span>
                            </label>
                            <input
                                id="password"
                                type="password"
                                autoComplete="new-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full py-3 px-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                                placeholder="••••••••"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="confirmPassword">
                                Repeteix la contrasenya
                            </label>
                            <input
                                id="confirmPassword"
                                type="password"
                                autoComplete="new-password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full py-3 px-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl shadow-md shadow-teal-600/10 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Creant compte...</span>
                                </>
                            ) : (
                                <span>Crear compte</span>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
