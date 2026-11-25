import { MessageCircle } from "lucide-react";
import { QUESTIONS_WHATSAPP_URL } from "@/lib/signup-cta";
import { Navbar } from "@/components/layout/Navbar";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingProblem } from "@/components/landing/LandingProblem";
import { LandingPillars } from "@/components/landing/LandingPillars";
import { LandingOperation } from "@/components/landing/LandingOperation";
import { LandingClose } from "@/components/landing/LandingClose";
import { LandingFooter } from "@/components/landing/LandingFooter";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <LandingHero />
        <LandingProblem />
        <LandingPillars />
        <LandingOperation />
        <LandingClose />
      </main>
      <LandingFooter />
      <a
        href={QUESTIONS_WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#126b3c] px-4 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-[#0d542e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#126b3c] sm:right-6"
      >
        <MessageCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
        Dúvidas no WhatsApp
      </a>
    </div>
  );
};

export default Index;
