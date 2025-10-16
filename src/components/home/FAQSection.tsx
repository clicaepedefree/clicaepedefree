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
      answer: "Sim! É 100% gratuito até R$2.000 em vendas mensais. Se ultrapassar esse valor, você paga apenas R$29,90 no mês que passar. Não cobramos taxas de configuração ou comissões sobre vendas. Você pode usar todas as funcionalidades livremente."
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
    <section id="faq" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <div className="bg-indigo-50 p-2 rounded-lg inline-block mb-4">
            <span className="text-indigo-600 font-medium text-sm">❓ Dúvidas Frequentes</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Perguntas Frequentes
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Tire suas dúvidas sobre nosso cardápio digital gratuito
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <Accordion type="single" collapsible className="w-full space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="bg-gray-50 rounded-xl px-6 border-0 shadow-sm hover:shadow-md transition-shadow">
                <AccordionTrigger className="text-left font-semibold text-gray-900 hover:no-underline py-6">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 leading-relaxed pb-6">
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