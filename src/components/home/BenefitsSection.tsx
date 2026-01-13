import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Printer, DollarSign, LayoutDashboard, Plus, BarChart3, LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Benefit {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}

export function BenefitsSection() {
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

  const benefits: Benefit[] = [
    {
      icon: MessageSquare,
      title: "Pedidos direto no WhatsApp",
      description: "Pedidos completos com produtos, adicionais, endereço e forma de pagamento chegam formatados no seu WhatsApp",
      color: "emerald"
    },
    {
      icon: Printer,
      title: "Impressão automática",
      description: "Impressão automática de pedidos para sua cozinha. Funciona com impressoras térmicas e comuns",
      color: "blue"
    },
    {
      icon: DollarSign,
      title: "Controle financeiro",
      description: "Acompanhe vendas diárias, semanais e mensais. Relatórios detalhados de faturamento e lucros",
      color: "purple"
    },
    {
      icon: LayoutDashboard,
      title: "Painel Kanban",
      description: "Gerencie status de pedidos (recebido, em preparo, pronto, entregue) em um painel kanban visual",
      color: "orange"
    },
    {
      icon: Plus,
      title: "Adicionais ilimitados",
      description: "Configure adicionais e personalizações ilimitadas. Aumente seu ticket médio automaticamente",
      color: "pink"
    },
    {
      icon: BarChart3,
      title: "Relatórios inteligentes",
      description: "Veja produtos mais vendidos, horários de pico e insights para aumentar suas vendas",
      color: "cyan"
    }
  ];

  const colorClasses: Record<string, { bg: string; iconBg: string; iconColor: string }> = {
    emerald: { bg: "from-emerald-50 to-emerald-100/30", iconBg: "bg-emerald-500", iconColor: "text-white" },
    blue: { bg: "from-blue-50 to-blue-100/30", iconBg: "bg-blue-500", iconColor: "text-white" },
    purple: { bg: "from-purple-50 to-purple-100/30", iconBg: "bg-purple-500", iconColor: "text-white" },
    orange: { bg: "from-orange-50 to-orange-100/30", iconBg: "bg-orange-500", iconColor: "text-white" },
    pink: { bg: "from-pink-50 to-pink-100/30", iconBg: "bg-pink-500", iconColor: "text-white" },
    cyan: { bg: "from-cyan-50 to-cyan-100/30", iconBg: "bg-cyan-500", iconColor: "text-white" },
  };

  return (
    <section id="beneficios" className="py-24 bg-white relative overflow-hidden" ref={sectionRef}>
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-100/50 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className={`text-center mb-16 ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-emerald-500 text-white rounded-full px-5 py-2 mb-6">
            <span className="text-lg">✨</span>
            <span className="font-semibold text-sm">A solução completa para delivery</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-6">
            Tudo o que seu restaurante precisa
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent">
              para vender mais
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Sistema completo de gestão de pedidos e delivery. Simples, moderno e sem complicação.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {benefits.map((benefit, index) => {
            const colors = colorClasses[benefit.color];
            return (
              <Card 
                key={index} 
                className={`group relative bg-gradient-to-br ${colors.bg} border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 rounded-2xl overflow-hidden ${
                  isVisible ? 'animate-fade-in-up' : 'opacity-0'
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Hover gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <CardContent className="p-8 relative z-10">
                  <div className={`${colors.iconBg} p-4 rounded-2xl w-fit mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                    <benefit.icon className={`h-7 w-7 ${colors.iconColor}`} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-gray-800 transition-colors">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {benefit.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}