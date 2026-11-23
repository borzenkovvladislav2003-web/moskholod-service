import React from 'react';
import { Phone, Clock, MapPin, ShieldCheck, Wrench } from 'lucide-react';

export default function Header({ onOpenDispatcher }) {
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
            {/* Quick Dispatcher Trigger for Sergey demo */}
            <button
              onClick={onOpenDispatcher}
              className="hidden sm:flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors border border-slate-200"
              title="Открыть Лид-Хаб диспетчера"
            >
              <Wrench className="w-3.5 h-3.5 text-blue-600" />
              <span>Панель диспетчера</span>
            </button>

            {/* Phone */}
            <a
              href="tel:+74951204488"
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 md:px-4 md:py-2 rounded-xl font-semibold text-xs md:text-sm shadow-sm transition-all active:scale-95"
            >
              <Phone className="w-3.5 h-3.5 animate-bounce" />
              <span className="hidden md:inline">+7 (495) 120-44-88</span>
              <span className="md:hidden">Позвонить</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
