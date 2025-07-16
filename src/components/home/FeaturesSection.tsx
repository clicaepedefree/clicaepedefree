import { Card, CardContent } from "@/components/ui/card";
import { 
  CheckCircle, 
  MessageSquare, 
  Settings, 
  Smartphone,
  Clock,
  Star,
  MessageCircle,
  Share,
  CreditCard
} from "lucide-react";

export function FeaturesSection() {
  const differentials = [
    {
      icon: CheckCircle,
      title: "Sem mensalidade ou taxas"
    },
    {
      icon: MessageSquare,
      title: "Pedido direto no WhatsApp"
    },
    {
      icon: Clock,
      title: "Configuração em 5 minutos"
    },
    {
      icon: Smartphone,
      title: "Compatível com qualquer dispositivo"
    }
  ];

  const steps = [
    {
      number: "1",
      title: "Crie seu cardápio em minutos",
      description: "Cadastre produtos, categorias e adicionais"
    },
    {
      number: "2", 
      title: "Compartilhe o link com os clientes",
      description: "Link único para redes sociais e grupos"
    },
    {
      number: "3",
      title: "Receba pedidos no WhatsApp com tudo pronto",
      description: "Produtos, total, endereço e forma de pagamento"
    }
  ];

  return (
    <>
      {/* Diferenciais */}
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {differentials.map((item, index) => (
              <Card key={index} className="bg-white border-0 shadow-card hover:shadow-brand transition-all duration-300 hover:scale-105">
                <CardContent className="p-6 text-center">
                  <div className="bg-primary/10 p-4 rounded-lg w-fit mx-auto mb-4">
                    <item.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Mockup WhatsApp */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-8 text-white shadow-2xl">
                <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 mb-4">
                  <MessageCircle className="h-6 w-6 mb-2" />
                  <p className="text-sm font-medium">Pedido formatado no WhatsApp</p>
                </div>
                <div className="space-y-2 text-sm">
                  <p><strong>Pedido - Lanchonete do Clica</strong></p>
                  <p>1x X salada (Queijo extra, Molho especial, Hambúrguer extra) - R$ 42,80</p>
                  <p>3x Coca cola Lata 350ml - R$ 14,97</p>
                  <p className="pt-2 border-t border-white/20"><strong>Total: R$ 57,77</strong></p>
                  <p className="pt-2">📍 <strong>Endereço de Entrega:</strong><br />Av paulista, 3500<br />Aclimação</p>
                  <p className="pt-2">💳 <strong>Forma de Pagamento:</strong> PIX</p>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <h3 className="text-3xl font-bold text-foreground mb-4">Pedido formatado no WhatsApp</h3>
              <p className="text-xl text-muted-foreground">
                O cliente monta o pedido e você recebe tudo no WhatsApp com produtos, total, endereço e forma de pagamento.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mockup Cardápio Digital */}
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-bold text-foreground mb-4">Venda mais com adicionais e observações</h3>
              <p className="text-xl text-muted-foreground">
                O cliente pode adicionar extras e ver o total em tempo real. Ideal para lanches, pizzas, marmitas, combos e muito mais.
              </p>
            </div>
            <div>
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-8 text-white shadow-2xl">
                <div className="bg-white rounded-lg p-6 text-gray-800">
                  <h4 className="text-xl font-bold mb-2">X salada</h4>
                  <p className="text-sm text-gray-600 mb-4">Personalize seu produto escolhendo os adicionais</p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>Preço base:</span>
                      <span className="font-semibold">R$ 29,90</span>
                    </div>
                    <div className="border-t pt-3">
                      <p className="text-sm font-medium mb-2">Escolha seus adicionais (0-6 escolhas)</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>✅ Bacon extra</span>
                          <span>+ R$ 4,99</span>
                        </div>
                        <div className="flex justify-between">
                          <span>✅ Hambúrguer extra</span>
                          <span>+ R$ 9,90</span>
                        </div>
                        <div className="flex justify-between">
                          <span>✅ Molho especial</span>
                          <span>+ R$ 1,00</span>
                        </div>
                      </div>
                    </div>
                    <div className="border-t pt-3 flex justify-between items-center font-bold">
                      <span>Total:</span>
                      <span>R$ 45,79</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Painel Administrativo */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-8 shadow-2xl">
                <div className="bg-white rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Settings className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold text-blue-600">Produtos</span>
                  </div>
                  <h4 className="text-lg font-bold mb-2">Produtos Cadastrados (5)</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span>X salada</span>
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">Ativo</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span>X Bacon</span>
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">Ativo</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span>Pizza Grande 8</span>
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">Ativo</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <h3 className="text-3xl font-bold text-foreground mb-4">Gerencie seus produtos com facilidade</h3>
              <p className="text-xl text-muted-foreground">
                Cadastre, edite e organize categorias, adicionais e preços. Tudo pelo seu painel administrativo online.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona em 3 passos */}
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">Como funciona em 3 passos</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="bg-primary text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}