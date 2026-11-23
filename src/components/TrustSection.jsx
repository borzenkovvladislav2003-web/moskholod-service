import React from 'react';
import { Shield, Wrench, CheckCircle, Clock, MapPin, Award, Users } from 'lucide-react';

const PRICES = [
  { service: 'Выезд мастера и диагностика', price: '0 ₽', note: 'Бесплатно при выполнении ремонта' },
  { service: 'Заправка фреоном (R600a / R134a)', price: 'от 1 350 ₽', note: 'С устранением микроутечки' },
  { service: 'Замена пускозащитного реле', price: 'от 950 ₽', note: 'Оригинальные реле в наличии' },
  { service: 'Замена термостата / терморегулятора', price: 'от 1 150 ₽', note: 'Для механических и электронных' },
  { service: 'Ремонт / замена компрессора', price: 'от 2 400 ₽', note: 'Secop, Embraco, Jiaxipera и др.' },
  { service: 'Ремонт электронной платы (модуля)', price: 'от 1 800 ₽', note: 'Восстановление прошивки и цепей' },
  { service: 'Замена вентилятора No Frost', price: 'от 1 200 ₽', note: 'Устранение гула и шума' },
  { service: 'Прочистка дренажной системы', price: 'от 850 ₽', note: 'Устранение воды под ящиками' },
];

export default function TrustSection({ onSelectService }) {
  return (
    <section className="py-10 bg-white border-t border-slate-200/80">
      <div className="max-w-4xl mx-auto px-4">
        {/* Section Heading */}
        <div className="text-center mb-8">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2.5 py-1 rounded-full">
            Прозрачные цены без скрытых доплат
          </span>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 mt-2">
            Сколько стоит ремонт холодильника в Москве?
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-lg mx-auto">
            Точную причину мастер назовет после бесплатной диагностики. Цены согласуются до начала работ.
          </p>
        </div>

        {/* Pricing Table / Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
          {PRICES.map((p, idx) => (
            <div 
              key={idx}
              className="p-3.5 rounded-2xl border border-slate-200/70 hover:border-blue-400 bg-slate-50/50 hover:bg-white transition-all flex items-center justify-between gap-3 shadow-xs"
            >
              <div>
                <h4 className="font-semibold text-slate-900 text-xs sm:text-sm">{p.service}</h4>
                <p className="text-[11px] text-slate-500">{p.note}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="font-black text-slate-900 text-sm sm:text-base text-blue-600">
                  {p.price}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Why Us 4 Pillars */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-100">
          <div className="text-center">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-2 font-black text-lg">
              94%
            </div>
            <h5 className="font-bold text-slate-900 text-xs sm:text-sm">За 1 визит</h5>
            <p className="text-[11px] text-slate-500">Без увоза техники в мастерскую</p>
          </div>

          <div className="text-center">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2 font-black text-lg">
              24
            </div>
            <h5 className="font-bold text-slate-900 text-xs sm:text-sm">Месяца гарантии</h5>
            <p className="text-[11px] text-slate-500">Официальный акт и чек</p>
          </div>

          <div className="text-center">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-2 font-black text-lg">
              14
            </div>
            <h5 className="font-bold text-slate-900 text-xs sm:text-sm">Мастеров в Москве</h5>
            <p className="text-[11px] text-slate-500">Быстрый выезд в любой округ</p>
          </div>

          <div className="text-center">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto mb-2 font-black text-lg">
              0 ₽
            </div>
            <h5 className="font-bold text-slate-900 text-xs sm:text-sm">Выезд и осмотр</h5>
            <p className="text-[11px] text-slate-500">При согласии на ремонт</p>
          </div>
        </div>
      </div>
    </section>
  );
}
