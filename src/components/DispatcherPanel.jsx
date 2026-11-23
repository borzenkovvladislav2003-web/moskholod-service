import React, { useState } from 'react';
import { 
  X, 
  Send, 
  Phone, 
  MessageCircle, 
  CheckCircle, 
  Clock, 
  User, 
  MapPin, 
  Wrench, 
  ShieldAlert, 
  PlusCircle, 
  Trash2,
  Bell,
  Table
} from 'lucide-react';

export default function DispatcherPanel({ leads, onClose, onUpdateStatus, onAddDemoLead, onClearLeads }) {
  const [config, setConfig] = useState(() => {
    return {
      botToken: localStorage.getItem('sergey_tg_token') || '',
      chatId: localStorage.getItem('sergey_tg_chat_id') || '',
      sheetsUrl: localStorage.getItem('sergey_sheets_url') || '',
    };
  });
  const [saveStatus, setSaveStatus] = useState('');

  const handleSaveConfig = (e) => {
    e.preventDefault();
    localStorage.setItem('sergey_tg_token', config.botToken);
    localStorage.setItem('sergey_tg_chat_id', config.chatId);
    localStorage.setItem('sergey_sheets_url', config.sheetsUrl);
    setSaveStatus('Настройки сохранены!');
    setTimeout(() => setSaveStatus(''), 2500);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'NEW':
        return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[11px] font-bold animate-pulse">🔥 Новый</span>;
      case 'IN_PROGRESS':
        return <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[11px] font-bold">⏳ Взят мастером</span>;
      case 'DONE':
        return <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[11px] font-bold">✅ Закрыт</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-bold">{status}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg">Лид-Хаб Сергея (Диспетчерская)</h3>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Онлайн
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Ремонт холодильников • Оффер 1 (Москва)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action bar */}
        <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <Bell className="w-4 h-4 text-blue-600" />
            <span>Всего заявок: {leads.length}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onAddDemoLead}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Сэмулировать лид</span>
            </button>

            {leads.length > 0 && (
              <button
                onClick={onClearLeads}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-slate-500 hover:text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 transition-colors"
                title="Очистить тестовые заявки"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Очистить</span>
              </button>
            )}
          </div>
        </div>

        {/* Leads List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {leads.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Clock className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-slate-800 mb-1">
                Пока нет входящих заявок
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                Заполните форму квиза на сайте или нажмите кнопку «+ Сэмулировать лид», чтобы увидеть, как карточка мгновенно падает диспетчеру.
              </p>
              <button
                onClick={onAddDemoLead}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-md hover:bg-blue-700"
              >
                Создать тестовую заявку сейчас
              </button>
            </div>
          ) : (
            leads.map((lead) => {
              const cleanPhone = lead.phone ? lead.phone.replace(/\D/g, '') : '';
              return (
                <div 
                  key={lead.id} 
                  className={`border rounded-2xl p-4 transition-all ${
                    lead.status === 'NEW' 
                      ? 'border-red-200 bg-red-50/30 shadow-sm' 
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-sm">{lead.id}</span>
                      {getStatusBadge(lead.status)}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-3">
                    <div>
                      <span className="text-slate-500">Клиент: </span>
                      <span className="font-bold text-slate-900">{lead.name || 'Аноним'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Телефон: </span>
                      <a href={`tel:${cleanPhone}`} className="font-bold text-blue-600 hover:underline">
                        {lead.phone}
                      </a>
                    </div>
                    <div>
                      <span className="text-slate-500">Поломка: </span>
                      <span className="font-semibold text-slate-800">{lead.breakdown}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Марка: </span>
                      <span className="font-semibold text-slate-800">{lead.brand}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Район: </span>
                      <span className="font-semibold text-slate-800">{lead.district} {lead.metro && `(${lead.metro})`}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Срочность: </span>
                      <span className="font-semibold text-slate-800">{lead.urgency}</span>
                    </div>
                  </div>

                  {/* Dispatcher Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${cleanPhone}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Позвонить</span>
                      </a>
                      <a
                        href={`https://wa.me/${cleanPhone}?text=Здравствуйте,%20${encodeURIComponent(lead.name || '')}!%20Вы%20оставляли%20заявку%20на%20ремонт%20холодильника%20${encodeURIComponent(lead.brand || '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-xs"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>WhatsApp</span>
                      </a>
                    </div>

                    {/* Status change buttons */}
                    <div className="flex items-center gap-1">
                      {lead.status === 'NEW' && (
                        <button
                          onClick={() => onUpdateStatus(lead.id, 'IN_PROGRESS')}
                          className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-100 hover:bg-amber-200 text-amber-800"
                        >
                          Взять в работу
                        </button>
                      )}
                      {lead.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => onUpdateStatus(lead.id, 'DONE')}
                          className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800"
                        >
                          Завершить
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Telegram & Sheets Integrations (Footer) */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 shrink-0 text-xs">
          <details className="cursor-pointer">
            <summary className="font-bold text-slate-800 hover:text-blue-600 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-blue-500" />
                Настройка боевой отправки (Telegram + Google Таблица)
              </span>
              <span className="text-slate-400 font-normal">развернуть</span>
            </summary>
            <form onSubmit={handleSaveConfig} className="mt-3 space-y-2.5">
              <p className="text-slate-500 text-[11px]">
                Впишите данные Telegram-бота и ссылку на Google Таблицу Сергея. Заявки будут параллельно лететь в Telegram со звуком и логироваться в Google Sheets.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Telegram Bot Token:</label>
                  <input
                    type="text"
                    placeholder="71829...:AA..."
                    value={config.botToken}
                    onChange={(e) => setConfig({ ...config, botToken: e.target.value })}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs w-full font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Telegram Chat ID:</label>
                  <input
                    type="text"
                    placeholder="-100... или @channel"
                    value={config.chatId}
                    onChange={(e) => setConfig({ ...config, chatId: e.target.value })}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs w-full font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Google Sheets Webhook URL:</label>
                <input
                  type="text"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={config.sheetsUrl}
                  onChange={(e) => setConfig({ ...config, sheetsUrl: e.target.value })}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs w-full font-mono"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-colors"
                >
                  Сохранить интеграции
                </button>
                {saveStatus && <span className="text-emerald-600 font-bold">{saveStatus}</span>}
              </div>
            </form>
          </details>
        </div>
      </div>
    </div>
  );
}
