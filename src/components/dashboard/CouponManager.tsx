import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TicketPercent, Trash2 } from "lucide-react";

interface CouponManagerProps {
  restaurantId: string;
}

type DiscountType = "percentage" | "fixed";

interface DiscountCoupon {
  id: string;
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  min_order_value: number;
  usage_limit: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export function CouponManager({ restaurantId }: CouponManagerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [coupons, setCoupons] = useState<DiscountCoupon[]>([]);

  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minOrderValue, setMinOrderValue] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : "Erro inesperado";

  const fetchCoupons = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("discount_coupons")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCoupons((data || []) as DiscountCoupon[]);
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar cupons",
        description: getErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  }, [restaurantId, toast]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const resetForm = () => {
    setCode("");
    setDiscountType("percentage");
    setDiscountValue("");
    setMinOrderValue("");
    setUsageLimit("");
    setExpiresAt("");
  };

  const handleCreateCoupon = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const normalizedCode = code.trim().toUpperCase().replace(/\s+/g, "");
    const parsedDiscountValue = Number(discountValue);
    const parsedMinOrderValue = minOrderValue ? Number(minOrderValue) : 0;
    const parsedUsageLimit = usageLimit ? Number(usageLimit) : null;

    if (!normalizedCode) {
      toast({
        variant: "destructive",
        title: "Código inválido",
        description: "Informe um código para o cupom.",
      });
      return;
    }

    if (!Number.isFinite(parsedDiscountValue) || parsedDiscountValue <= 0) {
      toast({
        variant: "destructive",
        title: "Desconto inválido",
        description: "Informe um valor de desconto maior que zero.",
      });
      return;
    }

    if (discountType === "percentage" && parsedDiscountValue > 100) {
      toast({
        variant: "destructive",
        title: "Desconto inválido",
        description: "Para cupom percentual, o valor máximo é 100%.",
      });
      return;
    }

    if (parsedUsageLimit !== null && (!Number.isInteger(parsedUsageLimit) || parsedUsageLimit <= 0)) {
      toast({
        variant: "destructive",
        title: "Limite inválido",
        description: "O limite de uso deve ser um número inteiro maior que zero.",
      });
      return;
    }

    setCreating(true);
    try {
      const payload = {
        restaurant_id: restaurantId,
        code: normalizedCode,
        discount_type: discountType,
        discount_value: parsedDiscountValue,
        min_order_value: parsedMinOrderValue,
        usage_limit: parsedUsageLimit,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        is_active: true,
      };

      const { error } = await supabase.from("discount_coupons").insert(payload);
      if (error) throw error;

      toast({
        title: "Cupom criado",
        description: `Cupom ${normalizedCode} cadastrado com sucesso.`,
      });

      resetForm();
      fetchCoupons();
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Erro ao criar cupom",
        description: getErrorMessage(error),
      });
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (coupon: DiscountCoupon, active: boolean) => {
    try {
      const { error } = await supabase
        .from("discount_coupons")
        .update({ is_active: active })
        .eq("id", coupon.id);

      if (error) throw error;

      setCoupons((prev) =>
        prev.map((item) => (item.id === coupon.id ? { ...item, is_active: active } : item))
      );
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar cupom",
        description: getErrorMessage(error),
      });
    }
  };

  const handleDelete = async (couponId: string) => {
    try {
      const { error } = await supabase.from("discount_coupons").delete().eq("id", couponId);
      if (error) throw error;

      setCoupons((prev) => prev.filter((item) => item.id !== couponId));
      toast({
        title: "Cupom removido",
        description: "O cupom foi removido com sucesso.",
      });
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Erro ao remover cupom",
        description: getErrorMessage(error),
      });
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TicketPercent className="h-5 w-5 text-primary" />
            Criar cupom de desconto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateCoupon} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="coupon-code">Código do cupom</Label>
              <Input
                id="coupon-code"
                placeholder="Ex: BEMVINDO10"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de desconto</Label>
              <Select value={discountType} onValueChange={(value) => setDiscountType(value as DiscountType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentual (%)</SelectItem>
                  <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount-value">Valor do desconto</Label>
              <Input
                id="discount-value"
                type="number"
                min="0"
                step="0.01"
                placeholder={discountType === "percentage" ? "10" : "5.00"}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="min-order">Pedido mínimo (opcional)</Label>
              <Input
                id="min-order"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={minOrderValue}
                onChange={(e) => setMinOrderValue(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="usage-limit">Limite de uso (opcional)</Label>
              <Input
                id="usage-limit"
                type="number"
                min="1"
                step="1"
                placeholder="Ex: 100"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expires-at">Data de expiração (opcional)</Label>
              <Input
                id="expires-at"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <Button type="submit" disabled={creating}>
                {creating ? "Criando cupom..." : "Criar cupom"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cupons cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Carregando cupons...</p>
          ) : coupons.length === 0 ? (
            <p className="text-muted-foreground">Nenhum cupom cadastrado ainda.</p>
          ) : (
            <div className="space-y-3">
              {coupons.map((coupon) => (
                <div key={coupon.id} className="rounded-lg border p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold tracking-wide">{coupon.code}</span>
                      <Badge variant={coupon.is_active ? "default" : "secondary"}>
                        {coupon.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Desconto: {coupon.discount_type === "percentage" ? `${coupon.discount_value}%` : formatCurrency(coupon.discount_value)}
                      {coupon.min_order_value > 0 ? ` • Pedido mínimo: ${formatCurrency(coupon.min_order_value)}` : ""}
                      {coupon.usage_limit ? ` • Uso: ${coupon.used_count}/${coupon.usage_limit}` : ""}
                    </p>
                    {coupon.expires_at && (
                      <p className="text-xs text-muted-foreground">
                        Expira em: {new Date(coupon.expires_at).toLocaleString("pt-BR")}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`coupon-active-${coupon.id}`} className="text-sm">Ativo</Label>
                      <Switch
                        id={`coupon-active-${coupon.id}`}
                        checked={coupon.is_active}
                        onCheckedChange={(checked) => handleToggleActive(coupon, checked)}
                      />
                    </div>

                    <Button variant="ghost" size="icon" onClick={() => handleDelete(coupon.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
