import React from 'react';
import { MapPin } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          {/* Logo & City */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-blue-500/20">
              ❄️
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 text-base md:text-lg tracking-tight">МосХолод</span>
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Сервис</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                <MapPin className="w-3 h-3 text-red-500" />
                <span>Москва и область • 08:00–23:00</span>
              </div>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            <a
              href="#quiz-calculator"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 md:px-4 md:py-2 rounded-xl font-semibold text-xs md:text-sm shadow-sm transition-all active:scale-95"
            >
              <span>Рассчитать стоимость</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
