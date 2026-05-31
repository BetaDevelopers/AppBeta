import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { FileText, Crown, Hand, Check, X, Star } from 'lucide-react';
import { BetaLogo } from '../components/ui/BetaLogo';

const PLANS = [
    {
        id: 'free',
        name: 'Free',
        monthlyPrice: '0€',
        yearlyPrice: '0€',
        period: 'per sempre',
        icon: <FileText size={24} className="opacity-80" />,
        color: 'gray',
        colorClass: 'border-white/5 hover:border-white/10',
        badgeClass: '',
        textClass: 'text-gray-400',
        btnClass: 'bg-white/5 text-gray-400 border border-white/5 cursor-default hover:bg-white/10 transition-colors',
        btnText: 'Pla actual',
        btnDisabled: true,
        features: [
            { text: 'Fins a 10 notes', ok: true },
            { text: 'Fins a 2 assignatures', ok: true },
            { text: 'Editor rich text bàsic', ok: true },
            { text: 'Sync entre dispositius', ok: false },
            { text: 'Intel·ligència artificial', ok: false },
            { text: 'Mode offline', ok: false },
            { text: 'Exportar a PDF', ok: false },
            { text: 'Suport prioritari', ok: false },
        ],
    },
    {
        id: 'pro',
        name: 'Pro',
        monthlyPrice: '4,99€',
        yearlyPrice: '3,99€',
        period: '/mes',
        icon: <Star size={24} className="fill-blue-500 text-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />,
        recommended: true,
        color: 'blue',
        colorClass: 'border-blue-500/40 bg-blue-900/10 shadow-[0_0_40px_rgba(37,99,235,0.15)] ring-1 ring-blue-500/20',
        textClass: 'text-blue-400',
        btnClass: 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]',
        btnText: 'Pròximament',
        btnDisabled: true,
        features: [
            { text: 'Notes il·limitades', ok: true },
            { text: 'Assignatures il·limitades', ok: true },
            { text: 'Editor rich text complet', ok: true },
            { text: 'Sync entre dispositius', ok: true },
            { text: '50 optimitzacions IA/mes', ok: true },
            { text: 'Mode offline', ok: true },
            { text: 'Exportar a PDF', ok: true },
            { text: 'Suport prioritari', ok: false },
        ],
    },
    {
        id: 'premium',
        name: 'Premium',
        monthlyPrice: '9,99€',
        yearlyPrice: '7,99€',
        period: '/mes',
        icon: <Crown size={24} className="fill-purple-500 text-purple-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]" />,
        color: 'purple',
        colorClass: 'border-purple-500/20 hover:border-purple-500/40 bg-purple-900/5',
        textClass: 'text-purple-400',
        btnClass: 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]',
        btnText: 'Pròximament',
        btnDisabled: true,
        features: [
            { text: 'Tot de Pro inclòs', ok: true },
            { text: 'IA il·limitada', ok: true },
            { text: 'IA prioritària (ultra ràpida)', ok: true },
            { text: 'Exportar PDF + Word + Markdown', ok: true },
            { text: 'Suport prioritari 24/7', ok: true },
            { text: 'Accés anticipat a novetats', ok: true },
            { text: 'Temes i colors personalitzats', ok: true },
            { text: 'OCR: foto → apunts', ok: true },
        ],
    },
];

export default function PlansPage() {
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    const [yearly, setYearly] = useState(false);

    return (
        <div className="relative min-h-[100vh] bg-[#030712] text-white overflow-x-hidden selection:bg-blue-500/30 overflow-y-auto">
            {/* Background elements (Glassmorphism beams) */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-10%] right-[10%] w-[600px] h-[600px] bg-blue-600/10 blur-[130px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[10%] w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full" />
                <div className="absolute top-[40%] left-[50%] w-[800px] h-[400px] bg-emerald-600/5 blur-[150px] rounded-full -translate-x-1/2" />
                {/* Subtle grid pattern */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djI2aDJWMzRoMjZ2LTJoLTI2VjBoLTJ2MjZIMHYyaDI2djZoMTBoLTh6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20 mask-image:linear-gradient(to_bottom,white,transparent)]" />
            </div>

            {/* Header */}
            <div className="border-b border-white/5 px-8 py-5 flex items-center justify-between sticky top-0 bg-[#030712]/60 backdrop-blur-2xl z-[100]">
                <div className="flex items-center gap-8">
                    <button onClick={() => navigate(-1)}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all group">
                        <span className="group-hover:-translate-x-1 transition-transform">←</span>
                    </button>
                    <div className="flex items-center gap-3">
                        <BetaLogo className="w-8 h-8 rounded-lg shadow-lg shadow-blue-500/20" />
                        <span className="font-extrabold text-[15px] tracking-[0.2em] uppercase opacity-90">BETA 3M</span>
                    </div>
                </div>

                <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">{user?.email}</span>
                </div>
            </div>

            {/* Content Container */}
            <div className="relative z-10 w-full">
                {/* Hero */}
                <div className="text-center pt-24 pb-20 px-6 max-w-4xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-white/10
                            rounded-full text-xs font-black text-slate-300 mb-8 uppercase tracking-[0.2em] shadow-2xl backdrop-blur-md">
                        Hola, {user?.email?.split('@')[0] || 'Invitado'} <Hand size={14} className="text-yellow-500" />
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-br from-white via-slate-200 to-slate-500 bg-clip-text text-transparent tracking-tighter drop-shadow-sm">
                        Potencia els teus apunts
                    </h1>
                    <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-medium">
                        Tria la llicència que millor s'adapti a tu. Digitalitza matemàtiques, apunts i gràfics en mil·lisegons.
                    </p>

                    {/* Toggle mensual/anual */}
                    <div className="flex items-center justify-center gap-2 mt-12 bg-white/5 p-1.5 rounded-full w-fit mx-auto border border-white/10 backdrop-blur-xl shadow-2xl">
                        <button
                            onClick={() => setYearly(false)}
                            className={`px-8 py-3 rounded-full text-sm font-bold transition-all duration-300 ${!yearly ? 'bg-[#1e293b] text-white shadow-lg border border-white/10' : 'text-slate-400 hover:text-white'}`}
                        >
                            Mensual
                        </button>
                        <button
                            onClick={() => setYearly(true)}
                            className={`px-8 py-3 rounded-full text-sm font-bold transition-all duration-300 relative ${yearly ? 'bg-[#1e293b] text-white shadow-lg border border-white/10' : 'text-slate-400 hover:text-white'}`}
                        >
                            Anual
                            <span className="absolute -top-3 -right-3 px-2.5 py-1 bg-gradient-to-r from-emerald-400 to-emerald-500 text-black text-[9px] rounded-full font-black shadow-xl animate-bounce">
                                ESTALVIA 20%
                            </span>
                        </button>
                    </div>
                </div>

                {/* Grid de plans */}
                <div className="max-w-6xl mx-auto px-6 pb-24 grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch pt-4">
                    {PLANS.map((plan) => (
                        <div key={plan.id}
                            className={`group relative flex flex-col rounded-[2.5rem] p-10 transition-all duration-500
                                bg-[#0a0f1a]/80 backdrop-blur-xl border ${plan.colorClass}
                                hover:-translate-y-2
                            `}
                        >
                            {/* Hover glow */}
                            <div className={`absolute inset-0 rounded-[2.5rem] bg-gradient-to-b opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none
                                ${plan.id === 'pro' ? 'from-blue-400 to-transparent' : plan.id === 'premium' ? 'from-purple-400 to-transparent' : 'from-white to-transparent'}`} />

                            {/* Badge recomanat */}
                            {plan.recommended && (
                                <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-20">
                                    <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white text-[10px] font-black uppercase tracking-[0.2em]
                                     px-6 py-2 rounded-full shadow-[0_10px_30px_rgba(37,99,235,0.5)] border border-blue-400/30 flex items-center gap-1.5">
                                        <Star size={12} className="fill-white" />
                                        Més Popular
                                    </div>
                                </div>
                            )}

                            {/* Icona i preu */}
                            <div className="mb-10 relative z-10">
                                <div className={`w-14 h-14 mb-8 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110 shadow-xl
                                    ${plan.id === 'pro' ? 'bg-blue-500/10 border border-blue-500/20' : plan.id === 'premium' ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-white/5 border border-white/10'}`}>
                                    {plan.icon}
                                </div>
                                <h3 className="text-2xl font-black text-white mb-3 tracking-wide">{plan.name} plan</h3>
                                <div className="flex items-baseline gap-2">
                                    <span className={`text-6xl font-black tracking-tighter ${plan.textClass}`}>
                                        {yearly ? plan.yearlyPrice : plan.monthlyPrice}
                                    </span>
                                    {plan.monthlyPrice !== '0€' && (
                                        <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">{plan.period}</span>
                                    )}
                                </div>
                                {plan.id !== 'free' && !yearly && (
                                    <div className="min-h-[20px] mt-2">
                                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black bg-white/5 text-slate-400 uppercase tracking-widest border border-white/10">
                                            Facturació mensual
                                        </span>
                                    </div>
                                )}
                                {plan.id !== 'free' && yearly && (
                                    <div className="min-h-[20px] mt-2">
                                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/10 text-emerald-400 uppercase tracking-widest border border-emerald-500/20">
                                            Facturació anual (Estalvies 20%)
                                        </span>
                                    </div>
                                )}
                                {plan.id === 'free' && (
                                    <div className="min-h-[20px] mt-2" />
                                )}
                            </div>

                            {/* Features */}
                            <ul className="flex-1 space-y-4 mb-12 relative z-10">
                                {plan.features.map((f, i) => (
                                    <li key={i} className="flex items-center gap-4">
                                        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-black
                        ${f.ok ? 'bg-emerald-500/10 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-white/5 text-slate-600'}`}>
                                            {f.ok ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
                                        </div>
                                        <span className={`text-sm font-bold
                        ${f.ok ? 'text-slate-200' : 'text-slate-600'}`}>
                                            {f.text}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            {/* CTA */}
                            <button
                                disabled={plan.btnDisabled}
                                className={`relative z-10 w-full py-5 rounded-[1.25rem] font-black text-sm uppercase tracking-[0.1em]
                    transition-all active:scale-95 ${plan.btnClass} ${!plan.btnDisabled && 'hover:shadow-2xl'}`}
                            >
                                {plan.btnText}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="max-w-4xl mx-auto border-t border-white/10 pt-16 pb-24 text-center px-6 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-left mb-16">
                        <div className="flex gap-4 p-6 rounded-3xl bg-white/[0.02] border border-white/5">
                            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                <Crown size={18} className="text-blue-400" />
                            </div>
                            <div>
                                <h4 className="text-white font-black text-xs uppercase tracking-widest mb-2">Suport Premium</h4>
                                <p className="text-slate-400 text-sm leading-relaxed font-medium">Equip de suport dedicat per a usuaris Pro i Premium disponible les 24h del dia amb prioritat d'atenció.</p>
                            </div>
                        </div>
                        <div className="flex gap-4 p-6 rounded-3xl bg-white/[0.02] border border-white/5">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                                <Check size={18} className="text-emerald-400" />
                            </div>
                            <div>
                                <h4 className="text-white font-black text-xs uppercase tracking-widest mb-2">Privadesa Garantida</h4>
                                <p className="text-slate-400 text-sm leading-relaxed font-medium">Les teves notes i dades estan xifrades amb seguretat de nivell bancari per assegurar el teu treball.</p>
                            </div>
                        </div>
                    </div>
                    <div className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] flex flex-col gap-3">
                        <p>Pots cancel·lar en qualsevol moment · Sense permanències</p>
                        <p>Pagament segur processat via Stripe · BETA 3M © 2024</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
