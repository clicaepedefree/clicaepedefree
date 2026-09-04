import { Button } from "@/components/ui/button";
import { ArrowRight, Bot, HeartHandshake, ShoppingBag, Workflow, Repeat2, Gift, Coins, Undo2 } from "lucide-react";
import { openSignupWhatsApp } from "@/lib/signup-cta";
import disparo from "@/assets/mockup-disparo.png.asset.json";
import cardapio from "@/assets/mockup-cardapio.png.asset.json";

const pillars = [
  {
    icon: ShoppingBag,
    title: "Venda mais",
    lead: "Transforme mais visitantes em pedidos.",
    text: "Cardápio digital, PDV e integração com os canais de venda para facilitar o recebimento de pedidos.",
  },
  {
    icon: HeartHandshake,
    title: "Faça seus clientes voltarem",
    lead: "Não dependa apenas de conquistar clientes novos.",
    text: "Recuperador de clientes, programa de fidelidade, cashback e recuperação de carrinho abandonado.",
  },
  {
    icon: Bot,
    title: "Atenda mais rápido",
    lead: "Seu cliente não quer esperar.",
    text: "O Robô de WhatsApp responde dúvidas e agiliza o atendimento sem depender da equipe o tempo todo.",
  },
  {
    icon: Workflow,
    title: "Automatize sua operação",
    lead: "Menos tarefas repetitivas. Mais tempo para cuidar do restaurante.",
    text: "Processos manuais viram automações e as informações ficam centralizadas em um só lugar.",
  },
];

const flow = [
  "Cliente compra",
  "O sistema identifica",
  "A automação dispara",
  "Cliente recebe a mensagem",
  "Novo pedido",
];

export function LandingPillars() {
  return (
    <>
      <section id="beneficios" className="bg-muted py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-sm font-bold uppercase tracking-widest text-flame">Resultados</span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
              Menos trabalho manual. Mais vendas. Mais clientes voltando.
            </h2>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {pillars.map(({ icon: Icon, title, lead, text }) => (
              <div key={title} className="group rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-soft)]">
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-flame text-flame-foreground shadow-[var(--shadow-flame)]">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">{title}</h3>
                <p className="mt-2 font-semibold text-flame">{lead}</p>
                <p className="mt-3 leading-relaxed text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recuperação de clientes */}
      <section className="relative overflow-hidden bg-ink py-20 text-white md:py-28">
        <div className="absolute -right-24 top-10 h-96 w-96 rounded-full bg-flame/20 blur-3xl" />
        <div className="container relative z-10 mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-sm font-bold uppercase tracking-widest text-flame">Recorrência</span>
            <h2 className="mt-4 text-3xl font-extrabold leading-tight md:text-5xl">
              Seu cliente já comprou.
              <br />
              Agora faça ele comprar de novo.
            </h2>
            <p className="mt-5 text-lg text-white/70">
              Cada cliente que já comprou pode ser uma nova venda. O sistema identifica quem parou de
              pedir e quem deixou o carrinho pela metade — e chama esse cliente de volta sozinho.
            </p>
          </div>

          <div className="mt-14 grid gap-3 md:grid-cols-5">
            {flow.map((step, i) => (
              <div key={step} className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center backdrop-blur">
                <div className="mx-auto mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-flame text-sm font-bold text-flame-foreground">
                  {i + 1}
                </div>
                <p className="text-sm font-semibold text-white/85">{step}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 grid items-center gap-10 lg:grid-cols-2">
            <div className="space-y-5">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <Undo2 className="mb-3 h-6 w-6 text-flame" />
                <h3 className="text-xl font-bold">Recuperador de clientes automático</h3>
                <p className="mt-2 text-white/70">
                  Reative quem já comprou e sumiu, com disparos automáticos de mensagem no WhatsApp.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <Repeat2 className="mb-3 h-6 w-6 text-flame" />
                <h3 className="text-xl font-bold">Recuperador de carrinho abandonado</h3>
                <p className="mt-2 text-white/70">
                  Quem estava quase pedindo recebe um lembrete e volta para finalizar o pedido.
                </p>
              </div>
              <p className="text-lg font-semibold">
                Você não precisa vender apenas para clientes novos. Venda novamente para quem já
                conhece seu restaurante.
              </p>
            </div>
            <img
              src={disparo.url}
              alt="Tela de disparo em massa de mensagens no WhatsApp para clientes do restaurante"
              className="w-full rounded-2xl"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* Robô de WhatsApp */}
      <section className="bg-background py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="text-sm font-bold uppercase tracking-widest text-flame">Robô de WhatsApp</span>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
                Seu restaurante atendendo no WhatsApp, sem depender de atendimento manual o tempo todo.
              </h2>
              <ul className="mt-8 space-y-3">
                {[
                  "Responde dúvidas frequentes na hora",
                  "Ajuda o cliente a fazer o pedido",
                  "Envia informações da loja, horários e formas de pagamento",
                  "Faz o atendimento inicial e direciona o cliente",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3 text-foreground">
                    <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mint/15 text-mint">✓</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-lg font-semibold text-foreground">
                Mais velocidade no atendimento. Menos tempo respondendo as mesmas perguntas.
              </p>
              <Button
                size="lg"
                onClick={openSignupWhatsApp}
                className="mt-8 h-14 rounded-2xl bg-gradient-flame px-8 font-bold text-flame-foreground shadow-[var(--shadow-flame)]"
              >
                QUERO TESTAR GRÁTIS
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
            <div className="relative">
              <div className="absolute -inset-6 rounded-[3rem] bg-mint/10 blur-3xl" />
              <img
                src={disparo.url}
                alt="Automação de mensagens de WhatsApp dentro do sistema"
                className="relative w-full rounded-2xl shadow-[var(--shadow-soft)]"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Cardápio digital */}
      <section className="bg-muted py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="order-2 lg:order-1 flex justify-center">
              <img
                src={cardapio.url}
                alt="Cardápio digital do restaurante aberto no celular"
                className="w-64 md:w-80 drop-shadow-2xl"
                loading="lazy"
              />
            </div>
            <div className="order-1 lg:order-2">
              <span className="text-sm font-bold uppercase tracking-widest text-flame">Cardápio digital</span>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
                Um cardápio que não apenas mostra seus produtos. Ele ajuda você a vender.
              </h2>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {["Fotos que dão vontade de pedir", "Categorias organizadas", "Preços e promoções em destaque", "Experiência feita para celular", "Pedido em poucos toques", "Link próprio da sua loja"].map((t) => (
                  <div key={t} className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground">
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fidelização */}
      <section className="bg-background py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-sm font-bold uppercase tracking-widest text-flame">Fidelização</span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
              Transforme clientes em clientes frequentes.
            </h2>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              { icon: Gift, title: "Programa de fidelidade", text: "Incentive novas compras premiando quem pede com frequência." },
              { icon: Coins, title: "Cashback", text: "Dê um motivo concreto para o cliente voltar no próximo pedido." },
              { icon: Undo2, title: "Recuperador de clientes", text: "Reative automaticamente quem parou de comprar." },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-3xl border border-border bg-card p-8 text-center shadow-[var(--shadow-soft)]">
                <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-flame text-flame-foreground">
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold text-foreground">{title}</h3>
                <p className="mt-3 text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
          <p className="mt-12 text-center text-2xl font-bold text-foreground">
            A primeira venda é importante. A segunda é ainda melhor.
          </p>
        </div>
      </section>
    </>
  );
}
