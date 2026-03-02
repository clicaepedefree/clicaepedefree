import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Shield, CreditCard, FileText, Percent, Crown, Rocket, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

const whatsappLink = (message: string) =>
  `https://wa.me/5511934963958?text=${encodeURIComponent(message)}`;

interface PlanProps {
  name: string;
  price: string;
  priceLabel?: string;
  highlight?: boolean;
  badge?: string;
  features: string[];
  cta: { label: string; href: string; isExternal?: boolean };
  icon: React.ReactNode;
  color: string;
}

function PlanCard({ plan, isVisible, delay }: { plan: PlanProps; isVisible: boolean; delay: number }) {
  return (
    <div
      className={`${isVisible ? "animate-fade-in-up" : "opacity-0"}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <Card
        className={`relative h-full rounded-3xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${
          plan.highlight
            ? "border-2 border-emerald-400 shadow-xl shadow-emerald-500/10"
            : "border border-gray-200 shadow-lg"
        }`}
      >
        {plan.badge && (
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-400 text-white text-center py-2 font-semibold text-sm">
            {plan.badge}
          </div>
        )}
        <CardContent className="p-6 md:p-8 flex flex-col h-full">
          {/* Icon + Name */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2.5 rounded-xl ${plan.color}`}>{plan.icon}</div>
            <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
          </div>

          {/* Price */}
          <div className="mb-6">
            <span className="text-4xl font-extrabold text-gray-900">{plan.price}</span>
            {plan.priceLabel && <span className="text-gray-500 ml-1">{plan.priceLabel}</span>}
          </div>

          {/* Features */}
          <ul className="space-y-3 mb-8 flex-1">
            {plan.features.map((f, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <div className="bg-emerald-100 rounded-full p-1 mt-0.5 flex-shrink-0">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <span className="text-gray-700 text-sm">{f}</span>
              </li>
            ))}
          </ul>

          {/* CTA */}
          {plan.cta.isExternal ? (
            <a
              href={plan.cta.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center justify-center w-full py-4 rounded-xl font-bold text-base transition-all duration-300 hover:scale-[1.02] ${
                plan.highlight
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/25"
                  : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/25"
              }`}
            >
              {plan.cta.label}
            </a>
          ) : (
            <Button
              size="lg"
              className={`w-full py-6 rounded-xl font-bold text-base ${
                plan.highlight
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/25"
                  : "bg-gray-900 hover:bg-gray-800 shadow-lg"
              }`}
              asChild
            >
              <Link to={plan.cta.href}>{plan.cta.label}</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function PricingSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const plans: PlanProps[] = [
    {
      name: "Grátis",
      price: "Grátis",
      priceLabel: "até 100 pedidos/mês",
      highlight: true,
      badge: "⚡ Mais de 1.000 restaurantes já usam",
      icon: <Rocket className="w-5 h-5 text-white" />,
      color: "bg-emerald-500",
      features: [
        "Cardápio digital ilimitado",
        "Pedidos automáticos no WhatsApp",
        "Impressão de pedidos",
        "Gestão de pedidos (kanban)",
        "Adicionais e personalizações",
        "Relatórios de vendas",
        "Painel administrativo",
        "Suporte via WhatsApp",
        "Sem limite de produtos",
        "Atualizações gratuitas",
      ],
      cta: { label: "Criar meu cardápio grátis", href: "/criar-conta" },
    },
    {
      name: "Básico",
      price: "R$119",
      priceLabel: "/mês",
      icon: <Star className="w-5 h-5 text-white" />,
      color: "bg-blue-500",
      features: [
        "PDV Balcão",
        "Cardápio Digital",
        "Integração com iFood e 99Food",
        "Pagamento Online (PIX e Cartão)",
        "Robô de WhatsApp",
        "Relatórios de Gestão",
        "Programa de Fidelidade",
        "Cashback e Cupom de Desconto",
      ],
      cta: {
        label: "Quero conhecer o Plano Básico",
        href: whatsappLink("Quero conhecer o plano Básico"),
        isExternal: true,
      },
    },
    {
      name: "Profissional",
      price: "R$199",
      priceLabel: "/mês",
      icon: <Crown className="w-5 h-5 text-white" />,
      color: "bg-purple-500",
      features: [
        "Tudo do Plano Básico +",
        "Atendimento de Mesas (App do Garçom)",
        "PDV Balcão",
        "Contas a Pagar/Receber",
        "Controle de Estoque",
        "Ficha Técnica",
      ],
      cta: {
        label: "Quero conhecer o Plano Profissional",
        href: whatsappLink("Quero conhecer o plano Profissional"),
        isExternal: true,
      },
    },
    {
      name: "Completo",
      price: "R$269",
      priceLabel: "/mês",
      badge: "🏆 Mais completo",
      icon: <Shield className="w-5 h-5 text-white" />,
      color: "bg-gradient-to-r from-orange-500 to-amber-500",
      features: [
        "Tudo do Plano Profissional +",
        "Emissão de NFCe e NFe",
        "Relatórios Avançados",
        "Suporte Prioritário",
        "App do Motoboy + Painel de Entrega",
        "KDS",
        "Recuperador de Vendas (Disparo WhatsApp)",
      ],
      cta: {
        label: "Quero conhecer o Plano Completo",
        href: whatsappLink("Quero conhecer o plano Completo"),
        isExternal: true,
      },
    },
  ];

  const guarantees = [
    { icon: CreditCard, text: "Sem cartão", subtext: "Não pedimos cartão no cadastro" },
    { icon: FileText, text: "Sem contrato", subtext: "Cancele quando quiser" },
    { icon: Percent, text: "Sem taxa por pedido", subtext: "100% do lucro é seu" },
  ];

  return (
    <section id="planos" className="py-24 relative overflow-hidden" ref={sectionRef}>
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-emerald-600" />
      <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl animate-float animation-delay-300" />
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className={`text-center mb-12 ${isVisible ? "animate-fade-in-up" : "opacity-0"}`}>
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md rounded-full px-6 py-3 mb-6 border border-white/30">
            <span className="text-2xl">🎯</span>
            <span className="font-semibold text-white">Escolha o plano ideal para você</span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6">
            Planos para cada fase do seu negócio
          </h2>
          <p className="text-xl text-white/90 max-w-3xl mx-auto">
            Comece grátis e evolua conforme sua necessidade.
            <br />
            <strong>Sem taxa por pedido — o lucro é 100% seu.</strong>
          </p>
        </div>

        {/* Guarantees */}
        <div className={`max-w-3xl mx-auto grid sm:grid-cols-3 gap-4 mb-12 ${isVisible ? "animate-fade-in-up animation-delay-100" : "opacity-0"}`}>
          {guarantees.map((item, index) => (
            <div key={index} className="flex items-center gap-3 justify-center bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <item.icon className="w-6 h-6 text-emerald-300" />
              <div>
                <div className="font-bold text-white">{item.text}</div>
                <div className="text-xs text-white/70">{item.subtext}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Plans grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {plans.map((plan, i) => (
            <PlanCard key={i} plan={plan} isVisible={isVisible} delay={150 + i * 100} />
          ))}
        </div>

        {/* Footer */}
        <p className={`text-center text-sm text-white/70 mt-8 flex items-center justify-center gap-2 ${isVisible ? "animate-fade-in-up animation-delay-500" : "opacity-0"}`}>
          <Shield className="w-4 h-4" />
          Leva menos de 5 minutos • Sem cartão • Grátis todo mês
        </p>
      </div>
    </section>
  );
}
