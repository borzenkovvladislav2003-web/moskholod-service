import React from 'react';

/**
 * High-definition vector logo for МоскХолод
 * Variants:
 *  - 'crystal': Modern geometric frost crystal / hexagon
 *  - 'shield': Engineering reliability shield with cooling core
 *  - 'turbine': Dynamic cooling flow vortex
 */
export default function Logo({ variant = 'crystal', size = 'default', showSubtitle = true, className = '' }) {
  const isLarge = size === 'large';
  const iconSize = isLarge ? 'w-12 h-12' : 'w-10 h-10';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Vector Icon */}
      <div className={`relative flex items-center justify-center ${iconSize} rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 p-0.5 shadow-md shadow-blue-500/25`}>
        <div className="w-full h-full bg-slate-900/10 rounded-[14px] flex items-center justify-center overflow-hidden backdrop-blur-sm">
          {variant === 'crystal' && (
            <svg viewBox="0 0 40 40" className="w-6 h-6 text-white" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Hexagonal Frost Crystal */}
              <path d="M20 4V36M4 20H36M8.68 8.68L31.32 31.32M8.68 31.32L31.32 8.68" stroke="white" strokeWidth="2.2" strokeLinecap="round" opacity="0.95" />
              {/* Crystal facets */}
              <circle cx="20" cy="20" r="4.5" fill="#38BDF8" />
              <path d="M16 8L20 4L24 8M16 32L20 36L24 32M8 16L4 20L8 24M32 16L36 20L32 24" stroke="#7DD3FC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}

          {variant === 'shield' && (
            <svg viewBox="0 0 40 40" className="w-6 h-6 text-white" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Shield Base */}
              <path d="M20 5L33 10V19C33 27.5 27.5 34.5 20 37C12.5 34.5 7 27.5 7 19V10L20 5Z" fill="url(#shield-grad)" stroke="#38BDF8" strokeWidth="1.5" />
              {/* Snowflake inside shield */}
              <path d="M20 12V28M12 20H28M14.5 14.5L25.5 25.5M14.5 25.5L25.5 14.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="20" cy="20" r="2.5" fill="#38BDF8" />
              <defs>
                <linearGradient id="shield-grad" x1="20" y1="5" x2="20" y2="37" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#1E40AF" stopOpacity="0.8" />
                  <stop stopColor="#0284C7" stopOpacity="0.9" />
                </linearGradient>
              </defs>
            </svg>
          )}

          {variant === 'turbine' && (
            <svg viewBox="0 0 40 40" className="w-6 h-6 text-white" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Cooling flow blades */}
              <circle cx="20" cy="20" r="14" stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="3 3" />
              <path d="M20 20L20 7C24.5 7 28 10 28 14C28 17 24 19 20 20Z" fill="white" opacity="0.9" />
              <path d="M20 20L8.74 26.5C6.5 22.6 6.5 18 10 15.5C12.5 13.5 16.5 15.5 20 20Z" fill="#7DD3FC" opacity="0.9" />
              <path d="M20 20L31.26 26.5C29 30.4 25.5 32 22 30.5C19 29 19.5 24.5 20 20Z" fill="#38BDF8" opacity="0.9" />
              <circle cx="20" cy="20" r="3" fill="#0F172A" stroke="white" strokeWidth="1.5" />
            </svg>
          )}
        </div>
      </div>

      {/* Typography */}
      <div>
        <div className="flex items-center gap-1.5">
          <span className={`font-black text-slate-900 tracking-tight leading-none ${isLarge ? 'text-xl' : 'text-base md:text-lg'}`}>
            Моск<span className="text-blue-600">Холод</span>
          </span>
          <span className="text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 leading-none">
            Сервис
          </span>
        </div>
        {showSubtitle && (
          <div className="text-[10px] md:text-[11px] text-slate-500 font-medium tracking-tight mt-0.5">
            Служба ремонта №1 в Москве
          </div>
        )}
      </div>
    </div>
  );
}
