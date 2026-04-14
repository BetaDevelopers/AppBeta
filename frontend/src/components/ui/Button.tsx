import React from 'react';
import { Spinner } from './Spinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'glass';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
}

const variants = {
    primary: 'btn-premium text-white shadow-lg shadow-blue-500/10 border border-blue-400/20',
    secondary: 'bg-white/5 text-slate-200 border border-white/10 hover:bg-white/10 hover:text-white',
    glass: 'glass text-white border border-white/5 hover:bg-white/10',
    danger: 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white',
    ghost: 'bg-transparent text-slate-400 hover:text-white hover:bg-white/5',
};

const sizes = {
    sm: 'px-3 py-1.5 text-xs h-9',
    md: 'px-5 py-2 text-sm h-11',
    lg: 'px-8 py-4 text-base h-14',
};

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    className = '',
    disabled,
    ...props
}) => (
    <button
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center font-bold rounded-xl transition-all duration-300 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
    >
        {loading ? <Spinner size="sm" className={variant === 'primary' || variant === 'danger' ? 'text-white' : ''} /> : children}
    </button>
);
