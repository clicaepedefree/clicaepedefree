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
    </div>
  );
};

export default Index;
