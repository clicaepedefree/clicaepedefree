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
import { MessageCircle } from "lucide-react";

const Index = () => {
  const [showPulse, setShowPulse] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

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
    <div className="min-h-screen">
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
      
      {/* Floating WhatsApp Button with Effects */}
      <div className="fixed bottom-6 right-6 z-50">
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
          href="https://wa.me/5511916924490?text=Quero%20saber%20mais%20sobre%20o%20cardápio%20grátis"
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
