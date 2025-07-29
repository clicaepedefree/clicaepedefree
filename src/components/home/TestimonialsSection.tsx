import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star } from "lucide-react";

export function TestimonialsSection() {
  const testimonials = [
    {
      name: "Ana",
      business: "Pizzaria da Vila",
      avatar: "A",
      text: "Muito fácil de usar. Meus clientes adoraram e eu não pago nada por isso!",
      rating: 5
    },
    {
      name: "Rhuan",
      business: "Espaço Vip",
      avatar: "R",
      text: "Estava me perdendo com as anotações, esse cardápio me salvou!",
      rating: 5
    },
    {
      name: "Carlos",
      business: "Burguer House",
      avatar: "C",
      text: "Aumento de 40% nos pedidos depois que comecei a usar. Recomendo!",
      rating: 5
    }
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <div className="bg-green-50 p-2 rounded-lg inline-block mb-4">
            <span className="text-green-600 font-medium text-sm">💬 Depoimentos</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            O que nossos clientes dizem
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Depoimentos reais de restaurantes que já estão vendendo mais com nosso cardápio digital
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <CardContent className="p-8">
                <div className="flex mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                
                <blockquote className="text-gray-700 mb-6 italic leading-relaxed text-lg">
                  "{testimonial.text}"
                </blockquote>
                
                <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-blue-600 text-white text-lg font-semibold">
                      {testimonial.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-500">{testimonial.business}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}