import { Button } from "@/components/ui/button";
import { ArrowRight, Smartphone, Users, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-food.jpg";

export function HeroSection() {
  return (
    <section className="min-h-screen flex items-center bg-gradient-hero relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-transparent" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="text-white space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                Cardápio Digital Grátis para Restaurantes, Delivery e Lanchonetes
              </h1>
              <h2 className="text-3xl md:text-4xl font-semibold text-primary-glow">
                Clica e Pede FREE – Crie seu cardápio online 100% gratuito
              </h2>
              <h3 className="text-xl text-white/90 leading-relaxed">
                Pedidos vão direto para o WhatsApp do seu negócio
              </h3>
              <p className="text-lg text-white/80 leading-relaxed">
                Monte seu cardápio digital em minutos. O cliente escolhe os produtos e o pedido é enviado automaticamente pelo WhatsApp com todos os dados organizados: itens, preço, descrição e endereço.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="accent" size="lg" className="text-lg px-8 py-6" asChild>
                <Link to="/criar-conta">
                  Começar Agora
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              
              <Button variant="accent" size="lg" className="text-lg px-8 py-6 border-white hover:bg-white hover:text-primary" asChild>
                <Link to="/demo">
                  Ver Demonstração
                </Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-glow">100%</div>
                <div className="text-sm text-white/80">Gratuito</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-glow">5min</div>
                <div className="text-sm text-white/80">Para configurar</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-glow">24/7</div>
                <div className="text-sm text-white/80">Disponível</div>
              </div>
            </div>
          </div>

          {/* Right Column - Features */}
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-primary-glow/20 p-3 rounded-lg">
                  <Smartphone className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white">Cardápio Responsivo</h3>
              </div>
              <p className="text-white/80">
                Seus clientes podem visualizar e fazer pedidos pelo celular, tablet ou computador.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-secondary/20 p-3 rounded-lg">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white">Pedidos no WhatsApp</h3>
              </div>
              <p className="text-white/80">
                Receba todos os pedidos formatados direto no seu WhatsApp Business.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-destructive/20 p-3 rounded-lg">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white">Setup Rápido</h3>
              </div>
              <p className="text-white/80">
                Cadastre seus produtos, configure adicionais e publique em minutos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
