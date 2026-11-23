import React from 'react';
import { Zap, ArrowRight, Calculator } from 'lucide-react';

export default function MobileQuickBar({ onScrollToQuiz }) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-4 py-2.5 shadow-2xl">
      <button
        onClick={onScrollToQuiz}
        className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 active:from-blue-700 active:to-indigo-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 transition-all"
      >
        <Calculator className="w-4 h-4 text-amber-300" />
        <span>Рассчитать стоимость со скидкой 15%</span>
        <ArrowRight className="w-4 h-4 text-white/80" />
      </button>
    </div>
  );
}
