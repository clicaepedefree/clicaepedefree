import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useEffect, useRef, useState } from "react";

export function FAQSection() {
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

  const faqs = [
    {
      question: "💬 Isso substitui o WhatsApp?",
      answer: "Não! O Cardápio Fácil funciona junto com o WhatsApp. Seu cliente acessa o link do cardápio, escolhe os produtos e finaliza o pedido. O pedido chega formatado direto no seu WhatsApp, pronto para você responder e confirmar. Você continua usando o WhatsApp normalmente."
    },
    {
      question: "📱 Meu cliente precisa baixar aplicativo?",
      answer: "Não! Seus clientes não precisam baixar nada. O cardápio funciona direto no navegador do celular. É só clicar no link e fazer o pedido. Simples assim!"
    },
    {
      question: "💰 Preciso pagar depois?",
      answer: "Você usa grátis até 100 pedidos por mês ou R$2.000 em vendas. Se passar desse limite, aí conversamos sobre o plano pago. Mas pra começar, é 100% grátis e não pedimos cartão de crédito."
    },
    {
      question: "🛵 Funciona para delivery próprio?",
      answer: "Perfeito para delivery próprio! Você recebe o pedido completo com endereço, forma de pagamento e tudo mais. Basta entregar com seu próprio entregador. Sem intermediários, sem comissões."
    },
    {
      question: "🧾 Consigo imprimir pedidos?",
      answer: "Sim! O sistema imprime automaticamente na sua impressora térmica ou comum. O pedido sai formatado e pronto para a cozinha. Você também pode configurar o que quer que apareça na impressão."
    },
    {
      question: "🔄 E se eu não gostar?",
      answer: "Sem problema! Não tem contrato nem fidelidade. Você pode parar de usar quando quiser, sem multas ou taxas. Mas a maioria dos restaurantes que testam acabam ficando porque realmente simplifica a vida."
    }
  ];

  return (
    <section id="faq" className="py-20 bg-white" ref={sectionRef}>
      <div className="container mx-auto px-4">
        <div className={`text-center mb-16 ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <div className="bg-indigo-50 p-2 rounded-lg inline-block mb-4">
            <span className="text-indigo-600 font-medium text-sm">❓ Tire suas dúvidas</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Perguntas Frequentes
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Tudo o que você precisa saber antes de começar
          </p>
        </div>
        
        <div className={`max-w-4xl mx-auto ${isVisible ? 'animate-fade-in-up animation-delay-200' : 'opacity-0'}`}>
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
