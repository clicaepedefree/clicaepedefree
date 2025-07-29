import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-food.jpg";

export function HeroSection() {
  return (
    <section className="min-h-screen flex items-center bg-blue-50 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
                🎉 100% Gratuito e Sem Mensalidade
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 text-gray-900">
                Cardápios digitais para restaurantes,{" "}
                <span className="text-blue-600">GRÁTIS E SEM COMISSÃO!</span>
              </h1>
              
              <p className="text-xl text-gray-600 leading-relaxed mb-8 max-w-2xl mx-auto lg:mx-0">
                Aproveite a última geração de cardápios digitais para receber pedidos direto no WhatsApp com zero custos e sem mensalidade!
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
                <Button variant="default" size="lg" className="text-lg px-8 py-4 bg-blue-600 hover:bg-blue-700" asChild>
                  <Link to="/criar-conta">
                    Criar Meu Cardápio Grátis
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                
                <Button variant="outline" size="lg" className="text-lg px-8 py-4 border-blue-200 text-blue-600 hover:bg-blue-50" asChild>
                  <a href="https://cardapiogratis.online/cardapio/pizza-do-z-1" target="_blank" rel="noopener noreferrer">
                    Ver Exemplo de Cardápio
                  </a>
                </Button>
              </div>

              <div className="flex flex-wrap gap-6 justify-center lg:justify-start text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  ✓ <span>Sem mensalidade</span>
                </div>
                <div className="flex items-center gap-2">
                  ✓ <span>Sem comissão</span>
                </div>
                <div className="flex items-center gap-2">
                  ✓ <span>Configuração em 5 min</span>
                </div>
              </div>
            </div>

            {/* Mockup */}
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-8 transform rotate-2 hover:rotate-0 transition-transform duration-300">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                  <h3 className="text-xl font-bold mb-4">🍕 Pizza do Zé</h3>
                  <div className="space-y-3 text-sm">
                    <div className="bg-white/10 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">Pizza Margherita G</span>
                        <span className="font-bold">R$ 45,90</span>
                      </div>
                      <div className="text-xs opacity-80">+ Borda catupiry (+R$ 8,00)</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">Coca-Cola 2L</span>
                        <span className="font-bold">R$ 12,90</span>
                      </div>
                    </div>
                    <div className="border-t border-white/20 pt-3 flex justify-between items-center">
                      <span className="font-bold">Total:</span>
                      <span className="font-bold text-lg">R$ 66,80</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 bg-green-500 text-white p-3 rounded-full shadow-lg animate-bounce">
                📱
              </div>
              <div className="absolute -bottom-4 -left-4 bg-yellow-500 text-white p-3 rounded-full shadow-lg animate-pulse">
                💳
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
