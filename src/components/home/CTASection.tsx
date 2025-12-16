import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export function CTASection() {
  return (
    <section className="py-20 bg-gradient-to-br from-green-600 via-green-700 to-green-800 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }} />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center text-white">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-6 py-3 mb-8 border border-white/20">
            <Sparkles className="h-5 w-5 text-yellow-300" />
            <span className="font-medium">🚀 Transforme seu delivery hoje mesmo</span>
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Aumente suas vendas e simplifique a gestão do seu restaurante
          </h2>
          
          <p className="text-xl text-white/90 mb-4 leading-relaxed max-w-3xl mx-auto">
            Comece agora <strong className="text-2xl">grátis até 100 pedidos/mês</strong> e transforme a forma como você recebe pedidos. Depois apenas R$ 29,90/mês.
          </p>
          
          <p className="text-lg text-white/80 mb-10">
            ✓ Sem comissão por pedido • ✓ Sem fidelidade • ✓ Grátis até 100 pedidos/mês
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-10">
            <Button variant="default" size="lg" className="text-lg px-10 py-6 bg-white text-green-600 hover:bg-gray-50 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300" asChild>
              <Link to="/criar-conta">
                💚 COMECE AGORA GRÁTIS
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            
            <Button variant="outline" size="lg" className="text-lg px-10 py-6 border-white/50 text-white hover:bg-white/10 hover:border-white transition-all duration-300" asChild>
              <a href="https://cardapiogratis.online/cardapio/pizza-do-z-1" target="_blank" rel="noopener noreferrer">
                Ver Demonstração
              </a>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid sm:grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">1000+</div>
              <div className="text-white/80 text-sm">Restaurantes ativos</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">Grátis</div>
              <div className="text-white/80 text-sm">Até 100 pedidos/mês</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">5 min</div>
              <div className="text-white/80 text-sm">Para configurar</div>
            </div>
          </div>

          <div className="mt-12 p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
            <p className="text-white/90 text-lg">
              © 2025 Cardápio Fácil — Todos os direitos reservados.
              <br />
              <span className="text-sm">Mais de 1000 restaurantes em todo o Brasil já usam o Cardápio Fácil</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
