import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => (
    <div className="flex flex-col gap-2 w-full">
        {label && <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 font-display">{label}</label>}
        <div className="relative group">
            <input
                className={`w-full py-4 px-6 bg-[#030712] border border-white/5 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all duration-300 placeholder:text-slate-700 text-slate-200 shadow-inner group-hover:border-white/10 ${error ? 'border-red-500/50 focus:ring-red-500/10' : ''
                    } ${className}`}
                {...props}
            />
            <div className="absolute inset-0 rounded-2xl bg-blue-500/0 group-hover:bg-blue-500/[0.02] pointer-events-none transition-colors duration-500" />
        </div>
        {error && <span className="text-[10px] font-bold text-red-500/80 uppercase tracking-tighter ml-3 animate-pulse">{error}</span>}
    </div>
);
