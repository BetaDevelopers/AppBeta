import React from 'react';

export function BetaLogo(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" {...props}>
            <rect width="100" height="100" rx="20" fill="#3b82f6" />
            <text x="50" y="72" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="65" fill="white" textAnchor="middle">Β</text>
        </svg>
    );
}
