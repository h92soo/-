import React from 'react';

interface GovernmentEmblemProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const GovernmentEmblem: React.FC<GovernmentEmblemProps> = ({
  className = '',
  size = 'md',
}) => {
  const sizeMap = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-28 h-28',
    xl: 'w-36 h-36',
  };

  return (
    <div
      className={`relative flex items-center justify-center select-none ${sizeMap[size]} ${className}`}
    >
      {/* Outer macOS-style rounded squircle glow */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-amber-500/20 via-emerald-600/10 to-transparent blur-md dark:from-amber-500/15 dark:via-emerald-500/10" />

      {/* Main Medallion Frame */}
      <div className="relative w-full h-full rounded-2xl bg-gradient-to-b from-white/90 to-slate-100/90 dark:from-slate-800/90 dark:to-slate-900/90 p-2 border border-amber-500/30 dark:border-amber-500/40 shadow-lg shadow-amber-500/5 backdrop-blur-md flex items-center justify-center">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full drop-shadow-sm"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Circular Sunburst / Laurel Outline */}
          <circle
            cx="50"
            cy="50"
            r="44"
            stroke="url(#goldGrad)"
            strokeWidth="1.5"
            strokeDasharray="2 3"
            className="opacity-70"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="url(#goldGrad)"
            strokeWidth="1.2"
          />

          {/* Stylized Wings of Saladin Eagle */}
          {/* Left Wing */}
          <path
            d="M 50 48 C 42 35 28 32 18 36 C 24 44 26 58 35 66 C 41 62 46 56 50 48 Z"
            fill="url(#eagleGoldGrad)"
            opacity="0.95"
          />
          <path
            d="M 22 38 C 28 46 32 56 38 62"
            stroke="#b45309"
            strokeWidth="0.8"
            strokeLinecap="round"
          />

          {/* Right Wing */}
          <path
            d="M 50 48 C 58 35 72 32 82 36 C 76 44 74 58 65 66 C 59 62 54 56 50 48 Z"
            fill="url(#eagleGoldGrad)"
            opacity="0.95"
          />
          <path
            d="M 78 38 C 72 46 68 56 62 62"
            stroke="#b45309"
            strokeWidth="0.8"
            strokeLinecap="round"
          />

          {/* Eagle Crown / Head */}
          <path
            d="M 50 20 C 47 20 44 23 45 26 C 46 29 48 31 50 33 C 52 31 54 29 55 26 C 56 23 53 20 50 20 Z"
            fill="url(#goldGrad)"
          />
          {/* Beak */}
          <path d="M 50 26 L 47 27 L 50 29 Z" fill="#78350f" />

          {/* Tail Feathers */}
          <path
            d="M 44 68 L 42 82 L 48 80 L 50 84 L 52 80 L 58 82 L 56 68 Z"
            fill="url(#eagleGoldGrad)"
          />

          {/* Iraqi National Shield on Chest */}
          <g>
            {/* Shield Outline */}
            <path
              d="M 38 42 L 62 42 L 62 58 C 62 66 50 72 50 72 C 50 72 38 66 38 58 Z"
              fill="#ffffff"
              stroke="#d97706"
              strokeWidth="1"
            />
            {/* Red Stripe (Top) */}
            <path
              d="M 38.5 42.5 L 61.5 42.5 L 61.5 48 L 38.5 48 Z"
              fill="#dc2626"
            />
            {/* White Stripe (Middle) with Stylized Green Kufic Takbir indication */}
            <path
              d="M 38.5 48 L 61.5 48 L 61.5 54 L 38.5 54 Z"
              fill="#f8fafc"
            />
            <rect x="44" y="49.5" width="4" height="3" rx="0.5" fill="#15803d" />
            <rect x="52" y="49.5" width="4" height="3" rx="0.5" fill="#15803d" />

            {/* Black Stripe (Bottom) */}
            <path
              d="M 38.5 54 L 61.5 54 L 61.5 58 C 61.5 65 50 71 50 71 C 50 71 38.5 65 38.5 58 Z"
              fill="#18181b"
            />
          </g>

          {/* Laurel Wreath Base Branches */}
          <path
            d="M 28 72 C 34 78 44 80 50 80 C 56 80 66 78 72 72"
            stroke="url(#goldGrad)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Gradients */}
          <defs>
            <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <linearGradient id="eagleGoldGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="40%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
};
