import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  MessageCircle,
  Rocket,
  Bot,
  ShoppingBag,
  CreditCard,
  Package,
  Monitor,
  Smartphone,
  Sparkles,
  Zap,
} from "lucide-react";

export function CTABanner() {
  const handleUpgradeClick = () => {
    const message = encodeURIComponent("quero conhecer o sistema completo");
    window.open(`https://wa.me/5511916651776?text=${message}`, "_blank");
  };

  const handleWhatsAppClick = () => {
    window.open("https://wa.me/5511916651776", "_blank");
  };

  const features = [
    { icon: Bot, title: "Robô de WhatsApp", desc: "Atendimento automático" },
    { icon: ShoppingBag, title: "Integração iFood", desc: "Pedidos centralizados" },
    { icon: CreditCard, title: "Pagamento Online", desc: "Mais praticidade" },
    { icon: Package, title: "Controle de Estoque", desc: "Gestão inteligente" },
    { icon: Monitor, title: "PDV Completo", desc: "Venda com agilidade" },
  ];

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a1e3f] via-[#0f3460] to-[#0d5c4a] shadow-2xl">
      {/* Decorative glows */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-emerald-400/20 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 right-1/3 h-40 w-40 rounded-full bg-cyan-300/10 blur-2xl" />

      {/* Grid pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative px-6 py-8 lg:px-10 lg:py-10">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          {/* LEFT */}
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-sm">
              <Rocket className="h-4 w-4 text-emerald-300" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Aproveite todo o potencial
              </span>
            </div>

            <h2 className="text-3xl font-extrabold leading-tight text-white lg:text-4xl xl:text-5xl">
              Explore os recursos que vão{" "}
              <span className="bg-gradient-to-r from-emerald-300 to-green-400 bg-clip-text text-transparent">
                impulsionar
              </span>{" "}
              seu negócio!
            </h2>

            <p className="max-w-xl text-sm leading-relaxed text-blue-100/90 lg:text-base">
              Automatize seu atendimento, venda mais e gerencie seu negócio em um só lugar
              com recursos inteligentes desenvolvidos para restaurantes.
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              <Button
                onClick={handleUpgradeClick}
                size="lg"
                className="group h-12 rounded-xl bg-gradient-to-r from-emerald-400 to-green-500 px-6 font-bold text-[#0a1e3f] shadow-lg shadow-emerald-500/30 hover:from-emerald-300 hover:to-green-400 hover:shadow-emerald-400/50"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                CONHECER SISTEMA COMPLETO
              </Button>
              <Button
                onClick={handleWhatsAppClick}
                size="lg"
                variant="outline"
                className="h-12 rounded-xl border-white/30 bg-white/5 px-6 font-bold text-white backdrop-blur-sm hover:bg-white/15 hover:text-white"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                FALAR COM A EQUIPE
              </Button>
            </div>
          </div>

          {/* RIGHT — Illustration */}
          <div className="relative hidden lg:block">
            <div className="relative mx-auto h-72 w-full max-w-sm">
              {/* Glow behind phone */}
              <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-emerald-400/40 to-cyan-400/30 blur-2xl" />

              {/* Phone */}
              <div className="absolute left-1/2 top-1/2 flex h-64 w-32 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[2rem] border border-white/20 bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl">
                <div className="flex h-[95%] w-[92%] flex-col items-center justify-center gap-2 rounded-[1.6rem] bg-gradient-to-br from-[#0a1e3f] to-[#0d5c4a] p-3">
                  <Smartphone className="h-8 w-8 text-emerald-300" />
                  <div className="h-1 w-10 rounded-full bg-white/30" />
                  <div className="h-1 w-8 rounded-full bg-white/20" />
                  <div className="mt-2 flex gap-1">
                    <div className="h-6 w-6 rounded-md bg-emerald-400/80" />
                    <div className="h-6 w-6 rounded-md bg-cyan-400/80" />
                  </div>
                  <div className="flex gap-1">
                    <div className="h-6 w-6 rounded-md bg-blue-400/80" />
                    <div className="h-6 w-6 rounded-md bg-yellow-400/80" />
                  </div>
                </div>
              </div>

              {/* Floating icon badges */}
              <div className="absolute left-2 top-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 shadow-xl shadow-emerald-500/40 animate-float">
                <MessageCircle className="h-7 w-7 text-white" />
              </div>
              <div className="absolute right-2 top-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 shadow-xl shadow-red-500/40 animate-float animation-delay-200">
                <ShoppingBag className="h-7 w-7 text-white" />
              </div>
              <div className="absolute bottom-8 left-0 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-500 shadow-xl shadow-blue-500/40 animate-float animation-delay-400">
                <CreditCard className="h-7 w-7 text-white" />
              </div>
              <div className="absolute bottom-4 right-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-400 to-fuchsia-500 shadow-xl shadow-purple-500/40 animate-float animation-delay-300">
                <Monitor className="h-7 w-7 text-white" />
              </div>

              {/* Sparkles */}
              <Sparkles className="absolute right-16 top-0 h-5 w-5 text-yellow-300 animate-pulse" />
              <Zap className="absolute left-8 bottom-0 h-5 w-5 text-yellow-300 animate-pulse" />
              <Sparkles className="absolute right-0 top-1/2 h-4 w-4 text-cyan-200 animate-pulse animation-delay-500" />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="my-7 h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* Features strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {features.map((f, i) => (
            <div
              key={i}
              className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-emerald-300/40 hover:bg-white/10"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 ring-1 ring-white/10 group-hover:from-emerald-400/40 group-hover:to-cyan-400/40">
                <f.icon className="h-5 w-5 text-emerald-300" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-white">{f.title}</p>
                <p className="truncate text-[11px] text-blue-100/70">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
