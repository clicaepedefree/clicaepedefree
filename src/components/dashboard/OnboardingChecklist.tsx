import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, ArrowRight, Sparkles, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface OnboardingChecklistProps {
  restaurant: any;
}

interface Step {
  key: string;
  title: string;
  description: string;
  done: boolean;
  action: () => void;
  actionLabel: string;
}

export function OnboardingChecklist({ restaurant }: OnboardingChecklistProps) {
  const navigate = useNavigate();
  const [hasProducts, setHasProducts] = useState(false);
  const [hasHours, setHasHours] = useState(false);
  const [hasPayment, setHasPayment] = useState(false);
  const [linkShared, setLinkShared] = useState(
    () => localStorage.getItem(`link_shared_${restaurant.id}`) === "1"
  );
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(`onboarding_dismissed_${restaurant.id}`) === "1"
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ count: pCount }, { count: hCount }, { count: pmCount }] = await Promise.all([
          supabase.from("products").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurant.id).eq("is_active", true),
          supabase.from("operating_hours").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurant.id),
          supabase.from("payment_methods").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurant.id).eq("is_active", true),
        ]);
        if (cancelled) return;
        setHasProducts((pCount || 0) > 0);
        setHasHours((hCount || 0) > 0);
        setHasPayment((pmCount || 0) > 0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [restaurant.id]);

  const shareLink = async () => {
    const link = `${window.location.origin}/cardapio/${restaurant.slug}`;
    const text = `Olá! Confira nosso cardápio e faça seu pedido: ${link}`;
    const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(wa, "_blank");
    localStorage.setItem(`link_shared_${restaurant.id}`, "1");
    setLinkShared(true);
  };

  const steps: Step[] = [
    {
      key: "products",
      title: "Cadastre seu primeiro prato",
      description: "Adicione os pratos do seu cardápio para começar a vender.",
      done: hasProducts,
      action: () => navigate("/admin/settings?tab=products"),
      actionLabel: "Adicionar prato",
    },
    {
      key: "hours",
      title: "Defina o horário de funcionamento",
      description: "Diga quando sua loja está aberta para receber pedidos.",
      done: hasHours,
      action: () => navigate("/admin/settings?tab=hours"),
      actionLabel: "Definir horário",
    },
    {
      key: "payment",
      title: "Escolha as formas de pagamento",
      description: "Marque como seus clientes vão pagar (PIX, dinheiro, cartão).",
      done: hasPayment,
      action: () => navigate("/admin/settings?tab=payment"),
      actionLabel: "Configurar pagamento",
    },
    {
      key: "share",
      title: "Compartilhe seu cardápio",
      description: "Mande o link para seus clientes pelo WhatsApp.",
      done: linkShared,
      action: shareLink,
      actionLabel: "Compartilhar agora",
    },
  ];

  const completed = steps.filter(s => s.done).length;
  const progress = (completed / steps.length) * 100;
  const allDone = completed === steps.length;

  if (loading || dismissed || allDone) {
    if (allDone && !dismissed) {
      return (
        <Card className="border-whatsapp/30 bg-gradient-to-br from-whatsapp/5 to-transparent">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-whatsapp/20 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-whatsapp" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Tudo pronto! 🎉</h3>
              <p className="text-sm text-muted-foreground">Sua loja está configurada. Continue compartilhando o link!</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => {
              localStorage.setItem(`onboarding_dismissed_${restaurant.id}`, "1");
              setDismissed(true);
            }}>
              <X className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      );
    }
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-whatsapp/5 overflow-hidden">
      <CardContent className="p-5 lg:p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/15 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base lg:text-lg font-bold text-foreground">Configure sua loja em 4 passos</h3>
              <p className="text-xs lg:text-sm text-muted-foreground">
                {completed} de {steps.length} concluídos — você está quase lá!
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => {
            localStorage.setItem(`onboarding_dismissed_${restaurant.id}`, "1");
            setDismissed(true);
          }} title="Ocultar">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress bar */}
        <div className="h-2 w-full rounded-full bg-muted mb-5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-whatsapp transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="grid gap-2.5">
          {steps.map((step, i) => (
            <div
              key={step.key}
              className={cn(
                "flex items-center gap-3 p-3 lg:p-4 rounded-xl border transition-all",
                step.done
                  ? "bg-whatsapp/5 border-whatsapp/20"
                  : "bg-card border-border hover:border-primary/40 hover:shadow-sm"
              )}
            >
              <div className="flex-shrink-0">
                {step.done ? (
                  <CheckCircle2 className="h-6 w-6 text-whatsapp" />
                ) : (
                  <div className="relative">
                    <Circle className="h-6 w-6 text-muted-foreground/40" />
                    <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-muted-foreground">
                      {i + 1}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-semibold",
                  step.done ? "text-muted-foreground line-through" : "text-foreground"
                )}>
                  {step.title}
                </p>
                {!step.done && (
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                )}
              </div>
              {!step.done && (
                <Button size="sm" onClick={step.action} className="flex-shrink-0 gap-1.5">
                  {step.actionLabel}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
