import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Store, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface StoreStatusBannerProps {
  restaurant: any;
  onRestaurantUpdate: (r: any) => void;
}

export function StoreStatusBanner({ restaurant, onRestaurantUpdate }: StoreStatusBannerProps) {
  const [isOpen, setIsOpen] = useState(restaurant.is_open ?? true);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const blocked = restaurant.is_blocked;

  const toggle = async () => {
    if (blocked) return;
    setLoading(true);
    const next = !isOpen;
    const { error } = await supabase.from("restaurants").update({ is_open: next }).eq("id", restaurant.id);
    setLoading(false);
    if (error) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
      return;
    }
    setIsOpen(next);
    onRestaurantUpdate({ ...restaurant, is_open: next });
    toast({
      title: next ? "✓ Loja aberta" : "Loja fechada",
      description: next ? "Você está recebendo pedidos." : "Clientes verão o cardápio mas não poderão pedir.",
    });
  };

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
          checked={isOpen}
          onCheckedChange={toggle}
          disabled={loading}
          className="data-[state=checked]:bg-whatsapp scale-110"
        />
      </div>
    </div>
  );
}
