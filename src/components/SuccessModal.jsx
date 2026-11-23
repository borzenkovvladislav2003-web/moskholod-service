import React from 'react';
import { CheckCircle2, ShieldCheck, X } from 'lucide-react';

export default function SuccessModal({ lead, onClose }) {
  if (!lead) return null;

  const isPartial = lead.deliveryStatus === 'CONFIRMED_PARTIAL';

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
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50">
          <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
        </div>

        {/* Title */}
        <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full mb-2">
          Заявка {lead.id} подтверждена
        </div>
        <h3 className="text-xl font-black text-slate-900 mb-2">
          {isPartial ? 'Заявка принята в обработку' : 'Уведомление доставлено'}
        </h3>
        <p className="text-sm text-slate-600 mb-4 leading-relaxed">
          Спасибо, <span className="font-bold text-slate-800">{lead.name}</span>! Заявка передана по округу <span className="font-semibold text-blue-600">{lead.district}</span>. 
          Диспетчер свяжется с вами по номеру <span className="font-bold text-slate-900">{lead.phone}</span> для согласования точного времени выезда мастера.
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
