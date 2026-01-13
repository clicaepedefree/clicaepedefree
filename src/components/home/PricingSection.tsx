import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Sparkles, Shield, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

export function PricingSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const features = [
    "Cardápio digital ilimitado",
    "Pedidos automáticos no WhatsApp",
    "Impressão de pedidos",
    "Gestão de pedidos (kanban)",
    "Controle financeiro completo",
    "Adicionais e personalizações",
    "Relatórios de vendas",
    "Painel administrativo",
    "Suporte completo",
    "Sem limite de produtos",
    "Sem comissão por pedido",
    "Atualizações gratuitas"
  ];

  const guarantees = [
    { icon: Shield, text: "Sem fidelidade", subtext: "Cancele quando quiser" },
    { icon: Zap, text: "Sem taxas ocultas", subtext: "Preço transparente" },
    { icon: Sparkles, text: "Sem comissão", subtext: "Lucro 100% seu" },
  ];

  return (
    <section 
      className="py-24 relative overflow-hidden" 
      ref={sectionRef}
    >
      {/* Dynamic gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-emerald-600" />
      
      {/* Animated orbs */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl animate-float animation-delay-300" />
      
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
        backgroundSize: '50px 50px'
      }} />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className={`text-center mb-12 ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md rounded-full px-6 py-3 mb-6 border border-white/30">
            <span className="text-2xl">🎁</span>
            <span className="font-semibold text-white">Oferta Especial</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6">
            Grátis até 100 pedidos/mês
          </h2>
          
          <p className="text-xl text-white/90 max-w-3xl mx-auto">
            Esqueça os apps que cobram comissão por pedido. No Cardápio Fácil, 
            <strong> você não paga comissão e o lucro é 100% seu.</strong>
          </p>
        </div>

        <div className={`max-w-4xl mx-auto ${isVisible ? 'animate-fade-in-up animation-delay-200' : 'opacity-0'}`}>
          <Card className="bg-white/95 backdrop-blur-xl shadow-2xl border-0 rounded-3xl overflow-hidden">
            {/* Highlight bar */}
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-400 text-white text-center py-3 font-semibold">
              ⚡ Mais popular • Usado por 1.000+ restaurantes
            </div>
            
            <CardContent className="p-8 md:p-12">
              {/* Price */}
              <div className="text-center mb-10">
                <div className="flex items-baseline justify-center gap-2 mb-2">
                  <span className="text-6xl md:text-7xl font-extrabold bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">
                    Grátis
                  </span>
                </div>
                <p className="text-xl text-gray-600 font-medium">
                  até 100 pedidos por mês
                </p>
                
                <div className="mt-6 inline-flex items-center gap-2 bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 px-6 py-3 rounded-full text-sm font-semibold">
                  <Check className="w-5 h-5" />
                  Comece agora, sem cartão de crédito
                </div>
              </div>

              {/* Features grid */}
              <div className="grid md:grid-cols-2 gap-4 mb-10">
                {features.map((feature, index) => (
                  <div 
                    key={index} 
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="bg-emerald-100 rounded-full p-1.5 flex-shrink-0">
                      <Check className="h-4 w-4 text-emerald-600" />
                    </div>
                    <span className="text-gray-700 font-medium">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Guarantees */}
              <div className="grid sm:grid-cols-3 gap-4 mb-10 p-6 bg-gradient-to-r from-blue-50 to-emerald-50 rounded-2xl">
                {guarantees.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-xl shadow-sm">
                      <item.icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{item.text}</div>
                      <div className="text-xs text-gray-500">{item.subtext}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <Button 
                size="lg" 
                className="w-full text-xl py-8 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-xl shadow-emerald-500/30 hover:shadow-2xl transform hover:scale-[1.02] transition-all rounded-2xl btn-shine"
                asChild
              >
                <Link to="/criar-conta">
                  💚 COMECE AGORA GRÁTIS
                </Link>
              </Button>

              <p className="text-center text-sm text-gray-500 mt-4 flex items-center justify-center gap-2">
                <Shield className="w-4 h-4" />
                Não precisa cadastrar cartão de crédito para testar
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}