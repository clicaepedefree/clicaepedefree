import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, LayoutDashboard, ClipboardCheck, ShoppingCart, Smartphone, DownloadCloud, BarChart3, CalendarDays, TrendingUp, LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface BenefitGroup {
  title: string;
  emoji: string;
  color: string;
  benefits: {
    icon: LucideIcon;
    title: string;
    description: string;
  }[];
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

  const benefitGroups: BenefitGroup[] = [
    {
      title: "Receba pedidos sem erro",
      emoji: "✅",
      color: "emerald",
      benefits: [
        {
          icon: MessageSquare,
          title: "Pedido formatado no WhatsApp",
          description: "Pedido completo com produtos, adicionais, endereço e pagamento"
        },
        {
          icon: LayoutDashboard,
          title: "Painel de pedidos em tempo real",
          description: "Acompanhe todos os pedidos em um painel visual organizado"
        },
        {
          icon: ClipboardCheck,
          title: "Status do pedido",
          description: "Em preparo, saiu para entrega, finalizado - controle total"
        }
      ]
    },
    {
      title: "Venda mais sem esforço",
      emoji: "🚀",
      color: "blue",
      benefits: [
        {
          icon: ShoppingCart,
          title: "Cardápio com adicionais e combos",
          description: "Configure extras e aumente seu ticket médio automaticamente"
        },
        {
          icon: Smartphone,
          title: "Checkout rápido no celular",
          description: "Cliente finaliza o pedido em segundos pelo celular"
        },
        {
          icon: DownloadCloud,
          title: "Cliente não precisa baixar app",
          description: "Funciona direto no navegador, sem instalar nada"
        }
      ]
    },
    {
      title: "Controle básico do negócio",
      emoji: "📊",
      color: "purple",
      benefits: [
        {
          icon: BarChart3,
          title: "Relatório simples de vendas",
          description: "Veja seus produtos mais vendidos e horários de pico"
        },
        {
          icon: CalendarDays,
          title: "Faturamento por período",
          description: "Acompanhe vendas por dia, semana e mês"
        },
        {
          icon: TrendingUp,
          title: "Histórico de pedidos",
          description: "Acesse todos os pedidos e analise seu desempenho"
        }
      ]
    }
  ];

  const colorClasses: Record<string, { bg: string; iconBg: string; border: string }> = {
    emerald: { bg: "from-emerald-50 to-emerald-100/30", iconBg: "bg-emerald-500", border: "border-emerald-200" },
    blue: { bg: "from-blue-50 to-blue-100/30", iconBg: "bg-blue-500", border: "border-blue-200" },
    purple: { bg: "from-purple-50 to-purple-100/30", iconBg: "bg-purple-500", border: "border-purple-200" },
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
            <span className="font-semibold text-sm">Tudo que você precisa</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-6">
            Simplifique seu delivery
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent">
              e venda mais
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Pedidos organizados, clientes satisfeitos, vendas no controle.
          </p>
        </div>
        
        <div className="space-y-12 max-w-6xl mx-auto">
          {benefitGroups.map((group, groupIndex) => {
            const colors = colorClasses[group.color];
            return (
              <div 
                key={groupIndex}
                className={`${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}
                style={{ animationDelay: `${groupIndex * 150}ms` }}
              >
                {/* Group header */}
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-3xl">{group.emoji}</span>
                  <h3 className="text-2xl font-bold text-gray-900">{group.title}</h3>
                </div>
                
                {/* Benefits cards */}
                <div className="grid md:grid-cols-3 gap-4">
                  {group.benefits.map((benefit, benefitIndex) => (
                    <Card 
                      key={benefitIndex} 
                      className={`group relative bg-gradient-to-br ${colors.bg} border ${colors.border} shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 rounded-2xl overflow-hidden`}
                    >
                      <CardContent className="p-6">
                        <div className={`${colors.iconBg} p-3 rounded-xl w-fit mb-4 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                          <benefit.icon className="h-5 w-5 text-white" />
                        </div>
                        <h4 className="text-lg font-bold text-gray-900 mb-2">
                          {benefit.title}
                        </h4>
                        <p className="text-gray-600 text-sm leading-relaxed">
                          {benefit.description}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
