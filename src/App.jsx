import React, { useState } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Quiz from './components/Quiz';
import TrustSection from './components/TrustSection';
import MastersSection from './components/MastersSection';
import ReviewsSection from './components/ReviewsSection';
import FaqSection from './components/FaqSection';
import Footer from './components/Footer';
import SuccessModal from './components/SuccessModal';
import SocialProofToast from './components/SocialProofToast';
import MobileQuickBar from './components/MobileQuickBar';
import { submitLead } from './services/leadService';

export default function App() {
  const [activeModalLead, setActiveModalLead] = useState(null);

  const handleQuizSubmit = async (newLead) => {
    // 1. Submit to serverless backend (Netlify Function / Telegram / Sheets)
    const result = await submitLead(newLead);

    // 2. Only show success modal if the server confirmed delivery
    if (result.success) {
      setActiveModalLead({
        ...newLead,
        id: result.leadId || newLead.id,
        deliveryStatus: result.deliveryStatus,
        channels: result.channels,
      });
      return { success: true, lead: result.lead };
    }

    // 3. If delivery failed or channels unconfigured, return honest error to form
    return {
      success: false,
      error: result.error,
      message: result.message || 'Сервер не смог подтвердить приём заявки.',
      channels: result.channels,
    };
  };

  const scrollToQuiz = () => {
    const el = document.getElementById('quiz-calculator');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 selection:bg-blue-500 selection:text-white">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="flex-1">
        <Hero onStartQuiz={scrollToQuiz} />
        <Quiz onQuizSubmit={handleQuizSubmit} />
        <TrustSection onSelectService={scrollToQuiz} />
        <MastersSection onSelectMaster={scrollToQuiz} />
        <ReviewsSection />
        <FaqSection />
      </main>

      {/* Footer */}
      <Footer />

      {/* Social Proof Realtime Toast */}
      <SocialProofToast />

      {/* Mobile Sticky Quick Action Bar */}
      <MobileQuickBar onScrollToQuiz={scrollToQuiz} />

      {/* Client Success Modal (Rendered ONLY upon server-confirmed delivery) */}
      {activeModalLead && (
        <SuccessModal
          lead={activeModalLead}
          onClose={() => setActiveModalLead(null)}
        />
      )}
    </div>
  );
}
