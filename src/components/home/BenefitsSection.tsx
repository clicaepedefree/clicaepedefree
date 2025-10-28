import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Printer, DollarSign, LayoutDashboard, Plus, BarChart3 } from "lucide-react";

export function BenefitsSection() {
  const benefits = [
    {
      icon: MessageSquare,
      title: "Receba pedidos automáticos no WhatsApp",
      description: "Pedidos completos com produtos, adicionais, endereço e forma de pagamento chegam formatados no seu WhatsApp"
    },
    {
      icon: Printer,
      title: "Imprima pedidos em qualquer impressora",
      description: "Impressão automática de pedidos para sua cozinha. Funciona com impressoras térmicas e comuns"
    },
    {
      icon: DollarSign,
      title: "Controle financeiro completo",
      description: "Acompanhe vendas diárias, semanais e mensais. Relatórios detalhados de faturamento e lucros"
    },
    {
      icon: LayoutDashboard,
      title: "Painel de gestão simples e intuitivo",
      description: "Gerencie status de pedidos (recebido, em preparo, pronto, entregue) em um painel kanban visual"
    },
    {
      icon: Plus,
      title: "Venda mais com adicionais",
      description: "Configure adicionais e personalizações ilimitadas. Aumente seu ticket médio automaticamente"
    },
    {
      icon: BarChart3,
      title: "Relatórios de desempenho",
      description: "Veja produtos mais vendidos, horários de pico e insights para aumentar suas vendas"
    }
  ];

  return (
    <section id="beneficios" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <div className="bg-blue-50 p-2 rounded-lg inline-block mb-4">
            <span className="text-blue-600 font-medium text-sm">✨ A solução completa</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Tudo o que seu restaurante precisa para vender mais
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Sistema completo de gestão de pedidos e delivery para modernizar seu negócio
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {benefits.map((benefit, index) => (
            <Card key={index} className="bg-gradient-to-br from-white to-blue-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group">
              <CardContent className="p-8">
                <div className="bg-blue-100 group-hover:bg-blue-600 p-4 rounded-2xl w-fit mb-6 transition-all duration-300">
                  <benefit.icon className="h-8 w-8 text-blue-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{benefit.title}</h3>
                <p className="text-gray-600 leading-relaxed">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
