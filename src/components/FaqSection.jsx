import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

const FAQS = [
  {
    q: 'Сколько стоит выезд мастера, если я решу подумать или отказаться?',
    a: 'Выезд мастера и визуальный осмотр абсолютно бесплатны при согласии на ремонт. Если после проведения точной диагностики вы решите отложить ремонт или ремонт окажется экономически нецелесообразным, оплачивается только стандартная диагностика оборудования — 500 ₽.'
  },
  {
    q: 'Нужно ли заранее размораживать холодильник перед приездом?',
    a: 'Нет, размораживать не нужно! Напротив, мастеру важно увидеть симптомы «вживую»: где именно намерзает снег, как дует вентилятор No Frost и как переключается термостат. Достаточно освободить проход к холодильнику и розетке.'
  },
  {
    q: 'Придётся ли увозить холодильник в сервисный центр?',
    a: 'В 95% случаев ремонт выполняется прямо у вас дома за один визит (от 30 до 60 минут). Мастер привозит с собой всё необходимое оборудование: вакуумный насос, манометры, баллон с фреоном R600a/R134a, припой и новые оригинальные детали в багажнике.'
  },
  {
    q: 'Какая гарантия предоставляется и какие документы я получу?',
    a: 'После проверки работы техники мастер выписывает официальный гарантийный талон (договор-квитанцию) с печатью, перечнем работ и артикулами запчастей. Гарантия составляет от 6 месяцев до 2 лет. В случае повторной неисправности мастер выезжает бесплатно по гарантии.'
  },
  {
    q: 'Как и когда происходит оплата?',
    a: 'Оплата производится исключительно ПОСЛЕ того, как мастер закончил работу, холодильник начал охлаждать, и вы лично проверили результат. Принимаем наличные, перевод на карту, оплату через СБП по QR-коду или безналичный расчёт для юрлиц.'
  },
  {
    q: 'Как быстро мастер сможет приехать ко мне в Москве?',
    a: 'В каждом округе Москвы (ЦАО, САО, СВАО, ВАО, ЮВАО, ЮАО, ЮЗАО, ЗАО, СЗАО, ТиНАО) постоянно дежурят специалисты. Среднее время доезда при срочном вызове — 35–50 минут. Также можно назначить удобный 1-часовой интервал в течение дня или вечером после работы.'
  }
];

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState(0);

  const toggle = (idx) => {
    setOpenIndex(openIndex === idx ? -1 : idx);
  };

  return (
    <section className="py-10 bg-slate-50 border-t border-slate-200/80">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
            Ответы на частые вопросы
          </span>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 mt-2.5">
            Всё, что важно знать перед вызовом мастера
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Работаем честно, открыто и без скрытых условий.
          </p>
        </div>

        {/* Accordion list */}
        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div 
                key={idx}
                className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden transition-all shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-3 font-semibold text-slate-900 text-xs sm:text-sm hover:text-blue-600 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>{faq.q}</span>
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 mt-1">
                    <p className="pt-2">{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
