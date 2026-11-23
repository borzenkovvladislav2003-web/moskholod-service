import React from 'react';
import { Star, CheckCircle2, ShieldCheck, MapPin, Calendar } from 'lucide-react';

const REVIEWS = [
  {
    id: 1,
    author: 'Виктория Ковалёва',
    location: 'г. Москва, м. Сокол (Ленинградский пр-т)',
    date: '18 ноября 2026',
    brand: 'Холодильник Liebherr CN 4015',
    issue: 'Перестала холодить верхняя камера, морозилка при этом работала как морозильник. Постоянно пищал сигнал Alarm.',
    solution: 'Мастер Алексей приехал через 40 минут. Провёл диагностику, выявил обрыв датчика оттайки No Frost. Заменил на оригинальный датчик из багажника.',
    price: '2 850 ₽ (со скидкой 10%)',
    duration: '50 минут',
    rating: 5,
    text: 'Очень переживала, так как холодильник дорогой. Алексей приехал вовремя, надел бахилы, сразу всё прозвонил мультиметром и объяснил причину. Дал официальный гарантийный талон на 2 года. Огромное спасибо за оперативность!'
  },
  {
    id: 2,
    author: 'Евгений Пономарёв',
    location: 'г. Москва, м. Профсоюзная (ул. Вавилова)',
    date: '12 ноября 2026',
    brand: 'Холодильник Bosch KGN39',
    issue: 'Холодильник начал сильно шуметь, дребезжать по ночам, а потом компрессор просто стал щёлкать каждые 3 минуты и выключаться.',
    solution: 'Мастер Михаил заменил пускозащитное реле Danfoss и проверил пусковой ток компрессора. Мотор запустился ровно и тихо.',
    price: '2 100 ₽',
    duration: '35 минут',
    rating: 5,
    text: 'В другом сервисе по телефону сразу пытались развести на замену компрессора за 14 тысяч! А здесь мастер честно сказал, что дело только в пусковом реле. Ремонт занял полчаса, всё тихо работает. Честный сервис, рекомендую.'
  },
  {
    id: 3,
    author: 'Анна Сергеевна',
    location: 'г. Москва, м. ВДНХ (ул. Космонавтов)',
    date: '6 ноября 2026',
    brand: 'Холодильник Samsung RB37',
    issue: 'Под нижними ящиками для овощей стала скапливаться вода, приходилось каждый день вытирать тряпкой лужу на полу.',
    solution: 'Мастер Сергей прочистил дренажный канал специальным зондом, обработал от плесени и установил правильный нагрев дренажа.',
    price: '1 450 ₽',
    duration: '30 минут',
    rating: 5,
    text: 'Быстро, аккуратно и без лишних накруток. Мастер приехал в день звонка в удобное для меня время. Вода больше не скапливается!'
  }
];

export default function ReviewsSection() {
  return (
    <section className="py-10 bg-white border-t border-slate-200/80">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
            Реальные истории ремонтов
          </span>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 mt-2.5">
            Отзывы клиентов и примеры выполненных работ
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-lg mx-auto">
            Каждый заказ сопровождается договором, актом приёмки и чеком.
          </p>
        </div>

        {/* Reviews Cards */}
        <div className="space-y-4">
          {REVIEWS.map((r) => (
            <div 
              key={r.id}
              className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-4 sm:p-5 hover:bg-white hover:shadow-md transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-200/70">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 text-sm sm:text-base">{r.author}</h4>
                    <span className="flex items-center text-amber-500 text-xs">
                      {[...Array(r.rating)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>{r.location}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{r.date}</span>
                </div>
              </div>

              {/* Case breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-3 bg-white p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 font-medium block">Техника и поломка:</span>
                  <span className="font-bold text-slate-800">{r.brand}</span>
                  <p className="text-slate-600 mt-0.5">{r.issue}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Что сделал мастер:</span>
                  <p className="text-slate-700 font-medium">{r.solution}</p>
                  <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100 font-bold">
                    <span className="text-slate-500">Итоговая стоимость:</span>
                    <span className="text-emerald-700">{r.price}</span>
                  </div>
                </div>
              </div>

              {/* Client quote */}
              <p className="text-xs sm:text-sm text-slate-700 italic leading-relaxed">
                «{r.text}»
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
