import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export function HowItWorksSection() {
  const steps = [
    {
      number: "1",
      title: "Crie seu cardápio digital em minutos",
      description: "Cadastre produtos, categorias, adicionais e preços pelo painel administrativo"
    },
    {
      number: "2",
      title: "Compartilhe o link com seus clientes",
      description: "Divulgue seu cardápio nas redes sociais, WhatsApp e Google Meu Negócio"
    },
    {
      number: "3",
      title: "Receba pedidos completos direto no WhatsApp",
      description: "Pedidos formatados automaticamente com todos os detalhes e já prontos para processar"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <div className="bg-purple-50 p-2 rounded-lg inline-block mb-4">
            <span className="text-purple-600 font-medium text-sm">⚡ Crie, compartilhe e receba pedidos</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Como o Cardápio Fácil funciona
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Simples assim: em 3 passos seu restaurante está pronto para receber pedidos online
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 mb-16 max-w-6xl mx-auto">
          {steps.map((step, index) => (
            <div key={index} className="text-center relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-full w-full h-1 bg-gradient-to-r from-blue-600 to-blue-300 transform translate-x-4 z-0">
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
                    <ArrowRight className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              )}
              
              <div className="relative z-10">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full w-24 h-24 flex items-center justify-center text-4xl font-bold mx-auto mb-6 shadow-xl">
                  {step.number}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{step.title}</h3>
                <p className="text-gray-600 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Button 
            variant="default" 
            size="lg" 
            className="text-lg px-10 py-6 bg-blue-600 hover:bg-blue-700 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all" 
            asChild
          >
            <Link to="/criar-conta">
              Quero testar agora por 7 dias
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
