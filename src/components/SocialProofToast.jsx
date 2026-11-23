import React, { useState, useEffect } from 'react';
import { CheckCircle2, Wrench, X } from 'lucide-react';

const EVENTS = [
  { text: 'Мастер Александр выехал на заказ', location: 'м. Сокол (САО)', time: '3 мин назад', type: 'dispatch' },
  { text: 'Новая заявка: ремонт Samsung', location: 'м. Университет (ЮЗАО)', time: '5 мин назад', type: 'lead' },
  { text: 'Завершен ремонт холодильника Bosch', location: 'м. ВДНХ (СВАО)', time: '12 мин назад', type: 'done' },
  { text: 'Мастер Денис принял срочный заказ', location: 'м. Таганская (ЦАО)', time: '7 мин назад', type: 'dispatch' },
  { text: 'Новая заявка: не морозит Liebherr', location: 'м. Крылатское (ЗАО)', time: '2 мин назад', type: 'lead' },
];

export default function SocialProofToast() {
  const [currentEvent, setCurrentEvent] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show first toast after 4 seconds
    const initialTimer = setTimeout(() => {
      triggerRandomEvent();
    }, 4000);

    // Then every 18 seconds
    const interval = setInterval(() => {
      triggerRandomEvent();
    }, 18000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  const triggerRandomEvent = () => {
    const random = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    setCurrentEvent(random);
    setIsVisible(true);

    setTimeout(() => {
      setIsVisible(false);
    }, 5000);
  };

  if (!currentEvent || !isVisible) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 z-30 max-w-xs sm:max-w-sm bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-3 shadow-xl shadow-slate-900/10 transition-all duration-300 animate-slide-up flex items-start gap-2.5">
      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
        <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
      </div>

      <div className="flex-1 pr-1">
        <div className="text-xs font-bold text-slate-900 leading-snug">
          {currentEvent.text}
        </div>
        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
          <span className="text-blue-600 font-medium">{currentEvent.location}</span>
          <span>•</span>
          <span>{currentEvent.time}</span>
        </div>
      </div>

      <button
        onClick={() => setIsVisible(false)}
        className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
