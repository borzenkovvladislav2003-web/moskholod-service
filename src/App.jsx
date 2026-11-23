import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Quiz from './components/Quiz';
import TrustSection from './components/TrustSection';
import Footer from './components/Footer';
import SuccessModal from './components/SuccessModal';
import DispatcherPanel from './components/DispatcherPanel';
import SocialProofToast from './components/SocialProofToast';
import { submitLead } from './services/leadService';
import { Wrench } from 'lucide-react';

const INITIAL_DEMO_LEADS = [
  {
    id: 'REQ-1042',
    name: 'Алексей',
    phone: '+7 (926) 381-90-12',
    breakdown: 'Не морозит / слабо холодит',
    brand: 'Bosch',
    district: 'САО (Северный)',
    metro: 'м. Сокол',
    urgency: 'Срочно (в течение 45–90 минут)',
    discount: '15%',
    estimatedPrice: 'от 1 650 ₽',
    status: 'IN_PROGRESS',
    createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
  },
  {
    id: 'REQ-1038',
    name: 'Ирина Сергеевна',
    phone: '+7 (916) 554-18-90',
    breakdown: 'Течёт вода (внутри или под ним)',
    brand: 'Samsung',
    district: 'ЮЗАО (Юго-Западный)',
    metro: 'м. Университет',
    urgency: 'Сегодня во второй половине дня',
    discount: '15%',
    estimatedPrice: 'от 1 150 ₽',
    status: 'DONE',
    createdAt: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
  }
];

export default function App() {
  const [leads, setLeads] = useState(() => {
    const saved = localStorage.getItem('sergey_leads');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_DEMO_LEADS;
      }
    }
    return INITIAL_DEMO_LEADS;
  });

  const [activeModalLead, setActiveModalLead] = useState(null);
  const [isDispatcherOpen, setIsDispatcherOpen] = useState(false);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('sergey_leads', JSON.stringify(leads));
  }, [leads]);

  const handleQuizSubmit = async (newLead) => {
    // 1. Optimistic local update
    setLeads((prev) => [newLead, ...prev]);
    setActiveModalLead(newLead);

    // 2. Submit to serverless backend (Netlify Function / Telegram / Sheets)
    await submitLead(newLead);
  };

  const handleUpdateStatus = (id, newStatus) => {
    setLeads((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
  };

  const handleAddDemoLead = async () => {
    const mockNames = ['Михаил', 'Елена', 'Дмитрий', 'Ольга', 'Владимир', 'Сергей'];
    const mockBrands = ['Liebherr', 'Indesit', 'Атлант', 'LG', 'Haier', 'Bosch'];
    const mockDistricts = ['ЦАО (Тверской)', 'ЗАО (Кунцево)', 'СВАО (ВДНХ)', 'ЮАО (Автозаводская)', 'САО (Аэропорт)'];
    const mockBreakdowns = ['Не морозит верхняя камера', 'Сильный шум компрессора', 'Намерзает толстый лёд', 'Не включается'];

    const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

    const demoLead = {
      id: 'REQ-' + Math.floor(1000 + Math.random() * 9000),
      name: randomItem(mockNames),
      phone: `+7 (9${Math.floor(10 + Math.random() * 89)}) ${Math.floor(100 + Math.random() * 899)}-${Math.floor(10 + Math.random() * 89)}-${Math.floor(10 + Math.random() * 89)}`,
      brand: randomItem(mockBrands),
      breakdown: randomItem(mockBreakdowns),
      district: randomItem(mockDistricts),
      metro: 'рядом с метро',
      urgency: 'Срочно (в течение 45–90 минут)',
      discount: '15%',
      estimatedPrice: 'от 1 450 ₽',
      status: 'NEW',
      createdAt: new Date().toISOString(),
    };

    setLeads((prev) => [demoLead, ...prev]);
    await submitLead(demoLead);
  };

  const handleClearLeads = () => {
    if (window.confirm('Очистить список заявок в локальной базе?')) {
      setLeads([]);
    }
  };

  const scrollToQuiz = () => {
    const el = document.getElementById('quiz-calculator');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const newLeadsCount = leads.filter((l) => l.status === 'NEW').length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 selection:bg-blue-500 selection:text-white">
      {/* Header */}
      <Header onOpenDispatcher={() => setIsDispatcherOpen(true)} />

      {/* Main Content */}
      <main className="flex-1">
        <Hero onStartQuiz={scrollToQuiz} />
        <Quiz onQuizSubmit={handleQuizSubmit} />
        <TrustSection onSelectService={scrollToQuiz} />
      </main>

      {/* Footer */}
      <Footer onOpenDispatcher={() => setIsDispatcherOpen(true)} />

      {/* Social Proof Realtime Toast */}
      <SocialProofToast />

      {/* Floating Dispatcher Trigger for Mobile / Sergey Preview */}
      <div className="fixed bottom-4 right-4 z-30">
        <button
          onClick={() => setIsDispatcherOpen(true)}
          className="flex items-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl shadow-xl shadow-slate-900/30 border border-slate-700 text-xs font-bold transition-all transform hover:scale-105 active:scale-95"
        >
          <Wrench className="w-4 h-4 text-blue-400" />
          <span>Лид-Хаб Сергея</span>
          {newLeadsCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-black animate-pulse">
              {newLeadsCount}
            </span>
          )}
        </button>
      </div>

      {/* Client Success Modal */}
      {activeModalLead && (
        <SuccessModal
          lead={activeModalLead}
          onClose={() => setActiveModalLead(null)}
        />
      )}

      {/* Dispatcher Lead Hub Modal */}
      {isDispatcherOpen && (
        <DispatcherPanel
          leads={leads}
          onClose={() => setIsDispatcherOpen(false)}
          onUpdateStatus={handleUpdateStatus}
          onAddDemoLead={handleAddDemoLead}
          onClearLeads={handleClearLeads}
        />
      )}
    </div>
  );
}
