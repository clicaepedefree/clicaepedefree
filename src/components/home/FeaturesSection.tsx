import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  CheckCircle, 
  MessageSquare, 
  Settings, 
  Smartphone,
  Clock,
  Star,
  MessageCircle,
  Share,
  CreditCard,
  ArrowRight
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
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Por que escolher nosso cardápio digital?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              A melhor solução para modernizar seu negócio sem custos
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {differentials.map((item, index) => (
              <Card key={index} className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group">
                <CardContent className="p-8 text-center">
                  <div className="bg-blue-100 group-hover:bg-blue-600 p-4 rounded-full w-fit mx-auto mb-6 transition-colors duration-300">
                    <item.icon className="h-8 w-8 text-blue-600 group-hover:text-white transition-colors duration-300" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
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
              <div className="relative">
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-3xl p-8 text-white shadow-2xl transform -rotate-2 hover:rotate-0 transition-transform duration-300">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-white/20 p-2 rounded-full">
                      <MessageCircle className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-bold">WhatsApp Business</p>
                      <p className="text-sm opacity-80">Pedido automatizado</p>
                    </div>
                  </div>
                  
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 space-y-3 text-sm">
                    <p className="font-bold text-lg">🍔 Pedido - Lanchonete do Clica</p>
                    <hr className="border-white/20" />
                    <p>1x X salada</p>
                    <p className="text-xs pl-4 opacity-80">• Queijo extra (+R$ 3,00)</p>
                    <p className="text-xs pl-4 opacity-80">• Molho especial (+R$ 1,00)</p>
                    <p className="text-xs pl-4 opacity-80">• Hambúrguer extra (+R$ 8,90)</p>
                    <p className="font-medium">Subtotal: R$ 42,80</p>
                    <hr className="border-white/20" />
                    <p>3x Coca cola Lata 350ml - R$ 14,97</p>
                    <hr className="border-white/20" />
                    <p className="font-bold text-lg">💰 Total: R$ 57,77</p>
                    <hr className="border-white/20" />
                    <p>👤 <strong>Cliente:</strong> João Silva</p>
                    <p>📞 <strong>Telefone:</strong> (11) 99999-9999</p>
                    <p>📍 <strong>Endereço:</strong><br />Av Paulista, 3500<br />Aclimação</p>
                    <p>💳 <strong>Pagamento:</strong> PIX</p>
                  </div>
                </div>
                
                {/* Floating badge */}
                <div className="absolute -top-4 -right-4 bg-yellow-400 text-gray-900 px-4 py-2 rounded-full text-sm font-bold shadow-lg animate-pulse">
                  Automático!
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="bg-blue-50 p-2 rounded-lg inline-block mb-4">
                <span className="text-blue-600 font-medium text-sm">🚀 Automatização Completa</span>
              </div>
              <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Receba pedidos prontos no WhatsApp
              </h3>
              <p className="text-xl text-gray-600 mb-6">
                O cliente monta o pedido no seu cardápio digital e você recebe tudo formatado automaticamente no WhatsApp com produtos, preços, dados do cliente e endereço.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="bg-green-100 p-1 rounded-full mt-1">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Produtos com adicionais</h4>
                    <p className="text-gray-600 text-sm">Todos os extras e observações incluídos</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-green-100 p-1 rounded-full mt-1">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Dados completos do cliente</h4>
                    <p className="text-gray-600 text-sm">Nome, telefone e endereço de entrega</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-green-100 p-1 rounded-full mt-1">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Cálculo automático</h4>
                    <p className="text-gray-600 text-sm">Total com taxa de entrega já calculada</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mockup Cardápio Digital */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="bg-orange-50 p-2 rounded-lg inline-block mb-4">
                <span className="text-orange-600 font-medium text-sm">💰 Aumente suas vendas</span>
              </div>
              <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Venda mais com adicionais e personalizações
              </h3>
              <p className="text-xl text-gray-600 mb-6">
                Seus clientes podem personalizar pedidos em tempo real, adicionando extras e vendo o valor total atualizado automaticamente.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="bg-orange-100 p-1 rounded-full mt-1">
                    <Star className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Adicionais ilimitados</h4>
                    <p className="text-gray-600 text-sm">Configure quantos extras quiser por produto</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-orange-100 p-1 rounded-full mt-1">
                    <Star className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Cálculo em tempo real</h4>
                    <p className="text-gray-600 text-sm">Cliente vê o total se atualizando conforme escolhe</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-orange-100 p-1 rounded-full mt-1">
                    <Star className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Observações especiais</h4>
                    <p className="text-gray-600 text-sm">Campo livre para comentários do cliente</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="relative">
                <div className="bg-white rounded-3xl p-8 shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-300">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl flex items-center justify-center text-white text-2xl">
                        🍔
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-gray-900">X Salada Especial</h4>
                        <p className="text-sm text-gray-500">Hambúrguer artesanal com salada</p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-gray-700">Preço base:</span>
                        <span className="font-semibold text-gray-900">R$ 29,90</span>
                      </div>
                      
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-gray-700 mb-3">Escolha seus adicionais:</p>
                        <div className="space-y-2">
                          <label className="flex items-center justify-between cursor-pointer">
                            <div className="flex items-center gap-2">
                              <input type="checkbox" className="w-4 h-4 text-blue-600" defaultChecked />
                              <span className="text-sm text-gray-700">Bacon extra</span>
                            </div>
                            <span className="text-sm font-medium text-green-600">+ R$ 4,99</span>
                          </label>
                          <label className="flex items-center justify-between cursor-pointer">
                            <div className="flex items-center gap-2">
                              <input type="checkbox" className="w-4 h-4 text-blue-600" defaultChecked />
                              <span className="text-sm text-gray-700">Hambúrguer extra</span>
                            </div>
                            <span className="text-sm font-medium text-green-600">+ R$ 9,90</span>
                          </label>
                          <label className="flex items-center justify-between cursor-pointer">
                            <div className="flex items-center gap-2">
                              <input type="checkbox" className="w-4 h-4 text-blue-600" defaultChecked />
                              <span className="text-sm text-gray-700">Molho especial</span>
                            </div>
                            <span className="text-sm font-medium text-green-600">+ R$ 1,00</span>
                          </label>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-600 text-white rounded-xl p-4 flex justify-between items-center">
                      <span className="font-bold text-lg">Total:</span>
                      <span className="font-bold text-2xl">R$ 45,79</span>
                    </div>
                  </div>
                </div>
                
                {/* Floating elements */}
                <div className="absolute -top-3 -right-3 bg-green-500 text-white p-2 rounded-full text-xs font-bold animate-bounce">
                  +37%
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
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="bg-purple-50 p-2 rounded-lg inline-block mb-4">
              <span className="text-purple-600 font-medium text-sm">⚡ Rápido e Fácil</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Como funciona em 3 passos simples
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Configure seu cardápio digital em poucos minutos e comece a receber pedidos hoje mesmo
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center relative">
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-blue-600 to-blue-300 transform translate-x-4 z-0"></div>
                )}
                
                <div className="relative z-10">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <Button variant="default" size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-4" asChild>
              <Link to="/criar-conta">
                Começar Agora - É Grátis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}