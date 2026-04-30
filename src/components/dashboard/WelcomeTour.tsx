import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChefHat, ShoppingCart, Settings, Share2, ArrowRight, ArrowLeft } from "lucide-react";

interface WelcomeTourProps {
  restaurantId: string;
}

const slides = [
  {
    icon: ChefHat,
    title: "Bem-vindo ao seu painel! 👋",
    text: "Aqui você vai gerenciar tudo da sua loja: pratos, pedidos, horários e pagamentos. Vamos te mostrar em 30 segundos.",
  },
  {
    icon: ChefHat,
    title: "1. Monte seu cardápio",
    text: "No menu lateral, abra ‘Meu Cardápio’ e cadastre seus pratos com foto, descrição e preço.",
  },
  {
    icon: ShoppingCart,
    title: "2. Receba pedidos",
    text: "Os pedidos chegam na seção ‘Pedidos’, organizados em colunas: novos, em preparo, prontos e entregues.",
  },
  {
    icon: Settings,
    title: "3. Configure sua loja",
    text: "Em ‘Ajustes’ você define horário de funcionamento, bairros que atende e formas de pagamento.",
  },
  {
    icon: Share2,
    title: "4. Compartilhe o link",
    text: "No topo da tela tem um botão para copiar o link e mandar no WhatsApp dos seus clientes.",
  },
];

export function WelcomeTour({ restaurantId }: WelcomeTourProps) {
  const key = `welcome_tour_${restaurantId}`;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(key)) {
      const t = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, [key]);

  const close = () => {
    localStorage.setItem(key, "1");
    setOpen(false);
  };

  const slide = slides[step];
  const Icon = slide.icon;
  const isLast = step === slides.length - 1;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-primary/10 via-background to-whatsapp/10 p-6 lg:p-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/15 flex items-center justify-center">
              <Icon className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl lg:text-2xl font-bold text-foreground">{slide.title}</h2>
            <p className="text-sm lg:text-base text-muted-foreground leading-relaxed">{slide.text}</p>

            {/* Dots */}
            <div className="flex gap-1.5 pt-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === step ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 mt-6">
            {step > 0 ? (
              <Button variant="outline" onClick={() => setStep(s => s - 1)} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
            ) : (
              <Button variant="ghost" onClick={close} className="text-muted-foreground">
                Pular
              </Button>
            )}
            {isLast ? (
              <Button onClick={close} className="gap-1.5 bg-primary">
                Começar a usar
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={() => setStep(s => s + 1)} className="gap-1.5">
                Próximo
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
