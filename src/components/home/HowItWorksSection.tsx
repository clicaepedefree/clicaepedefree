import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronRight, Smartphone, Share2, MessageCircle, CheckCircle2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function HowItWorksSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
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

  useEffect(() => {
    if (isVisible) {
      const interval = setInterval(() => {
        setActiveStep((prev) => (prev + 1) % 3);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isVisible]);

  const steps = [
    {
      number: "01",
      icon: Smartphone,
      title: "Crie seu cardápio",
      description: "Cadastre produtos, preços e adicionais em poucos minutos",
      color: "blue"
    },
    {
      number: "02",
      icon: Share2,
      title: "Envie o link",
      description: "Coloque na bio, status ou envie direto no WhatsApp",
      color: "purple"
    },
    {
      number: "03",
      icon: MessageCircle,
      title: "Receba pedidos organizados",
      description: "Pedido chega no WhatsApp e no painel do restaurante",
      color: "emerald"
    }
  ];

  const highlights = [
    "Sem baixar app",
    "Funciona direto no WhatsApp"
  ];

  const colorClasses: Record<string, { gradient: string; bg: string; text: string; shadow: string }> = {
    blue: { 
      gradient: "from-blue-500 to-blue-600", 
      bg: "bg-blue-500", 
      text: "text-blue-600",
      shadow: "shadow-blue-500/30"
    },
    purple: { 
      gradient: "from-purple-500 to-purple-600", 
      bg: "bg-purple-500", 
      text: "text-purple-600",
      shadow: "shadow-purple-500/30"
    },
    emerald: { 
      gradient: "from-emerald-500 to-emerald-600", 
      bg: "bg-emerald-500", 
      text: "text-emerald-600",
      shadow: "shadow-emerald-500/30"
    },
  };

  return (
    <section className="py-24 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden" ref={sectionRef}>
      {/* Background elements */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, #000 1px, transparent 0)`,
        backgroundSize: '32px 32px'
      }} />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className={`text-center mb-20 ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 rounded-full px-5 py-2 mb-6">
            <span className="text-lg">⚡</span>
            <span className="font-semibold text-sm">Simples e rápido</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-6">
            Comece a receber pedidos em
            <br />
            <span className="bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
              3 passos simples
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Configure uma vez, receba pedidos para sempre. Sem complicação.
          </p>
        </div>
        
        <div className="max-w-5xl mx-auto mb-12">
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => {
              const colors = colorClasses[step.color];
              const isActive = activeStep === index;
              
              return (
                <div 
                  key={index} 
                  className={`relative ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  {/* Connector */}
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute top-16 left-[60%] w-[80%] z-0">
                      <div className="h-[2px] bg-gradient-to-r from-gray-300 to-gray-200 relative">
                        <ChevronRight className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                      </div>
                    </div>
                  )}
                  
                  <div 
                    className={`relative z-10 text-center p-8 rounded-3xl transition-all duration-500 cursor-pointer ${
                      isActive 
                        ? 'bg-white shadow-2xl scale-105' 
                        : 'bg-white/50 shadow-lg hover:shadow-xl hover:bg-white'
                    }`}
                    onClick={() => setActiveStep(index)}
                  >
                    {/* Step number badge */}
                    <div className={`absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r ${colors.gradient} text-white text-sm font-bold px-4 py-1 rounded-full shadow-lg ${colors.shadow}`}>
                      Passo {step.number}
                    </div>
                    
                    {/* Icon */}
                    <div className={`bg-gradient-to-br ${colors.gradient} text-white rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-xl ${colors.shadow} ${isActive ? 'animate-float' : ''}`}>
                      <step.icon className="w-10 h-10" />
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Highlights */}
        <div className={`flex flex-wrap gap-4 justify-center mb-12 ${isVisible ? 'animate-fade-in-up animation-delay-400' : 'opacity-0'}`}>
          {highlights.map((highlight, index) => (
            <div key={index} className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-5 py-2.5 rounded-full text-sm font-semibold">
              <CheckCircle2 className="w-5 h-5" />
              {highlight}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className={`text-center ${isVisible ? 'animate-fade-in-up animation-delay-500' : 'opacity-0'}`}>
          <Button 
            size="lg" 
            className="group text-lg px-10 py-7 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-xl shadow-blue-500/25 hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 rounded-2xl"
            asChild
          >
            <a href="https://cardapiofacil.site/criar-conta">
              Criar meu cardápio grátis agora
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </a>
          </Button>
          <p className="mt-4 text-sm text-gray-500">
            Leva menos de 5 minutos • Sem cartão de crédito
          </p>
        </div>
      </div>
    </section>
  );
}
