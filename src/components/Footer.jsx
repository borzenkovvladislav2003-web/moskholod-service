import React from 'react';
import { MapPin, ShieldCheck } from 'lucide-react';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-8 text-xs border-t border-slate-800">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 p-0.5 flex items-center justify-center shadow-md shadow-blue-500/20">
              <svg viewBox="0 0 40 40" className="w-5 h-5 text-white" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 4V36M4 20H36M8.68 8.68L31.32 31.32M8.68 31.32L31.32 8.68" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="20" cy="20" r="4" fill="#38BDF8" />
              </svg>
            </div>
            <span className="font-bold text-white text-sm">МоскХолод Сервис</span>
            <span className="text-slate-500">• Москва и Московская область</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-slate-300 font-medium">Приём заявок на сайте: круглосуточно</span>
          </div>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-slate-500 text-[11px] text-center sm:text-left">
          <p>© 2026 МоскХолод Сервис. Срочный ремонт холодильников в Москве на дому.</p>
          <p>Ежедневно 08:00 – 23:00. Без праздников и выходных.</p>
        </div>
      </div>
    </footer>
  );
}
