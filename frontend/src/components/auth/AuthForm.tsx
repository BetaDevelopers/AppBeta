import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface AuthFormProps {
    isRegisterInitial?: boolean;
    onSuccess: () => void;
    onToggleView?: (isRegister: boolean) => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ isRegisterInitial = false, onSuccess, onToggleView }) => {
    const { login, register, resendVerification } = useAuthStore();
    const [isRegister, setIsRegister] = useState(isRegisterInitial);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showVerificationSent, setShowVerificationSent] = useState(false);
    const [isUnverified, setIsUnverified] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!email || !password || (isRegister && !confirmPassword)) {
            setError('Por favor, rellena todos los campos');
            return;
        }

        if (isRegister && password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setLoading(true);
        setIsUnverified(false);
        try {
            if (isRegister) {
                await register(email, password);
                if (useAuthStore.getState().isAuthenticated) {
                    onSuccess();
                } else {
                    setShowVerificationSent(true);
                }
            } else {
                await login(email, password);
                onSuccess();
            }
        } catch (err: any) {
            setError(err.message || 'Error en la autenticación');
            if (err.code === 'EMAIL_NOT_VERIFIED') {
                setIsUnverified(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResendVerification = async () => {
        if (!email) return;
        setResendLoading(true);
        setError(null);
        try {
            await resendVerification(email);
            setResendSuccess(true);
            setTimeout(() => setResendSuccess(false), 5000);
        } catch (err: any) {
            setError(err.message || 'Error al reenviar email');
        } finally {
            setResendLoading(false);
        }
    };

    const toggleView = () => {
        const newState = !isRegister;
        setIsRegister(newState);
        setError(null);
        if (onToggleView) onToggleView(newState);
    };

    if (showVerificationSent) {
        return (
            <div className="w-full max-w-[440px] text-center animate-in fade-in zoom-in-95 duration-500">
                <div className="inline-flex w-24 h-24 bg-gradient-to-br from-green-600 to-emerald-600 rounded-[32px] items-center justify-center mb-8 shadow-2xl shadow-green-600/30 ring-8 ring-green-600/10">
                    <span className="text-5xl">📧</span>
                </div>
                <h2 className="text-4xl font-black text-white tracking-tight mb-4 font-display">
                    ¡Revisa tu email!
                </h2>
                <p className="text-slate-400 text-lg font-medium mb-8 leading-relaxed">
                    Te hemos enviado un enlace de confirmación a <br />
                    <span className="text-white font-bold">{email}</span>
                </p>
                <div className="space-y-4">
                    <Button
                        onClick={() => setShowVerificationSent(false)}
                        className="w-full h-14 font-bold rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all"
                    >
                        Volver al inicio
                    </Button>
                    <p className="text-sm text-slate-500 font-medium">
                        ¿No lo encuentras?
                        <button
                            onClick={handleResendVerification}
                            disabled={resendLoading}
                            className="ml-2 text-blue-500 font-bold hover:text-blue-400 transition-colors underline decoration-2 underline-offset-4"
                        >
                            {resendLoading ? 'Reenviando...' : 'Reenviar email'}
                        </button>
                    </p>
                </div>
                {resendSuccess && (
                    <div className="mt-6 text-green-400 text-sm font-bold animate-in slide-in-from-bottom-2">
                        ✓ Nuevo enlace enviado correctamente
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="w-full max-w-[440px] animate-in fade-in zoom-in-95 duration-300">
            {/* Header Section */}
            <div className="text-center mb-10">
                <div className="inline-flex w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-[28px] items-center justify-center mb-6 shadow-2xl shadow-blue-600/30 ring-8 ring-blue-600/10">
                    <svg className="w-10 h-10 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <h2 className="text-4xl font-black text-white tracking-tight mb-3 font-display">
                    {isRegister ? 'Crea tu cuenta' : 'Bienvenido'}
                </h2>
                <p className="text-slate-400 text-base font-medium">
                    {isRegister ? 'Guarda tus apuntes en la nube y usa la IA' : 'Accede a tu biblioteca inteligente'}
                </p>
            </div>

            {/* Form Section */}
            <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[13px] p-4 rounded-2xl font-bold flex flex-col gap-3 animate-in slide-in-from-top-2">
                        <div className="flex items-start gap-3">
                            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{error}</span>
                        </div>

                        {isUnverified && (
                            <button
                                type="button"
                                onClick={handleResendVerification}
                                disabled={resendLoading}
                                className="text-blue-500 hover:text-blue-400 transition-colors text-xs font-black uppercase tracking-widest text-left pl-7"
                            >
                                {resendLoading ? 'Procesando...' : 'Reenviar enlace de confirmación'}
                            </button>
                        )}

                        {resendSuccess && !isUnverified && (
                            <span className="text-green-400 text-xs font-black uppercase tracking-widest pl-7">✓ Reenviado</span>
                        )}
                    </div>
                )}

                {resendSuccess && isUnverified && (
                    <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-[13px] p-4 rounded-2xl font-bold flex items-center gap-3 animate-in slide-in-from-top-2">
                        <span className="text-lg">✓</span>
                        <span>Enlace de confirmación reenviado a {email}</span>
                    </div>
                )}

                <div className="space-y-4">
                    <Input
                        label="CORREO ELECTRÓNICO"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nombre@correo.com"
                        className="h-14 bg-white/5 border-white/10 focus:bg-white/10 text-white placeholder:text-slate-600 rounded-2xl"
                    />
                    <Input
                        label="CONTRASEÑA"
                        type="password"
                        required
                        autoComplete={isRegister ? 'new-password' : 'current-password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-14 bg-white/5 border-white/10 focus:bg-white/10 text-white placeholder:text-slate-600 rounded-2xl"
                    />
                    {isRegister && (
                        <Input
                            label="CONFIRMAR CONTRASEÑA"
                            type="password"
                            required
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            className="h-14 bg-white/5 border-white/10 focus:bg-white/10 text-white placeholder:text-slate-600 rounded-2xl animate-in slide-in-from-top-2"
                        />
                    )}
                </div>

                <div className="pt-4">
                    <Button
                        type="submit"
                        loading={loading}
                        className="w-full h-16 text-xl font-bold rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-2xl hover:shadow-blue-500/40 transition-all active:scale-[0.98]"
                    >
                        {isRegister ? 'Unirse ahora' : 'Entrar'}
                    </Button>
                </div>
            </form>

            <div className="text-center mt-8">
                <p className="text-sm text-slate-500 font-medium">
                    {isRegister ? '¿Ya eres miembro?' : '¿No tienes cuenta?'}
                    <button
                        type="button"
                        onClick={toggleView}
                        className="ml-2 text-blue-500 font-bold hover:text-blue-400 transition-colors underline decoration-2 underline-offset-4"
                    >
                        {isRegister ? 'Inicia sesión' : 'Regístrate gratis'}
                    </button>
                </p>
            </div>
        </div>
    );
};
