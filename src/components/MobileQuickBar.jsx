import React from 'react';
import { Phone, MessageCircle, Zap } from 'lucide-react';

export default function MobileQuickBar({ onScrollToQuiz }) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-3 py-2 shadow-2xl flex items-center justify-between gap-2">
      {/* Call Button */}
      <a
        href="tel:+74951204488"
        className="flex-1 py-2.5 px-2 bg-emerald-600 active:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
      >
        <Phone className="w-4 h-4" />
        <span>Позвонить</span>
      </a>

      {/* WhatsApp Button */}
      <a
        href="https://wa.me/74951204488?text=%D0%97%D0%B4%D1%80%D0%B0%D0%B2%D1%81%D1%82%D0%B2%D1%83%D0%B9%D1%82%D0%B5!%20%D0%9D%D1%83%D0%B6%D0%B5%D0%BD%20%D1%80%D0%B5%D0%BC%D0%BE%D0%BD%D1%82%20%D1%85%D0%BE%D0%BB%D0%BE%D0%B4%D0%B8%D0%BB%D1%8C%D0%BD%D0%B8%D0%BA%D0%B0%20%D0%B2%20%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B5"
        target="_blank"
        rel="noreferrer"
        className="flex-1 py-2.5 px-2 bg-emerald-100 active:bg-emerald-200 text-emerald-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
      >
        <MessageCircle className="w-4 h-4 text-emerald-600" />
        <span>WhatsApp</span>
      </a>

      {/* Quiz Calculation CTA */}
      <button
        onClick={onScrollToQuiz}
        className="flex-1 py-2.5 px-2 bg-gradient-to-r from-blue-600 to-indigo-600 active:from-blue-700 active:to-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 shadow-sm"
      >
        <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
        <span>Скидка 15%</span>
      </button>
    </div>
  );
}
