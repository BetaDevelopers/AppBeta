import React from 'react';

interface BetaLogoProps {
  className?: string;
}

export const BetaLogo: React.FC<BetaLogoProps> = ({ className }) => (
  <div className={`bg-blue-600 flex items-center justify-center ${className ?? ''}`}>
    <span className="text-white font-black tracking-tighter" style={{ fontSize: '10px' }}>3M</span>
  </div>
);
