import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const PLANS = [
    {
        id: 'free',
        name: 'Free',
        monthlyPrice: '0€',
        yearlyPrice: '0€',
        period: 'per sempre',
        icon: '📝',
        colorClass: 'border-white/10',
        badgeClass: '',
        textClass: 'text-gray-400',
        btnClass: 'bg-white/5 text-gray-500 border border-white/10 cursor-default',
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
        icon: '⭐',
        recommended: true,
        colorClass: 'border-blue-500/40 bg-blue-600/5',
        textClass: 'text-blue-400',
        btnClass: 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25',
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
        icon: '👑',
        colorClass: 'border-purple-500/40 bg-purple-600/5',
        textClass: 'text-purple-400',
        btnClass: 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/25',
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
        <div className="min-h-screen bg-[#0d1117] text-white overflow-x-hidden">
            {/* Header */}
            <div className="border-b border-white/5 px-6 py-4 flex items-center justify-between sticky top-0 bg-[#0d1117]/80 backdrop-blur-xl z-[100]">
                <div className="flex items-center gap-6">
                    <button onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-all group">
                        <span className="group-hover:-translate-x-1 transition-transform">←</span> Tornar
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <span className="text-white text-[10px] font-black tracking-tighter">3M</span>
                        </div>
                        <span className="font-black text-sm tracking-widest uppercase opacity-80">BETA 3M</span>
                    </div>
                </div>

                <div className="text-xs font-bold text-slate-500">
                    SESSÍO: <span className="text-slate-300 ml-1">{user?.email}</span>
                </div>
            </div>

            {/* Hero */}
            <div className="text-center pt-24 pb-16 px-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/10 border border-blue-500/20
                        rounded-full text-xs font-bold text-blue-400 mb-8 uppercase tracking-widest shadow-xl">
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                    Hola, {user?.email.split('@')[0]} 👋
                </div>
                <h1 className="text-6xl font-black mb-6 bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent tracking-tighter">
                    Escull el teu futur
                </h1>
                <p className="text-gray-400 text-xl max-w-2xl mx-auto leading-relaxed font-medium">
                    Digitalitza els teus apunts amb el poder de la IA i gaudeix de l'editor avançat més ràpid del mercat.
                </p>

                {/* Toggle mensual/anual */}
                <div className="flex items-center justify-center gap-6 mt-12 bg-white/5 p-2 rounded-2xl w-fit mx-auto border border-white/5">
                    <button
                        onClick={() => setYearly(false)}
                        className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${!yearly ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Mensual
                    </button>
                    <button
                        onClick={() => setYearly(true)}
                        className={`px-6 py-2 rounded-xl text-sm font-bold transition-all relative ${yearly ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Anual
                        <span className="absolute -top-3 -right-3 px-2 py-0.5 bg-green-500 text-black text-[9px] rounded-full font-black animate-bounce">
                            -20%
                        </span>
                    </button>
                </div>
            </div>

            {/* Grid de plans */}
            <div className="max-w-6xl mx-auto px-6 pb-24
                      grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
                {PLANS.map((plan) => (
                    <div key={plan.id}
                        className={`relative flex flex-col rounded-[32px] border p-10 transition-all duration-500
              ${plan.colorClass}
              ${plan.recommended ? 'scale-105 z-10 bg-[#161c27] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] border-blue-500/30' : 'bg-[#0f172a]/50 hover:bg-[#0f172a] hover:scale-[1.02]'}
            `}
                    >
                        {/* Badge recomanat */}
                        {plan.recommended && (
                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-20">
                                <span className="bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em]
                                 px-8 py-2 rounded-full shadow-[0_10px_20px_rgba(37,99,235,0.4)]">
                                    RECOMANAT
                                </span>
                            </div>
                        )}

                        {/* Icona i preu */}
                        <div className="mb-10">
                            <div className="text-5xl mb-6 bg-white/5 w-20 h-20 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">{plan.icon}</div>
                            <h3 className="text-2xl font-black text-white mb-2 tracking-tight uppercase">{plan.name}</h3>
                            <div className="flex items-baseline gap-2">
                                <span className={`text-5xl font-black tracking-tighter ${plan.textClass}`}>
                                    {yearly ? plan.yearlyPrice : plan.monthlyPrice}
                                </span>
                                {plan.monthlyPrice !== '0€' && (
                                    <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">{plan.period}</span>
                                )}
                            </div>
                            {plan.id !== 'free' && !yearly && (
                                <p className="text-[10px] font-bold text-gray-600 mt-2 uppercase tracking-widest">
                                    Paga anualment i estalvia un 25%
                                </p>
                            )}
                        </div>

                        {/* Features */}
                        <ul className="flex-1 space-y-4 mb-12">
                            {plan.features.map((f, i) => (
                                <li key={i} className="flex items-start gap-4">
                                    <div className={`mt-1 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black
                    ${f.ok ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-gray-700'}`}>
                                        {f.ok ? '✓' : '✗'}
                                    </div>
                                    <span className={`text-sm font-bold leading-snug
                    ${f.ok ? 'text-gray-300' : 'text-gray-600'}`}>
                                        {f.text}
                                    </span>
                                </li>
                            ))}
                        </ul>

                        {/* CTA */}
                        <button
                            disabled={plan.btnDisabled}
                            className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-[0.1em]
                transition-all active:scale-95 shadow-2xl ${plan.btnClass}`}
                        >
                            {plan.btnText}
                        </button>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="max-w-4xl mx-auto border-t border-white/5 pt-12 pb-20 text-center px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left mb-12">
                    <div className="space-y-3">
                        <h4 className="text-white font-black text-xs uppercase tracking-widest">Suport Premium</h4>
                        <p className="text-gray-500 text-sm leading-relaxed font-medium">Equip de suport dedicat per a usuaris Pro i Premium disponible les 24h del dia.</p>
                    </div>
                    <div className="space-y-3">
                        <h4 className="text-white font-black text-xs uppercase tracking-widest">Privadesa i Seguretat</h4>
                        <p className="text-gray-500 text-sm leading-relaxed font-medium">Les teves notes estan xifrades d'extrem a extrem amb l'estat de l'art en seguretat.</p>
                    </div>
                </div>
                <div className="text-[10px] font-black text-gray-700 uppercase tracking-[0.3em] space-y-2">
                    <p>Pots cancel·lar en qualsevol moment · Sense permanències</p>
                    <p>Pagament segur via Stripe · BETA 3M © 2024</p>
                </div>
            </div>
        </div>
    );
}
