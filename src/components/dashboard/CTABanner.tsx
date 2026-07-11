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
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a1e3f] via-[#0f3460] to-[#0d5c4a] shadow-xl">
      {/* Subtle glows */}
      <div className="pointer-events-none absolute -top-16 -left-16 h-48 w-48 rounded-full bg-blue-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-10 h-56 w-56 rounded-full bg-emerald-400/15 blur-3xl" />

      <div className="relative px-4 py-5 lg:px-6 lg:py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* LEFT */}
          <div className="space-y-3 lg:max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 backdrop-blur-sm">
              <Rocket className="h-3 w-3 text-emerald-300" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-white">
                Aproveite todo o potencial
              </span>
            </div>

            <h2 className="text-xl font-extrabold leading-tight text-white lg:text-2xl">
              Explore os recursos que vão{" "}
              <span className="bg-gradient-to-r from-emerald-300 to-green-400 bg-clip-text text-transparent">
                impulsionar
              </span>{" "}
              seu negócio!
            </h2>

            <p className="max-w-xl text-xs leading-relaxed text-blue-100/90">
              Automatize seu atendimento, venda mais e gerencie seu negócio em um só lugar
              com recursos inteligentes desenvolvidos para restaurantes.
            </p>

            <div className="flex flex-wrap gap-2 pt-0.5">
              <Button
                onClick={handleUpgradeClick}
                className="group h-9 rounded-lg bg-gradient-to-r from-emerald-400 to-green-500 px-4 text-xs font-bold text-[#0a1e3f] shadow-md shadow-emerald-500/25 hover:from-emerald-300 hover:to-green-400"
              >
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                CONHECER SISTEMA COMPLETO
              </Button>
              <Button
                onClick={handleWhatsAppClick}
                variant="outline"
                className="h-9 rounded-lg border-white/30 bg-white/5 px-4 text-xs font-bold text-white backdrop-blur-sm hover:bg-white/15 hover:text-white"
              >
                <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                FALAR COM A EQUIPE
              </Button>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="my-4 h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* Features strip */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {features.map((f, i) => (
            <div
              key={i}
              className="group flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-2 backdrop-blur-sm transition-all hover:border-emerald-300/40 hover:bg-white/10"
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 ring-1 ring-white/10 group-hover:from-emerald-400/40 group-hover:to-cyan-400/40">
                <f.icon className="h-4 w-4 text-emerald-300" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-bold text-white">{f.title}</p>
                <p className="truncate text-[10px] text-blue-100/70">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
