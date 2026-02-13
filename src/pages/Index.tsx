import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { HeroSection } from "@/components/home/HeroSection";
import { BenefitsSection } from "@/components/home/BenefitsSection";
import { HowItWorksSection } from "@/components/home/HowItWorksSection";
import { PricingSection } from "@/components/home/PricingSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { SEOSection } from "@/components/home/SEOSection";
import { FAQSection } from "@/components/home/FAQSection";
import { CTASection } from "@/components/home/CTASection";
import { Footer } from "@/components/layout/Footer";
import { MobileStickyCtA } from "@/components/home/MobileStickyCta";
import { ExitIntentPopup } from "@/components/home/ExitIntentPopup";
import { MessageCircle } from "lucide-react";

// Declare Tawk.to global types
declare global {
  interface Window {
    Tawk_API?: Record<string, unknown>;
    Tawk_LoadStart?: Date;
  }
}

const Index = () => {
  const [showPulse, setShowPulse] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  // Load Tawk.to only on landing page
  useEffect(() => {
    if (!window.Tawk_API) {
      window.Tawk_API = {};
      window.Tawk_LoadStart = new Date();
      
      const script = document.createElement("script");
      script.async = true;
      script.src = 'https://embed.tawk.to/670d2b904304e3196ad16200/1ia5n4bn7';
      script.charset = 'UTF-8';
      script.setAttribute('crossorigin', '*');
      document.head.appendChild(script);
    }

    // Cleanup: hide Tawk.to when leaving the page
    return () => {
      if (window.Tawk_API && typeof window.Tawk_API.hideWidget === 'function') {
        (window.Tawk_API as { hideWidget: () => void }).hideWidget();
      }
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowPulse(true);
      setShowPopup(true);
    }, 10000); // 10 segundos

    return () => clearTimeout(timer);
  }, []);

  const handleWhatsAppClick = () => {
    setShowPulse(false);
    setShowPopup(false);
  };

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Navbar />
      <HeroSection />
      <BenefitsSection />
      <HowItWorksSection />
      <PricingSection />
      <TestimonialsSection />
      <SEOSection />
      <FAQSection />
      <CTASection />
      <Footer />
      
      {/* Mobile Sticky CTA */}
      <MobileStickyCtA />
      
      {/* Exit Intent Popup */}
      <ExitIntentPopup />
      
      {/* Floating WhatsApp Button with Effects */}
      <div className="fixed bottom-24 md:bottom-6 right-6 z-50">
        {/* Popup */}
        {showPopup && (
          <div className="absolute bottom-16 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-3 mb-2 animate-fade-in whitespace-nowrap">
            <div className="text-sm text-gray-700 font-medium">
              Estamos online, tire suas dúvidas
            </div>
            <div className="absolute bottom-0 right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white transform translate-y-full"></div>
          </div>
        )}
        
        {/* WhatsApp Button */}
        <a
          href="https://wa.me/551151986641?text=Quero%20saber%20mais%20sobre%20o%20cardápio%20grátis"
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleWhatsAppClick}
          className={`inline-flex items-center justify-center bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 ${
            showPulse ? 'animate-pulse' : ''
          }`}
          aria-label="Falar no WhatsApp"
        >
          <MessageCircle className="h-6 w-6" />
        </a>
      </div>
    </div>
  );
};

export default Index;
