import React from 'react';
import { MapPin } from 'lucide-react';
import Logo from './Logo';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          {/* Logo & City */}
          <div className="flex items-center gap-3">
            <Logo variant="crystal" />
            <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-500 font-medium pl-3 border-l border-slate-200">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              <span>Москва и МО • 08:00–23:00</span>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            <a
              href="#quiz-calculator"
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-3.5 py-2 md:px-4 md:py-2 rounded-xl font-bold text-xs md:text-sm shadow-md shadow-blue-500/20 transition-all active:scale-95"
            >
              <span>Рассчитать стоимость</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
