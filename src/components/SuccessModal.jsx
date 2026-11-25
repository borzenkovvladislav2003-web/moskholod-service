import React from 'react';
import { CheckCircle2, Clock, X } from 'lucide-react';

export function resolveModalPresentation(deliveryStatus) {
  switch (deliveryStatus) {
    case 'CONFIRMED_FULL':
      return {
        tone: 'emerald',
        badge: 'Заявка сохранена и отправлена в чат',
        title: 'Заявка передана в диспетчерский чат',
        note: 'Заявка записана в реестр, уведомление доставлено в Telegram-чат диспетчера. Ожидайте звонка для подтверждения и назначения мастера.',
      };
    case 'ALREADY_COMMITTED':
      return {
        tone: 'emerald',
        badge: 'Заявка уже в реестре',
        title: 'Заявка была зарегистрирована ранее',
        note: 'Эта заявка уже сохранена и подтверждена в системе без создания дубликата. Ожидайте звонка диспетчера.',
      };
    case 'CONFIRMED_SHEETS_FSM_PENDING':
      return {
        tone: 'blue',
        badge: 'Заявка записана в реестр',
        title: 'Заявка принята (синхронизация статуса)',
        note: 'Заявка записана в реестр диспетчера и отправлена в Telegram, финальная отметка ожидает технической сверки. Повторная отправка не требуется.',
      };
    case 'CONFIRMED_SHEETS_ONLY':
      return {
        tone: 'blue',
        badge: 'Заявка сохранена в таблице',
        title: 'Заявка записана в реестр диспетчера',
        note: 'Ваша заявка надёжно сохранена в рабочей таблице диспетчера (канал уведомлений Telegram отключён). Диспетчер обработает заявку из реестра.',
      };
    case 'CONFIRMED_SHEETS_TG_FAILED':
      return {
        tone: 'amber',
        badge: 'Заявка сохранена (ручной контроль)',
        title: 'Заявка в реестре — передана на ручную обработку',
        note: 'Ваши контакты и расчёт сохранены в таблице диспетчера, однако автоматическое уведомление в Telegram не прошло. Диспетчер обработает запись вручную.',
      };
    case 'CONFIRMED_SHEETS_TG_UNKNOWN':
    default:
      return {
        tone: 'amber',
        badge: 'Заявка сохранена в реестре',
        title: 'Заявка сохранена (статус уведомления уточняется)',
        note: 'Ваша заявка записана в реестр диспетчера. Статус уведомления в Telegram проверяется вручную без повторной отправки во избежание дублей.',
      };
  }
}

export default function SuccessModal({ lead, onClose }) {
  if (!lead) return null;

  const ui = resolveModalPresentation(lead.deliveryStatus);
  const isEmerald = ui.tone === 'emerald';
  const isBlue = ui.tone === 'blue';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative text-center">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ${
            isEmerald
              ? 'bg-emerald-100 text-emerald-600 ring-emerald-50'
              : isBlue
                ? 'bg-blue-100 text-blue-600 ring-blue-50'
                : 'bg-amber-100 text-amber-600 ring-amber-50'
          }`}
        >
          {isEmerald ? (
            <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
          ) : (
            <Clock className="w-10 h-10 stroke-[2.5]" />
          )}
        </div>

        {/* Badge & ID */}
        <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full mb-2">
          {ui.badge} • {lead.id}
        </div>

        <h3 className="text-xl font-black text-slate-900 mb-2">
          {ui.title}
        </h3>

        <p className="text-sm text-slate-600 mb-4 leading-relaxed">
          Спасибо, <span className="font-bold text-slate-800">{lead.name}</span>! {ui.note}{' '}
          Связь по округу <span className="font-semibold text-blue-600">{lead.district}</span> по номеру{' '}
          <span className="font-bold text-slate-900">{lead.phone}</span>.
        </p>

        {/* Lead details summary */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-left text-xs space-y-1 mb-5">
          <div className="flex justify-between">
            <span className="text-slate-500">Поломка:</span>
            <span className="font-semibold text-slate-800">{lead.breakdown}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Марка:</span>
            <span className="font-semibold text-slate-800">{lead.brand}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Срочность:</span>
            <span className="font-semibold text-slate-800">{lead.urgency}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Скидка:</span>
            <span className="font-bold text-emerald-600">{lead.discount} на работы</span>
          </div>
        </div>

        {/* Action button */}
        <div className="space-y-2">
          <button
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm transition-colors"
          >
            Понятно, закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
