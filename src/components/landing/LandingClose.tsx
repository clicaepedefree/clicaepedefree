import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowRight, Check, Quote, Star, Calendar, Rocket, Headphones, ShieldCheck } from "lucide-react";
import { openSignupWhatsApp } from "@/lib/signup-cta";

const testimonials = [
  {
    name: "Marcos Almeida",
    role: "Pizzaria Bella Massa",
    text: "Os clientes que sumiam voltaram a pedir. O recuperador automático virou nosso melhor vendedor.",
  },
  {
    name: "Juliana Ferreira",
    role: "Hamburgueria do Ju",
    text: "O robô responde o WhatsApp na hora. Minha equipe parou de perder pedido em horário de pico.",
  },
  {
    name: "Rafael Souza",
    role: "Cantina Nonna Rosa",
    text: "Cardápio, caixa e financeiro em um só lugar. Fechei planilhas e ganhei tempo todo dia.",
  },
];

const steps = [
  { icon: Calendar, title: "1. Comece o teste", text: "Você fala com a nossa equipe e libera o acesso na hora." },
  { icon: Rocket, title: "2. A gente configura", text: "Montamos seu cardápio, automações e integrações para você." },
  { icon: Headphones, title: "3. Comece a vender", text: "Acompanhe os pedidos e resultados com suporte junto de você." },
];

const faqs = [
  { q: "Preciso instalar alguma coisa?", a: "Não. Tudo funciona pelo navegador, no computador e no celular." },
  { q: "Como funciona o teste?", a: "Você tem 10 dias grátis para testar o sistema completo, com nossa equipe ajudando na configuração." },
  { q: "Existe fidelidade ou multa?", a: "Não. O plano é mensal e você pode cancelar quando quiser." },
  { q: "Funciona com iFood e 99Food?", a: "Sim. Os pedidos dos marketplaces chegam junto com os pedidos do seu cardápio próprio." },
  { q: "Vocês ajudam a cadastrar meu cardápio?", a: "Sim. Nossa equipe cadastra seus produtos, fotos e preços para você começar pronto." },
  { q: "Quanto custa depois do teste?", a: "Plano único de R$ 99,90 por mês, com todos os recursos incluídos." },
];

const included = [
  "Cardápio digital próprio",
  "Robô de WhatsApp",
  "Recuperador de clientes e de carrinho",
  "Programa de fidelidade e cashback",
  "Integração com iFood e 99Food",
  "Pixel do Facebook",
  "PDV, mesas e controle de estoque",
  "Gestão financeira e relatórios",
  "Suporte humano por WhatsApp",
  "Configuração feita pela nossa equipe",
];

export function LandingClose() {
  return (
    <>
      {/* Prova social */}
      <section className="bg-background py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-sm font-bold uppercase tracking-widest text-flame">Prova social</span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
              Restaurantes que pararam de perder vendas.
            </h2>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-2xl border border-border bg-card p-7 shadow-[var(--shadow-soft)]">
                <Quote className="h-7 w-7 text-flame" />
                <p className="mt-4 text-base leading-relaxed text-foreground">{t.text}</p>
                <div className="mt-5 flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-flame text-flame" />
                  ))}
                </div>
                <div className="mt-4">
                  <p className="font-bold text-foreground">{t.name}</p>
                  <p className="text-sm text-muted-foreground">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Oferta */}
      <section id="planos" className="bg-ink py-20 text-white md:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-sm font-bold uppercase tracking-widest text-flame">A oferta</span>
            <h2 className="mt-4 text-3xl font-extrabold md:text-5xl">
              Um plano único. Todos os recursos liberados.
            </h2>
            <p className="mt-4 text-lg text-white/70">
              Teste por 10 dias grátis e veja o sistema funcionando no seu restaurante.
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-3xl overflow-hidden rounded-3xl border border-white/15 bg-white/[0.06] p-8 backdrop-blur md:p-12">
            <div className="text-center">
              <span className="inline-flex rounded-full bg-gradient-flame px-4 py-1.5 text-sm font-bold text-flame-foreground">
                10 dias grátis para testar
              </span>
              <div className="mt-6 flex items-end justify-center gap-2">
                <span className="text-2xl font-semibold text-white/70">R$</span>
                <span className="text-6xl font-extrabold leading-none md:text-7xl">99,90</span>
                <span className="pb-2 text-lg text-white/70">/mês</span>
              </div>
              <p className="mt-3 text-white/60">Sem fidelidade. Cancele quando quiser.</p>
            </div>

            <ul className="mt-9 grid gap-3 sm:grid-cols-2">
              {included.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-white/85">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-mint" />
                  {item}
                </li>
              ))}
            </ul>

            <Button
              size="lg"
              onClick={openSignupWhatsApp}
              className="group mt-10 h-14 w-full rounded-2xl bg-gradient-flame text-base font-bold text-flame-foreground shadow-[var(--shadow-flame)] transition-transform hover:scale-[1.01]"
            >
              COMEÇAR TESTE GRÁTIS
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
            <p className="mt-4 text-center text-sm text-white/55">
              <ShieldCheck className="mr-1 inline h-4 w-4" /> Configuração feita pela nossa equipe
            </p>
          </div>

          {/* Ancoragem de valor */}
          <div className="mx-auto mt-14 grid max-w-4xl gap-4 sm:grid-cols-3">
            {[
              { big: "R$ 3,33", small: "por dia — menos que um café" },
              { big: "1 pedido", small: "por mês já paga o sistema" },
              { big: "Tudo em 1", small: "no lugar de vários sistemas" },
            ].map((c) => (
              <div key={c.big} className="rounded-2xl border border-white/15 bg-white/[0.05] p-6 text-center">
                <p className="text-3xl font-extrabold text-flame">{c.big}</p>
                <p className="mt-2 text-sm text-white/70">{c.small}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="bg-muted py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-sm font-bold uppercase tracking-widest text-flame">Como funciona</span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
              Simples desde o primeiro dia.
            </h2>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {steps.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-soft)]">
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-flame text-flame-foreground">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-background py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <span className="text-sm font-bold uppercase tracking-widest text-flame">Dúvidas</span>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
                Perguntas frequentes
              </h2>
            </div>
            <Accordion type="single" collapsible className="mt-10">
              {faqs.map((f) => (
                <AccordionItem key={f.q} value={f.q}>
                  <AccordionTrigger className="text-left text-base font-semibold">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="relative overflow-hidden bg-gradient-ink py-20 text-white md:py-28">
        <div className="absolute -top-24 right-0 h-80 w-80 rounded-full bg-flame/25 blur-3xl" />
        <div className="container relative z-10 mx-auto px-4 text-center">
          <h2 className="mx-auto max-w-3xl text-3xl font-extrabold leading-tight md:text-5xl">
            Seu restaurante pode vender mais a partir de hoje.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-white/75">
            Comece o teste de 10 dias e deixe a nossa equipe configurar tudo para você.
          </p>
          <Button
            size="lg"
            onClick={openSignupWhatsApp}
            className="group mt-9 h-14 rounded-2xl bg-gradient-flame px-10 text-base font-bold text-flame-foreground shadow-[var(--shadow-flame)] transition-transform hover:scale-[1.02]"
          >
            COMEÇAR TESTE GRÁTIS
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
          <p className="mt-4 text-sm text-white/60">10 dias grátis • Depois R$ 99,90/mês • Sem fidelidade</p>
        </div>
      </section>
    </>
  );
}
