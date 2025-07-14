import { Card, CardContent } from "@/components/ui/card";
import { 
  Smartphone, 
  MessageSquare, 
  ShoppingCart, 
  Settings, 
  Share2, 
  CreditCard,
  CheckCircle,
  Gift
} from "lucide-react";

export function FeaturesSection() {
  const features = [
    {
      icon: Smartphone,
      title: "Cardápio Responsivo",
      description: "Interface otimizada para todos os dispositivos. Seus clientes podem navegar facilmente pelo cardápio.",
      color: "text-primary"
    },
    {
      icon: MessageSquare,
      title: "Integração WhatsApp",
      description: "Pedidos enviados automaticamente para o seu WhatsApp com todos os detalhes formatados.",
      color: "text-secondary"
    },
    {
      icon: ShoppingCart,
      title: "Carrinho Inteligente",
      description: "Sistema de carrinho com adicionais, observações e cálculo automático do total.",
      color: "text-destructive"
    },
    {
      icon: Settings,
      title: "Painel Administrativo",
      description: "Gerencie categorias, produtos, preços e adicionais de forma simples e intuitiva.",
      color: "text-primary"
    },
    {
      icon: Share2,
      title: "Link Exclusivo",
      description: "Receba um link único para compartilhar nas redes sociais e com seus clientes.",
      color: "text-secondary"
    },
    {
      icon: CreditCard,
      title: "Sem Taxas",
      description: "Plataforma 100% gratuita, sem mensalidades, sem comissões, sem pegadinhas.",
      color: "text-destructive"
    }
  ];

  return (
    <section className="py-20 bg-muted">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Como funciona?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Monte seu cardápio digital em minutos. O cliente escolhe os produtos e o pedido é enviado automaticamente pelo WhatsApp com todos os dados organizados: itens, preço, descrição e endereço.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <Card key={index} className="bg-gradient-card border-0 shadow-card hover:shadow-brand transition-all duration-300 hover:scale-105">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-accent p-3 rounded-lg">
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">{feature.title}</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Benefits Section */}
        <div className="bg-white rounded-2xl p-8 shadow-card">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Sem mensalidade, sem comissão, sem pegadinha
            </h2>
            <p className="text-muted-foreground">
              Mais do que um cardápio digital, uma solução completa
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              "Totalmente gratuito, para sempre",
              "Ideal para delivery, salão, food trucks e eventos", 
              "Compatível com celular, tablet e computador",
              "Sem limite de produtos"
            ].map((benefit, index) => (
              <div key={index} className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-secondary flex-shrink-0" />
                <span className="text-foreground font-medium">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}