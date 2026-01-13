import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, CheckCircle2, Rocket, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

export function CTASection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const benefits = [
    "Sem comissão por pedido",
    "Sem fidelidade",
    "Grátis até 100 pedidos/mês"
  ];

  return (
    <section 
      className="py-24 relative overflow-hidden" 
      ref={sectionRef}
    >
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700" />
      
      {/* Animated elements */}
      <div className="absolute top-10 left-10 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-teal-400/20 rounded-full blur-3xl animate-float animation-delay-500" />
      
      {/* Particle pattern */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
        backgroundSize: '40px 40px'
      }} />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className={`max-w-4xl mx-auto text-center text-white ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md rounded-full px-6 py-3 mb-8 border border-white/30">
            <Rocket className="h-5 w-5 text-yellow-300" />
            <span className="font-semibold">Transforme seu delivery hoje mesmo</span>
          </div>

          {/* Heading */}
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 leading-tight">
            Pronto para aumentar
            <br />
            <span className="text-yellow-300">suas vendas?</span>
          </h2>
          
          <p className="text-xl text-white/90 mb-6 leading-relaxed max-w-2xl mx-auto">
            Comece agora <strong className="text-2xl text-yellow-300">grátis até 100 pedidos/mês</strong> e transforme a forma como você recebe pedidos.
          </p>
          
          {/* Benefits pills */}
          <div className="flex flex-wrap gap-3 justify-center mb-10">
            {benefits.map((benefit, index) => (
              <div 
                key={index}
                className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium border border-white/20"
              >
                <CheckCircle2 className="w-4 h-4 text-yellow-300" />
                {benefit}
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className={`flex flex-col sm:flex-row gap-4 justify-center items-center mb-10 ${isVisible ? 'animate-fade-in-up animation-delay-200' : 'opacity-0'}`}>
            <Button 
              size="lg" 
              className="group text-xl px-12 py-8 bg-white text-emerald-700 hover:bg-gray-50 shadow-2xl hover:shadow-3xl transform hover:scale-[1.02] transition-all duration-300 rounded-2xl font-bold" 
              asChild
            >
              <Link to="/criar-conta">
                💚 COMECE AGORA GRÁTIS
                <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-10 py-7 border-2 border-white/50 text-white hover:bg-white/10 hover:border-white rounded-2xl transition-all duration-300" 
              asChild
            >
              <a href="https://cardapiogratis.online/cardapio/pizza-do-z-1" target="_blank" rel="noopener noreferrer">
                Ver Demonstração
              </a>
            </Button>
          </div>

          {/* Stats */}
          <div className={`grid sm:grid-cols-3 gap-8 max-w-2xl mx-auto mb-12 ${isVisible ? 'animate-fade-in-up animation-delay-300' : 'opacity-0'}`}>
            <div className="text-center p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
              <div className="text-4xl font-extrabold text-white mb-1">1000+</div>
              <div className="text-white/80 text-sm">Restaurantes ativos</div>
            </div>
            <div className="text-center p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
              <div className="text-4xl font-extrabold text-yellow-300 mb-1">Grátis</div>
              <div className="text-white/80 text-sm">Até 100 pedidos/mês</div>
            </div>
            <div className="text-center p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
              <div className="text-4xl font-extrabold text-white mb-1 flex items-center justify-center gap-1">
                <Clock className="w-8 h-8" />
                5 min
              </div>
              <div className="text-white/80 text-sm">Para configurar</div>
            </div>
          </div>

          {/* Footer text */}
          <div className={`p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 ${isVisible ? 'animate-fade-in-up animation-delay-400' : 'opacity-0'}`}>
            <p className="text-white/90 text-lg">
              © 2025 Cardápio Fácil — Todos os direitos reservados.
              <br />
              <span className="text-sm text-white/70">Mais de 1000 restaurantes em todo o Brasil já usam o Cardápio Fácil</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}