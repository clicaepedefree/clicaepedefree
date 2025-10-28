import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";

export function PricingSection() {
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

  return (
    <section className="py-20 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.2'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }} />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-6 py-3 mb-6 border border-white/20">
            <span className="text-yellow-300 text-2xl">💰</span>
            <span className="font-medium text-white">Preço Simples e Justo</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            R$ 29,90/mês — sem taxas, sem comissão
          </h2>
          
          <p className="text-xl text-white/90 max-w-3xl mx-auto">
            Esqueça os apps que cobram comissão por pedido. No Cardápio Fácil, você paga um valor fixo e lucra 100% das suas vendas.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="bg-white shadow-2xl border-0 overflow-hidden">
            <CardContent className="p-8 md:p-12">
              <div className="text-center mb-8">
                <div className="text-6xl font-bold text-blue-600 mb-2">
                  R$ 29,90
                  <span className="text-2xl text-gray-500 font-normal">/mês</span>
                </div>
                <p className="text-gray-600">Valor fixo mensal</p>
                
                <div className="mt-6 inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
                  🎁 7 dias de teste grátis
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-8">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="bg-green-100 rounded-full p-1 mt-0.5">
                      <Check className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-4 mb-8 p-6 bg-blue-50 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">✅ Sem fidelidade</span>
                  <span className="text-sm text-gray-500">Cancele quando quiser</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">✅ Sem taxas ocultas</span>
                  <span className="text-sm text-gray-500">Preço fixo sempre</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">✅ Sem comissão</span>
                  <span className="text-sm text-gray-500">Lucro 100% seu</span>
                </div>
              </div>

              <Button 
                size="lg" 
                className="w-full text-lg py-6 bg-green-600 hover:bg-green-700 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all"
                asChild
              >
                <Link to="/criar-conta">
                  💚 Quero começar agora — 7 dias grátis
                </Link>
              </Button>

              <p className="text-center text-sm text-gray-500 mt-4">
                Não precisa cadastrar cartão de crédito para testar
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
