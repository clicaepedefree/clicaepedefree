import { XCircle, Store, Clock, ShoppingCart, MessageSquareWarning, FolderSearch, Repeat, TrendingDown } from "lucide-react";
import dashboard from "@/assets/mockup-dashboard.png.asset.json";

const problems = [
  { icon: Repeat, text: "Clientes compram uma vez e nunca mais voltam." },
  { icon: ShoppingCart, text: "Pedidos abandonados são esquecidos." },
  { icon: MessageSquareWarning, text: "A equipe perde tempo respondendo as mesmas perguntas." },
  { icon: Clock, text: "O atendimento manual demora e o cliente desiste." },
  { icon: FolderSearch, text: "Informações da operação ficam espalhadas." },
  { icon: Store, text: "O restaurante depende demais dos marketplaces." },
  { icon: XCircle, text: "O dono faz tarefas que poderiam ser automatizadas." },
  { icon: TrendingDown, text: "Oportunidades de venda são perdidas todos os dias." },
];

export function LandingProblem() {
  return (
    <section className="bg-background py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-sm font-bold uppercase tracking-widest text-flame">O problema</span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
            Seu restaurante poderia estar vendendo muito mais.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Pare de perder vendas por falta de atendimento, clientes que não voltam e carrinhos
            abandonados.
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {problems.map(({ icon: Icon, text }) => (
            <div
              key={text}
              className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-1"
            >
              <Icon className="mb-4 h-6 w-6 text-destructive" />
              <p className="text-sm font-medium leading-relaxed text-foreground">{text}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 overflow-hidden rounded-3xl bg-gradient-ink p-8 text-center text-white md:p-12">
          <p className="mx-auto max-w-2xl text-2xl font-bold leading-snug md:text-3xl">
            Enquanto você cuida de tarefas manuais, seus concorrentes estão vendendo.
          </p>
        </div>
      </div>

      {/* Solução */}
      <div className="container mx-auto mt-24 px-4">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="text-sm font-bold uppercase tracking-widest text-flame">A solução</span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
              Tudo o que seu restaurante precisa para vender mais, em um só lugar.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Vendas, atendimento, automação, relacionamento com clientes, fidelização e gestão
              funcionando juntos — sem planilhas soltas e sem depender de vários sistemas.
            </p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {["Vendas", "Atendimento", "Automação", "Relacionamento", "Fidelização", "Gestão"].map((i) => (
                <li key={i} className="flex items-center gap-3 rounded-xl bg-muted px-4 py-3 text-sm font-semibold text-foreground">
                  <span className="h-2 w-2 rounded-full bg-flame" />
                  {i}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 rounded-[2.5rem] bg-primary/10 blur-2xl" />
            <img
              src={dashboard.url}
              alt="Painel do sistema com métricas de vendas e faturamento do restaurante"
              className="relative w-full rounded-2xl"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
