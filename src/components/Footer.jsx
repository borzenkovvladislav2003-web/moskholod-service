import React from 'react';
import { Phone, MapPin, ShieldCheck, Wrench } from 'lucide-react';

export default function Footer({ onOpenDispatcher }) {
  return (
    <footer className="bg-slate-900 text-slate-400 py-8 text-xs border-t border-slate-800">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">❄️</span>
            <span className="font-bold text-white text-sm">МосХолод Сервис</span>
            <span className="text-slate-500">• Москва и Московская область</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={onOpenDispatcher}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
            >
              <Wrench className="w-3.5 h-3.5 text-blue-400" />
              <span>Панель диспетчера</span>
            </button>

            <a
              href="tel:+74951204488"
              className="font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              +7 (495) 120-44-88
            </a>
          </div>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-slate-500 text-[11px] text-center sm:text-left">
          <p>© 2026 МосХолод Сервис. Срочный ремонт холодильников в Москве на дому.</p>
          <p>Ежедневно 08:00 – 23:00. Без праздников и выходных.</p>
        </div>
      </div>
    </footer>
  );
}
