import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Store, AlertTriangle, LoaderCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface StoreStatusBannerProps {
  restaurant: any;
  onRestaurantUpdate: (r: any) => void;
  compact?: boolean;
}

export function StoreStatusBanner({ restaurant, onRestaurantUpdate, compact = false }: StoreStatusBannerProps) {
  const isOpen = restaurant.is_open ?? true;
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const blocked = restaurant.is_blocked;

  const toggle = async () => {
    if (blocked || loading) return;
    setLoading(true);
    const next = !isOpen;

    try {
      const { data, error } = await supabase.from("restaurants").update({ is_open: next })
        .eq("id", restaurant.id).or("is_blocked.eq.false,is_blocked.is.null").select("is_open").single();
      if (error) throw error;
      onRestaurantUpdate({ ...restaurant, is_open: data.is_open });
      toast({
        title: data.is_open ? "Loja aberta" : "Loja fechada",
        description: data.is_open ? "Você está recebendo pedidos." : "Clientes podem ver o cardápio, mas não podem pedir.",
      });
    } catch {
      toast({ variant: "destructive", title: "Não foi possível alterar o status da loja" });
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    const Icon = loading ? LoaderCircle : blocked ? AlertTriangle : Store;
    return (
      <Button
        type="button"
        size="sm"
        className={cn("gap-1.5 text-white", isOpen && !blocked ? "bg-emerald-700 hover:bg-emerald-800" : "bg-red-700 hover:bg-red-800")}
        onClick={() => void toggle()}
        disabled={loading || blocked}
        aria-busy={loading}
        title={blocked ? "Loja bloqueada" : isOpen ? "Loja aberta" : "Loja fechada"}
      >
        <Icon className={cn("size-4", loading && "animate-spin")} aria-hidden="true" />
        {blocked ? "Loja bloqueada" : loading ? "Atualizando…" : isOpen ? "Fechar loja" : "Abrir loja"}
      </Button>
    );
  }

  if (blocked) {
    return (
      <div className="flex items-center gap-3 p-3 lg:p-4 rounded-xl border border-destructive/30 bg-destructive/5">
        <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-destructive">Loja bloqueada</p>
          <p className="text-xs text-muted-foreground">Limite mensal atingido. Entre em contato para liberar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 lg:p-4 rounded-xl border transition-colors",
      isOpen ? "border-whatsapp/30 bg-whatsapp/5" : "border-border bg-muted/30"
    )}>
      <div className={cn(
        "h-10 w-10 lg:h-11 lg:w-11 rounded-xl flex items-center justify-center",
        isOpen ? "bg-whatsapp/15" : "bg-muted"
      )}>
        <Store className={cn("h-5 w-5", isOpen ? "text-whatsapp" : "text-muted-foreground")} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">
          {isOpen ? "Sua loja está ABERTA" : "Sua loja está FECHADA"}
        </p>
        <p className="text-xs text-muted-foreground">
          {isOpen ? "Recebendo pedidos agora" : "Clientes não conseguem pedir"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline text-xs font-medium text-muted-foreground">
          {isOpen ? "Aberta" : "Fechada"}
        </span>
        <Switch
          aria-label={isOpen ? "Fechar loja" : "Abrir loja"}
          checked={isOpen}
          onCheckedChange={toggle}
          disabled={loading}
          className="data-[state=checked]:bg-whatsapp scale-110"
        />
      </div>
    </div>
  );
}
