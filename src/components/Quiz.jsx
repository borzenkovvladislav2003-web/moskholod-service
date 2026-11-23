import React, { useState } from 'react';
import { 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  AlertCircle, 
  Sparkles, 
  Flame, 
  ShieldCheck, 
  MapPin, 
  Clock, 
  Wrench,
  ThumbsUp,
  Tag,
  Calculator
} from 'lucide-react';

const BREAKDOWNS = [
  { id: 'not_cooling', label: 'Не морозит / слабо холодит', icon: '❄️', desc: 'Компрессор работает, но холода нет', basePrice: 1900 },
  { id: 'not_starting', label: 'Не включается / щёлкает', icon: '🔌', desc: 'Щелкает реле или тишина при включении', basePrice: 1500 },
  { id: 'leaking', label: 'Течёт вода (внутри или под ним)', icon: '💧', desc: 'Лужа на полу или под нижними ящиками', basePrice: 1100 },
  { id: 'freezing_ice', label: 'Намерзает шуба / толстый лёд', icon: '🧊', desc: 'Снег на задней стенке в камерах', basePrice: 1400 },
  { id: 'noisy', label: 'Сильно шумит / стучит / гудит', icon: '🔊', desc: 'Непривычный скрежет или вибрация', basePrice: 1300 },
  { id: 'error_beep', label: 'Пищит / мигает ошибка на дисплее', icon: '⚠️', desc: 'Коды ошибок или аварийный сигнал', basePrice: 1700 },
  { id: 'other', label: 'Другая поломка / нужна диагностика', icon: '🔧', desc: 'Опишу мастеру по телефону', basePrice: 1200 },
];

const BRANDS = [
  'Bosch', 'Samsung', 'LG', 'Indesit', 
  'Атлант', 'Liebherr', 'Beko', 'Haier', 
  'Electrolux', 'Whirlpool', 'Stinol', 'Ariston', 
  'Gorenje', 'Candy', 'Другая марка'
];

const DISTRICTS = [
  { id: 'cao', label: 'ЦАО (Центральный)', metro: 'Тверская, Арбат, Таганка и др.' },
  { id: 'sao', label: 'САО (Северный)', metro: 'Сокол, Аэропорт, Беговая и др.' },
  { id: 'svao', label: 'СВАО (Северо-Восточный)', metro: 'ВДНХ, Бабушкинская, Отрадное и др.' },
  { id: 'vao', label: 'ВАО (Восточный)', metro: 'Сокольники, Перово, Новогиреево и др.' },
  { id: 'yuvao', label: 'ЮВАО (Юго-Восточный)', metro: 'Марьино, Люблино, Текстильщики и др.' },
  { id: 'yuao', label: 'ЮАО (Южный)', metro: 'Автозаводская, Царицыно, Пражская и др.' },
  { id: 'yuzao', label: 'ЮЗАО (Юго-Западный)', metro: 'Университет, Теплый Стан, Ясенево и др.' },
  { id: 'zao', label: 'ЗАО (Западный)', metro: 'Кунцево, Раменки, Крылатское и др.' },
  { id: 'szao', label: 'СЗАО (Северо-Западный)', metro: 'Тушино, Митино, Строгино и др.' },
  { id: 'new_msk', label: 'Новая Москва (ТиНАО)', metro: 'Саларьево, Коммунарка, Троицк и др.' },
  { id: 'mo', label: 'Ближнее Подмосковье (до 15 км)', metro: 'Химки, Красногорск, Мытищи, Люберцы и др.' },
];

const TIMINGS = [
  { id: 'urgent', label: 'Срочно (в течение 45–90 минут)', icon: '⚡', desc: 'Ближайший свободный мастер в вашем районе' },
  { id: 'today', label: 'Сегодня во второй половине дня', icon: '🕒', desc: 'Удобно после работы или в интервале' },
  { id: 'tomorrow', label: 'Завтра в удобное для меня время', icon: '📅', desc: 'Забронировать время заранее' },
  { id: 'weekend', label: 'В ближайшие выходные', icon: '☕', desc: 'Суббота или воскресенье' },
];

export default function Quiz({ onQuizSubmit }) {
  const [step, setStep] = useState(1);
  const [leadId] = useState(() => 'REQ-' + Math.floor(1000 + Math.random() * 9000));
  const [formData, setFormData] = useState({
    breakdown: '',
    brand: '',
    district: '',
    metro: '',
    urgency: '',
    name: '',
    phone: '',
    company_website: '', // honeypot
  });
  const [phoneError, setPhoneError] = useState('');
  const [submitFeedback, setSubmitFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalSteps = 5;
  const progressPercent = Math.round((step / totalSteps) * 100);

  // Dynamic price calculation
  const selectedBreakdownObj = BREAKDOWNS.find(b => b.label === formData.breakdown);
  const basePrice = selectedBreakdownObj ? selectedBreakdownObj.basePrice : 1500;
  const discountedPrice = Math.round(basePrice * 0.90);

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  // Format phone number as +7 (XXX) XXX-XX-XX
  const handlePhoneChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.startsWith('7') || val.startsWith('8')) {
      val = val.substring(1);
    }
    let formatted = '+7 ';
    if (val.length > 0) formatted += '(' + val.substring(0, 3);
    if (val.length >= 4) formatted += ') ' + val.substring(3, 6);
    if (val.length >= 7) formatted += '-' + val.substring(6, 8);
    if (val.length >= 9) formatted += '-' + val.substring(8, 10);
    
    setFormData({ ...formData, phone: formatted.trim() });
    if (val.length === 10) {
      setPhoneError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const rawPhone = formData.phone.replace(/\D/g, '');
    if (rawPhone.length < 11) {
      setPhoneError('Пожалуйста, введите полный номер телефона');
      return;
    }
    setPhoneError('');
    setSubmitFeedback(null);
    setIsSubmitting(true);

    const submission = {
      ...formData,
      id: leadId,
      createdAt: new Date().toISOString(),
      discount: '10%',
      estimatedPrice: `от ${discountedPrice.toLocaleString('ru-RU')} ₽`,
      status: 'NEW',
    };

    try {
      const res = await onQuizSubmit(submission);
      setIsSubmitting(false);

      if (!res || !res.success) {
        setSubmitFeedback({
          type: 'error',
          message: res?.message || 'Не удалось подтвердить доставку заявки. Серверные каналы оповещения не подтвердили получение.'
        });
      }
    } catch (err) {
      setIsSubmitting(false);
      setSubmitFeedback({
        type: 'error',
        message: 'Произошла непредвиденная ошибка при отправке заявки. Данные в форме сохранены.'
      });
    }
  };

  return (
    <div id="quiz-calculator" className="max-w-2xl mx-auto px-4 py-6">
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden">
        {/* Quiz Header & Progress */}
        <div className="bg-slate-900 text-white p-4 sm:p-6">
          <div className="flex items-center justify-between text-xs sm:text-sm font-semibold mb-2">
            <span className="flex items-center gap-1.5 text-blue-400">
              <Sparkles className="w-4 h-4" />
              <span>Шаг {step} из {totalSteps}</span>
            </span>
            <span className="flex items-center gap-1 text-amber-300 bg-amber-400/20 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
              <Tag className="w-3 h-3" />
              Скидка 10% закреплена
            </span>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-emerald-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>

          <h2 className="text-base sm:text-xl font-bold text-slate-100">
            {step === 1 && '1. Какая неисправность у холодильника?'}
            {step === 2 && '2. Укажите марку вашего холодильника'}
            {step === 3 && '3. В каком округе или районе Москвы вы находитесь?'}
            {step === 4 && '4. Насколько срочно нужен выезд мастера?'}
            {step === 5 && '5. Расчёт готов! Куда прислать расчет и закрепить скидку?'}
          </h2>
        </div>

        {/* Step Contents */}
        <div className="p-4 sm:p-6">
          {/* STEP 1: Breakdown */}
          {step === 1 && (
            <div className="space-y-2.5">
              <p className="text-xs sm:text-sm text-slate-500 mb-3">
                Выберите один из вариантов, чтобы мастер сразу взял нужный ремкомплект и датчики:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {BREAKDOWNS.map((item) => {
                  const isSelected = formData.breakdown === item.label;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, breakdown: item.label });
                      }}
                      className={`flex items-start gap-3 p-3.5 rounded-2xl text-left border transition-all ${
                        isSelected 
                          ? 'border-blue-600 bg-blue-50/80 shadow-sm ring-2 ring-blue-500/20' 
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                      }`}
                    >
                      <span className="text-2xl">{item.icon}</span>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-slate-900 leading-snug">
                          {item.label}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {item.desc}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs shrink-0 mt-0.5">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Brand */}
          {step === 2 && (
            <div>
              <p className="text-xs sm:text-sm text-slate-500 mb-4">
                Мастер возьмет с собой оригинальные запчасти именно под вашу марку:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
                {BRANDS.map((brand) => {
                  const isSelected = formData.brand === brand;
                  return (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => setFormData({ ...formData, brand })}
                      className={`p-3 rounded-xl text-center text-xs sm:text-sm font-medium border transition-all ${
                        isSelected 
                          ? 'border-blue-600 bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20' 
                          : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {brand}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: District */}
          {step === 3 && (
            <div>
              <p className="text-xs sm:text-sm text-slate-500 mb-3">
                Выберите округ Москвы, чтобы назначить дежурного мастера с минимальным временем доезда:
              </p>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {DISTRICTS.map((dist) => {
                  const isSelected = formData.district === dist.label;
                  return (
                    <button
                      key={dist.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, district: dist.label })}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                        isSelected 
                          ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-500' 
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{dist.label}</div>
                        <div className="text-[11px] text-slate-500">{dist.metro}</div>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs shrink-0">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Улица или станция метро (необязательно):
                </label>
                <input
                  type="text"
                  placeholder="Например: м. Сокол, Ленинградский пр-т"
                  value={formData.metro}
                  onChange={(e) => setFormData({ ...formData, metro: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* STEP 4: Urgency */}
          {step === 4 && (
            <div className="space-y-2.5">
              <p className="text-xs sm:text-sm text-slate-500 mb-3">
                Когда вам удобно принять мастера?
              </p>
              {TIMINGS.map((t) => {
                const isSelected = formData.urgency === t.label;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, urgency: t.label })}
                    className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl border text-left transition-all ${
                      isSelected 
                        ? 'border-blue-600 bg-blue-50 shadow-sm ring-2 ring-blue-500/20' 
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-2xl">{t.icon}</span>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-900">{t.label}</div>
                      <div className="text-xs text-slate-500">{t.desc}</div>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* STEP 5: Final Contacts & Dynamic Price Lock */}
          {step === 5 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Dynamic Price Banner */}
              <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-emerald-50 border border-blue-200/80 rounded-2xl p-4 text-xs sm:text-sm shadow-xs">
                <div className="flex items-center justify-between font-bold text-slate-900 border-b border-blue-200/60 pb-2 mb-2.5">
                  <span className="flex items-center gap-1.5 text-blue-700">
                    <Calculator className="w-4 h-4" />
                    Предварительный расчёт:
                  </span>
                  <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-black text-xs">
                    Скидка 10% зафиксирована
                  </span>
                </div>

                <div className="flex items-baseline justify-between mb-2 pb-2 border-b border-blue-100">
                  <span className="text-slate-600 font-medium">Стоимость работы мастера:</span>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 line-through mr-1.5">
                      от {basePrice.toLocaleString('ru-RU')} ₽
                    </span>
                    <span className="text-base sm:text-lg font-black text-emerald-600">
                      от {discountedPrice.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                </div>

                <div className="space-y-1 text-slate-600 text-[11px] sm:text-xs">
                  <div>• Поломка: <span className="font-semibold text-slate-800">{formData.breakdown || 'Диагностика'}</span></div>
                  <div>• Марка: <span className="font-semibold text-slate-800">{formData.brand || 'Не указана'}</span></div>
                  <div>• Локация: <span className="font-semibold text-slate-800">{formData.district || 'Москва'} {formData.metro && `(${formData.metro})`}</span></div>
                  <div>• Выезд мастера и осмотр: <span className="font-semibold text-emerald-700">0 ₽ (Бесплатно при ремонте)</span></div>
                </div>
              </div>

              {/* Honeypot hidden input */}
              <input
                type="text"
                name="company_website"
                value={formData.company_website}
                onChange={(e) => setFormData({ ...formData, company_website: e.target.value })}
                className="hidden"
                tabIndex="-1"
                autoComplete="off"
              />

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ваше имя:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Как к вам обращаться?"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Номер телефона (для согласования времени с мастером):
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+7 (___) ___-__-__"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  className={`w-full px-3.5 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 font-medium ${
                    phoneError ? 'border-red-500 focus:ring-red-400' : 'border-slate-300 focus:ring-blue-500'
                  }`}
                />
                {phoneError && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {phoneError}
                  </p>
                )}
              </div>

              {/* Server-side delivery feedback */}
              {submitFeedback && (
                <div className="p-3.5 rounded-2xl border border-amber-300 bg-amber-50 text-amber-950 text-xs flex items-start gap-2.5 animate-fade-in">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-amber-900 mb-0.5">Внимание: статус доставки</div>
                    <div>{submitFeedback.message}</div>
                    <div className="text-[11px] text-amber-700/90 mt-1">
                      Данные заявки ({leadId}) сохранены в форме. Вы можете нажать кнопку повторно.
                    </div>
                  </div>
                </div>
              )}

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-base shadow-lg shadow-emerald-600/25 transition-all transform active:scale-98 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>Передаём заявку дежурному мастеру...</span>
                ) : (
                  <>
                    <span>Вызвать мастера со скидкой 10%</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 text-center">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Данные защищены. Никакого спама, только звонок мастера для согласования времени.</span>
              </div>
            </form>
          )}

          {/* Navigation Buttons for Steps 1-4 */}
          {step < 5 && (
            <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleBack}
                disabled={step === 1}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
                  step === 1 
                    ? 'text-slate-300 cursor-not-allowed' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Назад</span>
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={
                  (step === 1 && !formData.breakdown) ||
                  (step === 2 && !formData.brand) ||
                  (step === 3 && !formData.district) ||
                  (step === 4 && !formData.urgency)
                }
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-xs sm:text-sm shadow-md shadow-blue-500/20 disabled:shadow-none transition-all"
              >
                <span>Далее</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
