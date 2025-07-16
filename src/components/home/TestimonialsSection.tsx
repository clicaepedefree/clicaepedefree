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
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">O que nossos clientes dizem</h2>
          <p className="text-xl text-muted-foreground">Depoimentos reais de quem já está vendendo mais</p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="border-0 shadow-card hover:shadow-brand transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                
                <blockquote className="text-foreground mb-4 italic">
                  "{testimonial.text}"
                </blockquote>
                
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary text-white">
                      {testimonial.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold text-foreground">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.business}</div>
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