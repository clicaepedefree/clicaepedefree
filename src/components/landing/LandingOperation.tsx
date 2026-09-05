import {
  Boxes, Store, Wallet, PlugZap, Smartphone, Bot, BarChart3, Gift, Coins, Undo2, Repeat2, Facebook, Utensils, CheckCircle2,
} from "lucide-react";
import caixa from "@/assets/mockup-caixa.png";
import financeiro from "@/assets/mockup-financeiro.png";
import mesas from "@/assets/mockup-mesas.png";
import dashboard from "@/assets/mockup-dashboard.png";

const features = [
  { icon: Smartphone, label: "Cardápio digital" },
  { icon: Bot, label: "Robô de WhatsApp" },
  { icon: Utensils, label: "Integração com iFood" },
  { icon: Utensils, label: "Integração com 99Food" },
  { icon: Facebook, label: "Pixel do Facebook" },
  { icon: Boxes, label: "Controle de estoque" },
  { icon: Store, label: "PDV para balcão" },
  { icon: Undo2, label: "Recuperador de clientes automático" },
  { icon: Repeat2, label: "Recuperador de carrinho abandonado" },
  { icon: Gift, label: "Programa de fidelidade" },
  { icon: Coins, label: "Cashback" },
  { icon: Wallet, label: "Gestão financeira" },
];

export function LandingOperation() {
  return (
    <>
      {/* Integrações */}
      <section className="bg-muted py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-sm font-bold uppercase tracking-widest text-flame">Integrações</span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
              Seu restaurante conectado aos principais canais de venda.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Centralize sua operação e aproveite melhor cada canal que traz clientes para o seu
              restaurante.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { name: "iFood", text: "Receba os pedidos do marketplace dentro da mesma operação." },
              { name: "99Food", text: "Mais um canal de pedidos sem dobrar o trabalho da equipe." },
              { name: "WhatsApp", text: "Atendimento e vendas no canal onde o cliente já está." },
              { name: "Pixel do Facebook", text: "Acompanhe suas campanhas e entenda o que traz pedido." },
            ].map((c) => (
              <div key={c.name} className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
                <PlugZap className="mb-4 h-6 w-6 text-flame" />
                <h3 className="text-lg font-bold text-foreground">{c.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Controle da operação */}
      <section className="bg-background py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="text-sm font-bold uppercase tracking-widest text-flame">Controle</span>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
                Mais controle. Menos planilhas.
              </h2>
              <div className="mt-8 space-y-4">
                {[
                  { icon: Boxes, t: "Controle de estoque", d: "Saiba o que está acabando antes de faltar." },
                  { icon: Store, t: "PDV para balcão", d: "Venda no salão e no delivery na mesma tela." },
                  { icon: BarChart3, t: "Gestão financeira", d: "Entradas, saídas e caixa em um lugar só." },
                ].map(({ icon: Icon, t, d }) => (
                  <div key={t} className="flex gap-4 rounded-2xl border border-border bg-card p-5">
                    <Icon className="h-6 w-6 shrink-0 text-flame" />
                    <div>
                      <h3 className="font-bold text-foreground">{t}</h3>
                      <p className="text-sm text-muted-foreground">{d}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-muted-foreground">
                Tenha uma visão mais clara da operação e tome decisões melhores sem depender de
                controles espalhados.
              </p>
            </div>
            <div className="space-y-4">
              <img src={caixa} alt="Tela de gestão de caixa do sistema" className="w-full rounded-2xl shadow-[var(--shadow-soft)]" loading="lazy" />
              <img src={financeiro} alt="Relatório de movimentação de caixa" className="w-full rounded-2xl shadow-[var(--shadow-soft)]" loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      {/* Todos os recursos */}
      <section id="recursos" className="bg-ink py-20 text-white md:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-sm font-bold uppercase tracking-widest text-flame">Tudo incluído</span>
            <h2 className="mt-4 text-3xl font-extrabold md:text-5xl">
              Um sistema completo para o seu restaurante.
            </h2>
            <p className="mt-4 text-white/70">Todos os recursos abaixo fazem parte do plano único.</p>
          </div>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-flame text-flame-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="font-semibold">{label}</span>
                <CheckCircle2 className="ml-auto h-5 w-5 text-mint" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demonstração */}
      <section id="demonstracao" className="bg-muted py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-sm font-bold uppercase tracking-widest text-flame">Demonstração</span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
              Veja tudo funcionando na prática.
            </h2>
          </div>
          <div className="mt-14 grid gap-6 lg:grid-cols-2">
            <img src={dashboard} alt="Painel com métricas de vendas do restaurante" className="w-full rounded-3xl shadow-[var(--shadow-soft)]" loading="lazy" />
            <img src={mesas} alt="Atendimento e gestão de mesas no sistema" className="w-full rounded-3xl shadow-[var(--shadow-soft)]" loading="lazy" />
            <img src={caixa} alt="Gestão de caixa e resumo por forma de pagamento" className="w-full rounded-3xl shadow-[var(--shadow-soft)]" loading="lazy" />
            <img src={financeiro} alt="Movimentação financeira detalhada" className="w-full rounded-3xl shadow-[var(--shadow-soft)]" loading="lazy" />
          </div>
        </div>
      </section>
    </>
  );
}
