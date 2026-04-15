import { Card, CardContent } from "@/components/ui/card";
import { Check, X, Shield, CreditCard, FileText, Percent, Crown, Rocket, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const whatsappLink = (message: string) =>
  `https://wa.me/5511916651776?text=${encodeURIComponent(message)}`;

interface Feature {
  label: string;
  plans: boolean[]; // [gratis, basico, profissional, completo]
}

const allFeatures: Feature[] = [
  { label: "Cardápio digital ilimitado", plans: [true, true, true, true] },
  { label: "PDV Balcão", plans: [false, true, true, true] },
  { label: "Integração iFood e 99Food", plans: [false, true, true, true] },
  { label: "Pagamento Online (PIX/Cartão)", plans: [false, true, true, true] },
  { label: "Robô de WhatsApp", plans: [false, true, true, true] },
  { label: "Relatórios de Gestão", plans: [false, true, true, true] },
  { label: "Programa de Fidelidade", plans: [false, true, true, true] },
  { label: "Cashback e Cupom de Desconto", plans: [false, true, true, true] },
  { label: "Cadastro de Clientes", plans: [false, true, true, true] },
  { label: "Suporte WhatsApp 24/7", plans: [false, true, true, true] },
  { label: "Áreas de entrega por KM/Bairro", plans: [false, true, true, true] },
  { label: "Atendimento de Mesas (Garçom)", plans: [false, false, true, true] },
  { label: "Contas a Pagar/Receber", plans: [false, false, true, true] },
  { label: "Controle de Estoque", plans: [false, false, true, true] },
  { label: "Ficha Técnica", plans: [false, false, true, true] },
  { label: "Emissão de NFCe e NFe", plans: [false, false, false, true] },
  { label: "Relatórios Avançados", plans: [false, false, false, true] },
  { label: "App Motoboy + Painel Entrega", plans: [false, false, false, true] },
  { label: "KDS", plans: [false, false, false, true] },
  { label: "Recuperador de Vendas (WhatsApp)", plans: [false, false, false, true] },
];

interface PlanMeta {
  name: string;
  price: string;
  priceLabel?: string;
  highlight?: boolean;
  badge?: string;
  icon: React.ReactNode;
  color: string;
  cta: { label: string; href: string; isExternal?: boolean };
}

const plans: PlanMeta[] = [
  {
    name: "Grátis",
    price: "R$0",
    priceLabel: "até 30 pedidos/mês • após: R$39,90/mês",
    highlight: true,
    badge: "⚡ Mais popular",
    icon: <Rocket className="w-4 h-4 text-white" />,
    color: "bg-emerald-500",
    cta: { label: "Criar meu cardápio grátis", href: "/criar-conta" },
  },
  {
    name: "Básico",
    price: "R$109,90",
    priceLabel: "/mês • pedidos ilimitados",
    icon: <Star className="w-4 h-4 text-white" />,
    color: "bg-blue-500",
    cta: {
      label: "Quero o Básico",
      href: whatsappLink("Quero conhecer o plano Básico"),
      isExternal: true,
    },
  },
  {
    name: "Essencial",
    price: "R$199,50",
    priceLabel: "/mês • pedidos ilimitados",
    icon: <Crown className="w-4 h-4 text-white" />,
    color: "bg-purple-500",
    cta: {
      label: "Quero o Essencial",
      href: whatsappLink("Quero conhecer o plano Essencial"),
      isExternal: true,
    },
  },
  {
    name: "Completo",
    price: "R$249,30",
    priceLabel: "/mês • pedidos ilimitados",
    badge: "🏆 Mais completo",
    icon: <Shield className="w-4 h-4 text-white" />,
    color: "bg-gradient-to-r from-orange-500 to-amber-500",
    cta: {
      label: "Quero o Completo",
      href: whatsappLink("Quero conhecer o plano Completo"),
      isExternal: true,
    },
  },
];

function MobileCards({ isVisible }: { isVisible: boolean }) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className={`md:hidden ${isVisible ? "animate-fade-in-up" : "opacity-0"}`}>
      {/* Tab selector */}
      <div className="flex gap-1 mb-4 bg-white/10 backdrop-blur-sm rounded-xl p-1">
        {plans.map((plan, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className={`flex-1 text-xs font-bold py-2 px-1 rounded-lg transition-all ${
              activeTab === i
                ? "bg-white text-gray-900 shadow-md"
                : "text-white/80 hover:text-white"
            }`}
          >
            {plan.name}
          </button>
        ))}
      </div>

      {/* Active plan card */}
      <Card className="rounded-2xl border-0 shadow-xl overflow-hidden">
        {plans[activeTab].badge && (
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-400 text-white text-center py-1.5 font-semibold text-xs">
            {plans[activeTab].badge}
          </div>
        )}
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <div className={`p-1.5 rounded-lg ${plans[activeTab].color}`}>
              {plans[activeTab].icon}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{plans[activeTab].name}</h3>
            </div>
          </div>
          <div className="mb-4">
            <span className="text-3xl font-extrabold text-gray-900">{plans[activeTab].price}</span>
            {plans[activeTab].priceLabel && (
              <span className="text-gray-500 text-sm ml-1">{plans[activeTab].priceLabel}</span>
            )}
          </div>

          {/* Features */}
          <div className="space-y-1.5 mb-4 max-h-[320px] overflow-y-auto">
            {allFeatures.map((feature, fi) => {
              const included = feature.plans[activeTab];
              return (
                <div
                  key={fi}
                  className={`flex items-center gap-2 py-1 ${
                    !included ? "opacity-60" : ""
                  }`}
                >
                  {included ? (
                    <div className="bg-emerald-100 rounded-full p-0.5 flex-shrink-0">
                      <Check className="h-3 w-3 text-emerald-600" />
                    </div>
                  ) : (
                    <div className="bg-red-100 rounded-full p-0.5 flex-shrink-0">
                      <X className="h-3 w-3 text-red-500" />
                    </div>
                  )}
                  <span
                    className={`text-xs ${
                      included
                        ? "text-gray-700"
                        : "text-red-400 line-through"
                    }`}
                  >
                    {feature.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* CTA */}
          {plans[activeTab].cta.isExternal ? (
            <a
              href={plans[activeTab].cta.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center justify-center w-full py-3 rounded-xl font-bold text-sm text-center transition-all duration-300 ${
                plans[activeTab].highlight
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg"
                  : "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg"
              }`}
            >
              {plans[activeTab].cta.label}
            </a>
          ) : (
            <Button
              size="lg"
              className={`w-full py-3 rounded-xl font-bold text-sm ${
                plans[activeTab].highlight
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg"
                  : "bg-gray-900 hover:bg-gray-800 shadow-lg"
              }`}
              asChild
            >
              <Link to={plans[activeTab].cta.href}>{plans[activeTab].cta.label}</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DesktopTable({ isVisible }: { isVisible: boolean }) {
  return (
    <div className={`hidden md:block ${isVisible ? "animate-fade-in-up animation-delay-200" : "opacity-0"}`}>
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
        <table className="w-full">
          {/* Header */}
          <thead>
            <tr>
              <th className="text-left p-4 lg:p-5 w-[28%] bg-gray-50">
                <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Recursos</span>
              </th>
              {plans.map((plan, i) => (
                <th key={i} className={`p-3 lg:p-4 text-center relative ${plan.highlight ? "bg-emerald-50" : ""}`}>
                  {plan.badge && (
                    <div className="absolute -top-0 left-0 right-0 bg-gradient-to-r from-emerald-500 to-emerald-400 text-white text-[10px] font-bold py-1">
                      {plan.badge}
                    </div>
                  )}
                  <div className={`inline-flex p-1.5 rounded-lg ${plan.color} mb-1.5 ${plan.badge ? "mt-5" : ""}`}>
                    {plan.icon}
                  </div>
                  <div className="text-sm font-bold text-gray-900">{plan.name}</div>
                  <div className="mt-1">
                    <span className="text-xl lg:text-2xl font-extrabold text-gray-900">{plan.price}</span>
                    {plan.priceLabel && (
                      <span className="text-gray-400 text-xs ml-0.5">{plan.priceLabel}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          {/* Body */}
          <tbody>
            {allFeatures.map((feature, fi) => (
              <tr key={fi} className={fi % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                <td className="px-4 lg:px-5 py-2 text-xs lg:text-sm text-gray-700 font-medium">
                  {feature.label}
                </td>
                {feature.plans.map((included, pi) => (
                  <td
                    key={pi}
                    className={`px-2 py-2 text-center ${plans[pi].highlight ? "bg-emerald-50/50" : ""}`}
                  >
                    {included ? (
                      <div className="inline-flex items-center justify-center bg-emerald-100 rounded-full p-1">
                        <Check className="h-3 w-3 text-emerald-600" />
                      </div>
                    ) : (
                      <div className="inline-flex items-center justify-center bg-red-100 rounded-full p-1">
                        <X className="h-3 w-3 text-red-500" />
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {/* Footer CTAs */}
          <tfoot>
            <tr className="border-t border-gray-200">
              <td className="p-4"></td>
              {plans.map((plan, i) => (
                <td key={i} className="p-3 lg:p-4 text-center">
                  {plan.cta.isExternal ? (
                    <a
                      href={plan.cta.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center justify-center w-full py-2.5 rounded-xl font-bold text-xs lg:text-sm transition-all duration-300 hover:scale-[1.02] ${
                        plan.highlight
                          ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25"
                          : "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/25"
                      }`}
                    >
                      {plan.cta.label}
                    </a>
                  ) : (
                    <Button
                      size="sm"
                      className={`w-full py-2.5 rounded-xl font-bold text-xs lg:text-sm ${
                        plan.highlight
                          ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/25"
                          : "bg-gray-900 hover:bg-gray-800 shadow-lg"
                      }`}
                      asChild
                    >
                      <Link to={plan.cta.href}>{plan.cta.label}</Link>
                    </Button>
                  )}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
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

  const guarantees = [
    { icon: CreditCard, text: "Sem cartão", subtext: "Não pedimos cartão no cadastro" },
    { icon: FileText, text: "Sem contrato", subtext: "Cancele quando quiser" },
    { icon: Percent, text: "Sem taxa por pedido", subtext: "100% do lucro é seu" },
  ];

  return (
    <section id="planos" className="py-20 relative overflow-hidden" ref={sectionRef}>
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
        <div className={`text-center mb-10 ${isVisible ? "animate-fade-in-up" : "opacity-0"}`}>
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md rounded-full px-5 py-2.5 mb-5 border border-white/30">
            <span className="text-xl">🎯</span>
            <span className="font-semibold text-white text-sm">Escolha o plano ideal para você</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-4">
            Compare todos os planos
          </h2>
          <p className="text-lg text-white/90 max-w-2xl mx-auto">
            Comece grátis e evolua conforme sua necessidade.
            <br />
            <strong>Sem taxa por pedido — o lucro é 100% seu.</strong>
          </p>
        </div>

        {/* Guarantees */}
        <div className={`max-w-3xl mx-auto grid grid-cols-3 gap-2 md:gap-4 mb-10 ${isVisible ? "animate-fade-in-up animation-delay-100" : "opacity-0"}`}>
          {guarantees.map((item, index) => (
            <div key={index} className="flex items-center gap-2 justify-center bg-white/10 backdrop-blur-sm rounded-xl p-2.5 md:p-4 border border-white/20">
              <item.icon className="w-5 h-5 text-emerald-300 flex-shrink-0" />
              <div>
                <div className="font-bold text-white text-xs md:text-sm">{item.text}</div>
                <div className="text-[10px] md:text-xs text-white/70 hidden sm:block">{item.subtext}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <DesktopTable isVisible={isVisible} />

        {/* Mobile cards with tabs */}
        <MobileCards isVisible={isVisible} />

        {/* Footer */}
        <p className={`text-center text-xs text-white/70 mt-6 flex items-center justify-center gap-2 ${isVisible ? "animate-fade-in-up animation-delay-500" : "opacity-0"}`}>
          <Shield className="w-4 h-4" />
          Leva menos de 5 minutos • Sem cartão • Grátis todo mês
        </p>
      </div>
    </section>
  );
}
