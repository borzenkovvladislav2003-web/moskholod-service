import React from 'react';
import { ShieldCheck, Clock, CheckCircle2, Award, Zap } from 'lucide-react';

export default function Hero({ onStartQuiz }) {
  return (
    <section className="pt-6 pb-4 md:pt-10 md:pb-8 bg-gradient-to-b from-blue-50/70 via-white to-slate-50">
      <div className="max-w-4xl mx-auto px-4 text-center">
        {/* Status Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-4 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>14 мастеров дежурят в округах Москвы прямо сейчас</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-3">
          Срочный ремонт холодильников в Москве на дому <span className="text-blue-600">за 1 визит</span>
        </h1>

        <p className="text-sm sm:text-base md:text-lg text-slate-600 max-w-2xl mx-auto mb-6">
          Ответьте на 4 вопроса за 1 минуту: рассчитайте примерную стоимость ремонта и зафиксируйте <span className="font-bold text-slate-900 bg-amber-100 px-1.5 py-0.5 rounded">скидку 10%</span> на работу мастера.
        </p>

        {/* Big CTA Button */}
        <div className="mb-6">
          <button
            onClick={onStartQuiz}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-base md:text-lg shadow-lg shadow-blue-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
            <span>Рассчитать стоимость со скидкой 10%</span>
          </button>
        </div>

        {/* 3 Value Badges */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-2xl mx-auto pt-2 border-t border-slate-200/80">
          <div className="flex flex-col items-center p-2 rounded-xl bg-white border border-slate-100 shadow-xs">
            <Clock className="w-5 h-5 text-blue-600 mb-1" />
            <span className="font-bold text-slate-800 text-xs sm:text-sm">от 45 мин</span>
            <span className="text-[11px] text-slate-500 leading-tight">выезд на дом</span>
          </div>

          <div className="flex flex-col items-center p-2 rounded-xl bg-white border border-slate-100 shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mb-1" />
            <span className="font-bold text-slate-800 text-xs sm:text-sm">0 ₽ выезд</span>
            <span className="text-[11px] text-slate-500 leading-tight">при ремонте</span>
          </div>

          <div className="flex flex-col items-center p-2 rounded-xl bg-white border border-slate-100 shadow-xs">
            <ShieldCheck className="w-5 h-5 text-indigo-600 mb-1" />
            <span className="font-bold text-slate-800 text-xs sm:text-sm">до 2 лет</span>
            <span className="text-[11px] text-slate-500 leading-tight">гарантия по акту</span>
          </div>
        </div>
      </div>
    </section>
  );
}
