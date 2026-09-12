import { Button } from "@/components/ui/button";
import { ArrowRight, PlayCircle, ShieldCheck, Clock3, Sparkles } from "lucide-react";
import { scrollToPlans } from "@/lib/signup-cta";
import devices from "@/assets/mockup-devices.png";

const scrollTo = (id: string) => () => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

export function LandingHero() {
  return (
    <section className="relative overflow-hidden bg-ink text-white">
      <div className="absolute inset-0 bg-gradient-ink" />
      <div className="absolute -top-32 -left-24 h-[26rem] w-[26rem] rounded-full bg-flame/25 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-[30rem] w-[30rem] rounded-full bg-primary-glow/20 blur-3xl" />
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "linear-gradient(hsl(0 0% 100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100%) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="container relative z-10 mx-auto px-4 py-16 md:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          <div className="text-center lg:text-left">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm backdrop-blur">
              <Sparkles className="h-4 w-4 text-flame" />
              <span className="font-medium">10 dias grátis • Plano único R$ 99,90/mês</span>
            </div>

            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
              Seu restaurante vende.
              <br />
              <span className="bg-gradient-flame bg-clip-text text-transparent">A gente faz ele vender mais.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/75 lg:mx-0">
              Automatize seu atendimento, recupere clientes, aumente a recorrência e gerencie sua
              operação em um único sistema.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Button
                size="lg"
                onClick={scrollToPlans}
                className="group h-14 rounded-2xl bg-gradient-flame px-8 text-base font-bold text-flame-foreground shadow-[var(--shadow-flame)] transition-transform hover:scale-[1.02]"
              >
                COMEÇAR TESTE GRÁTIS
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={scrollTo("como-funciona")}
                className="h-14 rounded-2xl border-white/25 bg-white/5 px-8 text-base font-semibold text-white hover:bg-white/10 hover:text-white"
              >
                <PlayCircle className="mr-2 h-5 w-5" />
                VER COMO FUNCIONA
              </Button>
            </div>

            <div className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/60 lg:justify-start">
              <span className="inline-flex items-center gap-2">
                <Clock3 className="h-4 w-4" /> Teste grátis por 10 dias
              </span>
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> Plano único: R$ 99,90/mês
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-6 rounded-[3rem] bg-flame/20 blur-3xl" />
            <img
              src={devices}
              alt="Sistema de gestão para restaurantes em computador, tablet e celular"
              className="relative w-full drop-shadow-2xl"
              loading="eager"
            />
          </div>
        </div>
      </div>

      {/* Barra de benefícios */}
      <div className="relative z-10 border-t border-white/10 bg-white/[0.04] backdrop-blur">
        <div className="container mx-auto grid grid-cols-2 gap-y-4 px-4 py-5 text-center text-sm font-semibold uppercase tracking-wide text-white/80 md:grid-cols-4">
          <span>Mais vendas</span>
          <span>Mais recorrência</span>
          <span>Atendimento mais rápido</span>
          <span>Menos trabalho manual</span>
        </div>
      </div>
    </section>
  );
}
