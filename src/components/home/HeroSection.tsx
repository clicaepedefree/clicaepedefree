import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-food.jpg";

export function HeroSection() {
  return (
    <section className="min-h-screen flex items-center bg-gradient-hero relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{
        backgroundImage: `url(${heroImage})`
      }} />
      <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-transparent" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
            Cardápio Digital Grátis e Sem Mensalidade
          </h1>
          
          <p className="text-xl text-white/90 leading-relaxed mb-8 max-w-3xl mx-auto">
            Crie seu cardápio online e receba pedidos direto no WhatsApp. 100% gratuito, sem taxas ou comissões.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button variant="accent" size="lg" className="text-lg px-8 py-6" asChild>
              <Link to="/criar-conta">
                Criar Meu Cardápio Grátis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            
            <Button variant="outline" size="lg" className="text-lg px-8 py-6 border-white/70 text-primary hover:bg-white/20 hover:border-white" asChild>
              <a href="https://cardapiogratis.online/cardapio/pizza-do-z-1" target="_blank" rel="noopener noreferrer">
                Ver Exemplo de Cardápio
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
