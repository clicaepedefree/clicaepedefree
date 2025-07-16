import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function FAQSection() {
  const faqs = [
    {
      question: "O cardápio é realmente gratuito para sempre?",
      answer: "Sim, nosso cardápio digital é 100% gratuito para sempre. Não cobramos mensalidades, taxas de configuração ou comissões sobre vendas. Você pode usar todas as funcionalidades sem qualquer custo."
    },
    {
      question: "Funciona no celular simples?", 
      answer: "Sim! Nosso cardápio funciona em qualquer dispositivo com acesso à internet: celulares básicos, smartphones, tablets e computadores. A interface é responsiva e se adapta a qualquer tamanho de tela."
    },
    {
      question: "Quantos produtos posso cadastrar?",
      answer: "Não existe limite de produtos! Você pode cadastrar quantos produtos, categorias e adicionais precisar. Nossa plataforma suporta desde pequenos estabelecimentos até grandes redes."
    },
    {
      question: "Consigo receber pedido com adicionais?",
      answer: "Sim! Seus clientes podem personalizar pedidos escolhendo adicionais, observações especiais e quantidades. Tudo é formatado automaticamente e enviado para o seu WhatsApp de forma organizada."
    },
    {
      question: "Precisa instalar algum app?",
      answer: "Não precisa instalar nada! Você acessa o painel administrativo direto pelo seu navegador (Chrome, Safari, Firefox, etc.). Seus clientes também acessam o cardápio pelo navegador do celular."
    },
    {
      question: "Como recebo os pedidos?",
      answer: "Os pedidos chegam automaticamente no seu WhatsApp com todas as informações organizadas: produtos escolhidos, adicionais, quantidade, valor total, endereço de entrega e forma de pagamento. Tudo pronto para você processar!"
    }
  ];

  return (
    <section id="faq" className="py-20 bg-muted">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">Perguntas Frequentes</h2>
          <p className="text-xl text-muted-foreground">Tire suas dúvidas sobre nosso cardápio digital</p>
        </div>
        
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="bg-white rounded-lg mb-4 px-6 border-0 shadow-sm">
                <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}