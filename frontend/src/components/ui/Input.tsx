import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => (
    <div className="flex flex-col gap-2 w-full">
        {label && <label className="text-sm font-bold text-slate-400 ml-1">{label}</label>}
        <div className="relative">
            <input
                className={`w-full py-4 px-5 bg-slate-900/50 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600 text-slate-200 ${error ? 'border-red-500/50 focus:ring-red-500/20' : ''
                    } ${className}`}
                {...props}
            />
        </div>
        {error && <span className="text-xs text-red-400 ml-1">{error}</span>}
    </div>
);
