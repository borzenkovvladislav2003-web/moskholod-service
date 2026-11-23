import React from 'react';
import { MapPin, ShieldCheck } from 'lucide-react';

export default function Footer() {
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
            <span className="text-slate-300 font-medium">Приём заявок на сайте: круглосуточно</span>
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
