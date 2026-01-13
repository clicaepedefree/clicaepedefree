import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function FAQSection() {
  const faqs = [
    {
      question: "💬 O Cardápio Fácil tem fidelidade?",
      answer: "Não. Você pode cancelar quando quiser, sem multas ou taxas. Não há período mínimo de contrato."
    },
    {
      question: "💰 Tem comissão por pedido?",
      answer: "Nenhuma! É grátis até 100 pedidos por mês. Você não paga comissão por pedido, todo o lucro é seu."
    },
    {
      question: "🧾 Funciona com qualquer impressora?",
      answer: "Sim! O sistema funciona com impressoras térmicas (80mm) e impressoras comuns. A impressão é automática e você pode configurar o que deseja imprimir."
    },
    {
      question: "💻 Precisa instalar aplicativo?",
      answer: "Não! É 100% online e acessível pelo navegador. Você gerencia tudo pelo computador, tablet ou celular sem instalar nada."
    },
    {
      question: "🎁 Posso testar antes de pagar?",
      answer: "Claro! Você tem até 100 pedidos grátis por mês para testar tudo. Não pedimos cartão de crédito no cadastro. Só começa a pagar se passar dos 100 pedidos."
    },
    {
      question: "📱 Como meus clientes fazem pedidos?",
      answer: "Você compartilha o link do seu cardápio. Eles acessam, escolhem produtos, adicionam extras e finalizam. O pedido chega automaticamente no seu WhatsApp formatado e pronto."
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