import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
export function HeroSection() {
  return <section className="min-h-screen flex items-center bg-gradient-to-br from-blue-50 via-white to-blue-50 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5" style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%234F46E5' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
    }} />
      
      <div className="container mx-auto px-4 relative z-10 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <div className="text-center lg:text-left">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 text-gray-900">
                Seu restaurante vendendo mais com o{" "}
                <span className="text-blue-600">Cardápio Fácil Delivery</span> 🍔
              </h1>
              
              <p className="text-xl text-gray-600 leading-relaxed mb-4 max-w-2xl mx-auto lg:mx-0">
                Receba pedidos direto no WhatsApp, imprima automaticamente e gerencie tudo em um só painel.
              </p>
              
              <p className="text-2xl font-bold text-blue-600 mb-8">Grátis até 100 pedidos/mês</p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
                <Button variant="default" size="lg" className="text-lg px-10 py-6 bg-green-600 hover:bg-green-700 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all" asChild>
                  <Link to="/criar-conta">
                    💚 COMECE AGORA GRÁTIS
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                
                <Button variant="outline" size="lg" className="text-lg px-10 py-6 border-blue-300 text-blue-600 hover:bg-blue-50" asChild>
                  <a href="https://cardapiogratis.online/cardapio/pizza-do-z-1" target="_blank" rel="noopener noreferrer">
                    Ver Demonstração
                  </a>
                </Button>
              </div>

              <p className="text-sm text-gray-500">
                ✓ Teste grátis, sem precisar de cartão de crédito
              </p>
            </div>

            {/* Mockup */}
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-6 transform hover:scale-105 transition-transform duration-300">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white mb-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl">
                      🍕
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Pizza do Zé</h3>
                      <p className="text-xs opacity-80">Pedido #1247</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm bg-white/10 rounded-lg p-3">
                    <div className="flex justify-between">
                      <span>1x Pizza Margherita G</span>
                      <span className="font-semibold">R$ 45,90</span>
                    </div>
                    <div className="text-xs opacity-80 pl-4">+ Borda catupiry</div>
                    <div className="flex justify-between">
                      <span>1x Coca-Cola 2L</span>
                      <span className="font-semibold">R$ 12,90</span>
                    </div>
                    <div className="border-t border-white/20 pt-2 flex justify-between font-bold text-base">
                      <span>Total:</span>
                      <span>R$ 66,80</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-green-50 p-2 rounded">
                    <div className="font-bold text-green-600">🧾</div>
                    <div className="text-gray-600">Impressão</div>
                  </div>
                  <div className="bg-blue-50 p-2 rounded">
                    <div className="font-bold text-blue-600">💬</div>
                    <div className="text-gray-600">WhatsApp</div>
                  </div>
                  <div className="bg-purple-50 p-2 rounded">
                    <div className="font-bold text-purple-600">💰</div>
                    <div className="text-gray-600">Financeiro</div>
                  </div>
                </div>
              </div>
              
              {/* Floating badges */}
              <div className="absolute -top-4 -right-4 bg-yellow-400 text-gray-900 px-4 py-2 rounded-full shadow-lg font-bold text-sm animate-bounce">
                Automático!
              </div>
              <div className="absolute -bottom-4 -left-4 bg-green-500 text-white px-4 py-2 rounded-full shadow-lg font-bold text-sm">
                Grátis até 100 pedidos/mês
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>;
}