import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient();

interface BetaProviderProps {
    children: React.ReactNode;
}

export const BetaProvider: React.FC<BetaProviderProps> = ({ children }) => {
    return (
        <QueryClientProvider client={queryClient}>
            <div className="min-h-screen bg-slate-950 text-slate-200">
                {children}
            </div>
        </QueryClientProvider>
    );
};
