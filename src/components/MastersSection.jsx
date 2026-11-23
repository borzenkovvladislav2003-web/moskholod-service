import React from 'react';
import { ShieldCheck, Award, MapPin, Wrench, CheckCircle2, Star } from 'lucide-react';

const MASTERS = [
  {
    id: 'master-1',
    name: 'Алексей Воронов',
    experience: '12 лет опыта',
    rating: '4.98',
    reviewsCount: 184,
    districts: 'САО, СЗАО, ЦАО',
    subway: 'м. Сокол / Аэропорт',
    specialty: 'Сложные инверторные системы, Liebherr, Bosch, Miele, Electrolux',
    avatar: '👨‍🔧',
    status: 'Свободен (выезд ~35 мин)',
    verified: true,
  },
  {
    id: 'master-2',
    name: 'Михаил Романов',
    experience: '9 лет опыта',
    rating: '4.95',
    reviewsCount: 142,
    districts: 'ЮЗАО, ЗАО, ТиНАО',
    subway: 'м. Университет / Раменки',
    specialty: 'Устранение утечек фреона, пайка контуров, компрессоры Secop и Embraco',
    avatar: '🧑‍🔧',
    status: 'На выезде в ЗАО',
    verified: true,
  },
  {
    id: 'master-3',
    name: 'Сергей Кузнецов',
    experience: '15 лет опыта',
    rating: '5.0',
    reviewsCount: 228,
    districts: 'СВАО, ВАО, ЦАО',
    subway: 'м. ВДНХ / Сокольники',
    specialty: 'Ремонт электронных плат, прошивка модулей управления, системы No Frost',
    avatar: '👨‍🏭',
    status: 'Свободен (выезд ~40 мин)',
    verified: true,
  },
  {
    id: 'master-4',
    name: 'Дмитрий Васильев',
    experience: '8 лет опыта',
    rating: '4.94',
    reviewsCount: 119,
    districts: 'ЮАО, ЮВАО',
    subway: 'м. Автозаводская / Марьино',
    specialty: 'Samsung, LG, Indesit, Атлант. Замена датчиков оттайки и пусковых реле',
    avatar: '👨‍💼',
    status: 'Свободен (выезд ~30 мин)',
    verified: true,
  },
];

export default function MastersSection({ onSelectMaster }) {
  return (
    <section className="py-10 bg-slate-50 border-t border-slate-200/80">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
            Только штатные специалисты
          </span>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 mt-2.5">
            Дежурные мастера по округам Москвы
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl mx-auto">
            Граждане РФ с профильным образованием и опытом от 8 лет. Приезжают с профессиональным оборудованием и запасом оригинальных запчастей.
          </p>
        </div>

        {/* Master Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {MASTERS.map((m) => (
            <div 
              key={m.id}
              className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-200 flex items-center justify-center text-2xl shadow-xs">
                      {m.avatar}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-slate-900 text-sm sm:text-base">{m.name}</h4>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" title="Проверен службой безопасности" />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-medium text-slate-700">{m.experience}</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          {m.rating} ({m.reviewsCount})
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    m.status.includes('Свободен') 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {m.status}
                  </span>
                </div>

                {/* Info rows */}
                <div className="space-y-1.5 text-xs text-slate-600 mb-4 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span><b>Округа:</b> {m.districts} ({m.subway})</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                    <span><b>Профиль:</b> {m.specialty}</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={onSelectMaster}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-blue-600 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                <span>Вызвать мастера в этот округ</span>
              </button>
            </div>
          ))}
        </div>

        {/* 3 Guarantees banner */}
        <div className="mt-6 bg-blue-50/80 border border-blue-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
            <span><b>Чистота гарантирована:</b> мастер работает в бахилах, защищает полы и убирает весь мусор после ремонта.</span>
          </div>
          <span className="font-bold text-blue-700 shrink-0 bg-white px-3 py-1 rounded-lg border border-blue-200">
            Договор с физ. лицом
          </span>
        </div>
      </div>
    </section>
  );
}
