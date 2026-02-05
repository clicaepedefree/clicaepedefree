import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function TestimonialsSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const testimonials = [
    {
      name: "João",
      business: "Hamburgueria",
      location: "Campinas",
      avatar: "JO",
      text: "Depois do Cardápio Fácil, parei de anotar pedido errado no WhatsApp. Agora chega tudo organizado e não perco mais vendas!",
      rating: 5,
      color: "blue"
    },
    {
      name: "Ana",
      business: "Pizzaria",
      location: "São Paulo",
      avatar: "AN",
      text: "Meus clientes adoram fazer pedido pelo link. É rápido, fácil e eu não preciso ficar perguntando endereço ou forma de pagamento.",
      rating: 5,
      color: "emerald"
    },
    {
      name: "Rafael",
      business: "Marmitaria",
      location: "Belo Horizonte",
      avatar: "RA",
      text: "O melhor é que não tem comissão! Todo o lucro fica comigo. E o suporte no WhatsApp é muito rápido.",
      rating: 5,
      color: "purple"
    }
  ];

  const colorClasses: Record<string, { gradient: string; bg: string }> = {
    blue: { gradient: "from-blue-500 to-blue-600", bg: "bg-blue-500" },
    emerald: { gradient: "from-emerald-500 to-emerald-600", bg: "bg-emerald-500" },
    purple: { gradient: "from-purple-500 to-purple-600", bg: "bg-purple-500" },
  };

  return (
    <section className="py-24 bg-gradient-to-b from-white to-gray-50 relative overflow-hidden" ref={sectionRef}>
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-100/30 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className={`text-center mb-16 ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-700 rounded-full px-5 py-2 mb-6">
            <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
            <span className="font-semibold text-sm">Quem usa, recomenda!</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-6">
            Mais de <span className="text-yellow-500">1.000 restaurantes</span>
            <br />
            já usam todos os dias
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Veja o que donos de restaurantes têm a dizer
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => {
            const colors = colorClasses[testimonial.color];
            
            return (
              <Card 
                key={index} 
                className={`group relative bg-white border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 rounded-2xl overflow-hidden ${
                  isVisible ? 'animate-fade-in-up' : 'opacity-0'
                }`}
                style={{ animationDelay: `${index * 150}ms` }}
              >
                {/* Top accent */}
                <div className={`h-1.5 bg-gradient-to-r ${colors.gradient}`} />
                
                <CardContent className="p-8">
                  {/* Quote icon */}
                  <Quote className="w-10 h-10 text-gray-200 mb-4" />
                  
                  {/* Stars */}
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  
                  {/* Testimonial text */}
                  <blockquote className="text-gray-700 mb-6 leading-relaxed text-lg">
                    "{testimonial.text}"
                  </blockquote>
                  
                  {/* Author */}
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center text-white text-lg font-bold shadow-lg`}>
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">{testimonial.name}</div>
                      <div className="text-sm text-gray-500">{testimonial.business} em {testimonial.location}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Trust indicators */}
        <div className={`mt-16 flex flex-wrap justify-center gap-8 ${isVisible ? 'animate-fade-in-up animation-delay-500' : 'opacity-0'}`}>
          <div className="flex items-center gap-3 text-gray-600">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl">
              🏆
            </div>
            <div>
              <div className="font-bold text-gray-900">4.9/5</div>
              <div className="text-sm">Avaliação média</div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl">
              💬
            </div>
            <div>
              <div className="font-bold text-gray-900">2.500+</div>
              <div className="text-sm">Avaliações</div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl">
              🚀
            </div>
            <div>
              <div className="font-bold text-gray-900">98%</div>
              <div className="text-sm">Recomendam</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
