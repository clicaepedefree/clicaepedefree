import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ShoppingCart,
  User,
  Phone,
  MapPin,
  Clock,
  Printer,
  Truck,
  CreditCard,
  CheckCircle,
  AlertTriangle,
  Search,
  Store,
  Bike,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatPaymentMethod } from "@/lib/payment-labels";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Order {
  id: string;
  order_number: number | null;
  customer_name: string;
  customer_phone: string;
  items: any;
  subtotal: number;
  delivery_fee: number;
  total: number;
  address: string;
  payment_method: string;
  payment_status?: string | null;
  pix_paid_at?: string | null;
  status: string;
  created_at: string;
}

const formatOrderNumber = (order: Order) =>
  order.order_number ? `#${String(order.order_number).padStart(2, "0")}` : `#${order.id.slice(-8)}`;

const STATUS_META: Record<string, { label: string; className: string }> = {
  new: { label: "Novo", className: "bg-blue-100 text-blue-700 border-blue-200" },
  preparing: { label: "Preparando", className: "bg-amber-100 text-amber-700 border-amber-200" },
  delivered: { label: "Em entrega", className: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  completed: { label: "Finalizado", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  cancelled: { label: "Cancelado", className: "bg-red-100 text-red-700 border-red-200" },
};

const OPEN_STATUSES = ["new", "preparing", "delivered"];

interface OrdersKanbanProps {
  restaurant: any;
}

export function OrdersKanban({ restaurant }: OrdersKanbanProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [refunding, setRefunding] = useState(false);
  const [filter, setFilter] = useState<string>("open");
  const [search, setSearch] = useState("");

  const playNewOrderSound = () => {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const beep = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration + 0.05);
      };
      beep(880, 0, 0.25);
      beep(1175, 0.28, 0.35);
    } catch (e) {
      console.warn("Audio playback failed:", e);
    }
  };

  const isVisibleOrder = (o: any) =>
    o && o.restaurant_id === restaurant.id &&
    (o.status === "new" || (o.payment_status === "pago" && o.status !== "cancelled"));

  useEffect(() => {
    fetchOrders();
    const channel = supabase
      .channel("orders-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurant.id}` },
        (payload: any) => {
          const newRow = payload.new;
          const oldRow = payload.old;
          const becameVisible =
            (payload.eventType === "INSERT" && isVisibleOrder(newRow)) ||
            (payload.eventType === "UPDATE" && isVisibleOrder(newRow) && !isVisibleOrder(oldRow));
          if (becameVisible) {
            playNewOrderSound();
            toast.success("🔔 Novo pedido recebido!", {
              description: newRow?.customer_name ? `Cliente: ${newRow.customer_name}` : undefined,
              duration: 8000,
            });
          }
          fetchOrders();
        },
      )
      .subscribe();

    const pollId = setInterval(fetchOrders, 20000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant.id]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("secure_orders_view")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar pedidos:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (
      newStatus === "cancelled" &&
      order?.payment_method === "pix_online" &&
      order?.payment_status === "pago"
    ) {
      setCancelTarget(order);
      return;
    }
    try {
      const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
      if (error) throw error;
      fetchOrders();
      toast.success("Status atualizado");
    } catch (error: any) {
      console.error("Erro ao atualizar status do pedido:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const handleConfirmRefund = async () => {
    if (!cancelTarget) return;
    setRefunding(true);
    try {
      const { data, error } = await supabase.functions.invoke("validapay-refund-order", {
        body: { order_id: cancelTarget.id, reason: "Pedido cancelado pela loja" },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Reembolso solicitado. O valor será estornado ao cliente.");
      setCancelTarget(null);
      fetchOrders();
    } catch (err: any) {
      console.error("Refund error:", err);
      toast.error(err?.message || "Falha ao processar reembolso");
    } finally {
      setRefunding(false);
    }
  };

  const filteredOrders = useMemo(() => {
    let list = orders;
    if (filter === "open") list = list.filter((o) => OPEN_STATUSES.includes(o.status));
    else if (filter !== "all") list = list.filter((o) => o.status === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (o) =>
          formatOrderNumber(o).toLowerCase().includes(q) ||
          (o.customer_name || "").toLowerCase().includes(q) ||
          (o.customer_phone || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [orders, filter, search]);

  useEffect(() => {
    if (!selectedId && filteredOrders.length > 0) {
      setSelectedId(filteredOrders[0].id);
    } else if (selectedId && !filteredOrders.find((o) => o.id === selectedId) && filteredOrders.length > 0) {
      setSelectedId(filteredOrders[0].id);
    }
  }, [filteredOrders, selectedId]);

  const selectedOrder = orders.find((o) => o.id === selectedId) || null;

  const totalValue = filteredOrders.reduce((s, o) => s + Number(o.total || 0), 0);

  const generateReceiptHTML = (order: Order) => {
    const orderType = order.delivery_fee > 0 ? "ENTREGA" : "RETIRADA";
    let itemsHTML = "";
    if (order.items && order.items.length > 0) {
      itemsHTML = order.items
        .map((item: any, index: number) => {
          const productName =
            item.productName || item.product_name || item.name || item.product?.name || `Produto #${index + 1}`;
          const unitPrice = Number(item.unitPrice || item.price || 0);
          const quantity = item.quantity || 1;
          const itemTotal = unitPrice * quantity;
          let addonsHTML = "";
          if (item.addons && item.addons.length > 0) {
            addonsHTML = item.addons
              .map((addon: any, ai: number) => {
                const an = addon.option?.name || addon.name || `Adicional ${ai + 1}`;
                const ap = Number(addon.option?.price || addon.price || 0);
                return `<div style="margin-left:5mm;display:flex;justify-content:space-between;font-size:10px;"><div>+ ${an}</div><div>R$ ${(ap * quantity).toFixed(2)}</div></div>`;
              })
              .join("");
          }
          return `<div style="margin-bottom:1mm;"><div style="display:flex;justify-content:space-between;"><div>${quantity}x ${productName}</div><div>R$ ${itemTotal.toFixed(2)}</div></div>${addonsHTML}</div>`;
        })
        .join("");
    }
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cupom ${formatOrderNumber(order)}</title><style>@page{size:80mm auto;margin:0}*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;font-size:12px;line-height:1.2;color:#000;background:#fff;padding:5mm;width:80mm}.tc{text-align:center}.tb{font-weight:bold}.sep{border-top:1px dashed #000;margin:3mm 0}</style></head><body><div class="tc"><div class="tb" style="font-size:14px">${restaurant.name}</div></div><div class="sep"></div><div class="tc"><div class="tb">CUPOM NÃO FISCAL</div><div>Pedido ${formatOrderNumber(order)}</div><div>${format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</div></div><div class="sep"></div><div class="tc tb">${orderType}</div>${order.customer_name ? `<div><div><strong>Cliente:</strong> ${order.customer_name}</div>${order.customer_phone ? `<div><strong>Telefone:</strong> ${order.customer_phone}</div>` : ""}${orderType === "ENTREGA" && order.address ? `<div><strong>Endereço:</strong> ${order.address}</div>` : ""}</div>` : ""}<div class="sep"></div><div><div class="tb">ITENS:</div>${itemsHTML}</div><div class="sep"></div><div><div style="display:flex;justify-content:space-between"><div>Subtotal:</div><div>R$ ${Number(order.subtotal || 0).toFixed(2)}</div></div>${Number(order.delivery_fee || 0) > 0 ? `<div style="display:flex;justify-content:space-between"><div>Taxa de entrega:</div><div>R$ ${Number(order.delivery_fee).toFixed(2)}</div></div>` : ""}<div class="sep"></div><div style="display:flex;justify-content:space-between" class="tb"><div>TOTAL:</div><div>R$ ${Number(order.total || 0).toFixed(2)}</div></div></div>${order.payment_method ? `<div class="sep"></div><div><strong>Pagamento:</strong> ${formatPaymentMethod(order.payment_method)}</div>` : ""}<div class="sep"></div><div class="tc"><div>Obrigado pela preferência!</div></div></body></html>`;
  };

  const handlePrintReceipt = (order: Order) => {
    const w = window.open("", "_blank");
    if (!w) {
      alert("Permita pop-ups para imprimir.");
      return;
    }
    w.document.write(generateReceiptHTML(order));
    w.document.close();
    w.onload = () => setTimeout(() => { w.print(); w.close(); }, 100);
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const meta = STATUS_META[status] || STATUS_META.new;
    return (
      <Badge variant="outline" className={cn("font-medium border", meta.className)}>
        {meta.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando pedidos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(320px,400px)_1fr] min-h-[calc(100vh-14rem)]">
        {/* LIST */}
        <div className="border-r border-border/50 flex flex-col bg-muted/10">
          <div className="p-4 border-b border-border/50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Pedidos</h2>
                <p className="text-xs text-muted-foreground">
                  Total: {filteredOrders.length} · Valor: R$ {totalValue.toFixed(2).replace(".", ",")}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar pedidos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Abertos</SelectItem>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="new">Novo</SelectItem>
                  <SelectItem value="preparing">Preparando</SelectItem>
                  <SelectItem value="delivered">Em entrega</SelectItem>
                  <SelectItem value="completed">Finalizado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {filteredOrders.length === 0 && (
                <div className="text-center text-muted-foreground py-12">
                  <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Nenhum pedido encontrado</p>
                </div>
              )}
              {filteredOrders.map((order) => {
                const active = order.id === selectedId;
                const isDelivery = Number(order.delivery_fee) > 0;
                return (
                  <button
                    key={order.id}
                    onClick={() => setSelectedId(order.id)}
                    className={cn(
                      "w-full text-left rounded-lg border p-3 transition-all hover:border-primary/50 hover:shadow-sm",
                      active ? "border-primary bg-primary/5 shadow-sm" : "border-border/60 bg-card",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isDelivery ? (
                          <Bike className="h-4 w-4 text-primary flex-shrink-0" />
                        ) : (
                          <Store className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                        <span className="font-semibold text-sm truncate">{formatOrderNumber(order)}</span>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Feito às {format(new Date(order.created_at), "HH:mm")}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{order.customer_name || "Cliente"}</span>
                      <span className="text-sm font-semibold">R$ {Number(order.total).toFixed(2).replace(".", ",")}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* DETAIL */}
        <div className="flex flex-col min-h-0">
          {!selectedOrder ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p>Selecione um pedido para ver os detalhes</p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-5 border-b border-border/50 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">Pedido {formatOrderNumber(selectedOrder)}</h3>
                  <p className="text-xs text-muted-foreground">
                    Feito {format(new Date(selectedOrder.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <StatusBadge status={selectedOrder.status} />
              </div>

              <ScrollArea className="flex-1">
                <div className="p-5 space-y-5">
                  {/* Tipo + Cliente */}
                  <div className="rounded-lg border border-border/50 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {Number(selectedOrder.delivery_fee) > 0 ? (
                        <>
                          <Truck className="h-4 w-4 text-primary" />
                          <span>Entrega (Delivery)</span>
                        </>
                      ) : (
                        <>
                          <Store className="h-4 w-4 text-primary" />
                          <span>Retirada no local</span>
                        </>
                      )}
                    </div>
                    <Separator />
                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedOrder.customer_name || "Não informado"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedOrder.customer_phone || "Não informado"}</span>
                      </div>
                      {Number(selectedOrder.delivery_fee) > 0 && selectedOrder.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <span>{selectedOrder.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Itens */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Itens do pedido</h4>
                    <div className="space-y-2">
                      {selectedOrder.items?.map((item: any, index: number) => {
                        const name =
                          item.productName || item.product_name || item.name || item.product?.name || `Produto #${index + 1}`;
                        const qty = item.quantity || 1;
                        const unit = Number(item.unitPrice || item.price || 0);
                        return (
                          <div key={index} className="rounded-lg border border-border/50 p-3">
                            <div className="flex justify-between font-medium text-sm">
                              <span>
                                {qty}x {name}
                              </span>
                              <span>R$ {(unit * qty).toFixed(2).replace(".", ",")}</span>
                            </div>
                            {item.addons?.length > 0 && (
                              <div className="mt-2 space-y-0.5">
                                {item.addons.map((addon: any, ai: number) => (
                                  <div key={ai} className="flex justify-between text-xs text-muted-foreground">
                                    <span>+ {addon.option?.name || addon.name}</span>
                                    <span>R$ {Number(addon.option?.price || addon.price || 0).toFixed(2).replace(".", ",")}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {item.observations && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                <strong>Obs:</strong> {item.observations}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Resumo */}
                  <div className="rounded-lg border border-border/50 p-4 space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>R$ {Number(selectedOrder.subtotal).toFixed(2).replace(".", ",")}</span>
                    </div>
                    {Number(selectedOrder.delivery_fee) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Taxa de entrega</span>
                        <span>R$ {Number(selectedOrder.delivery_fee).toFixed(2).replace(".", ",")}</span>
                      </div>
                    )}
                    <Separator className="my-2" />
                    <div className="flex justify-between font-semibold text-base">
                      <span>Total</span>
                      <span>R$ {Number(selectedOrder.total).toFixed(2).replace(".", ",")}</span>
                    </div>
                    {selectedOrder.payment_method && (
                      <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
                        <CreditCard className="h-3.5 w-3.5" />
                        <span>{formatPaymentMethod(selectedOrder.payment_method)}</span>
                        {selectedOrder.payment_method === "pix_online" && selectedOrder.payment_status === "pago" && (
                          <Badge className="h-5 px-1.5 text-[10px] bg-green-600 hover:bg-green-600 text-white">
                            <CheckCircle className="h-3 w-3 mr-0.5" /> Pago
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>

              {/* Actions */}
              <div className="border-t border-border/50 p-4 bg-muted/10 flex flex-wrap items-center gap-2">
                <Select
                  value={selectedOrder.status}
                  onValueChange={(v) => updateOrderStatus(selectedOrder.id, v)}
                >
                  <SelectTrigger className="w-[170px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Novo</SelectItem>
                    <SelectItem value="preparing">Preparando</SelectItem>
                    <SelectItem value="delivered">Em entrega</SelectItem>
                    <SelectItem value="completed">Finalizado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => handlePrintReceipt(selectedOrder)}>
                  <Printer className="h-4 w-4 mr-2" /> Imprimir
                </Button>
                <div className="flex-1" />
                {selectedOrder.status !== "completed" && selectedOrder.status !== "cancelled" && (
                  <Button
                    size="sm"
                    onClick={() => updateOrderStatus(selectedOrder.id, "completed")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" /> Finalizar pedido
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => !open && !refunding && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Cancelar pedido pago e reembolsar?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {cancelTarget && (
                <>
                  Este pedido foi pago via PIX ({formatOrderNumber(cancelTarget)}) no valor de{" "}
                  <strong>R$ {Number(cancelTarget.total).toFixed(2)}</strong>. Ao confirmar, o valor será{" "}
                  <strong>estornado automaticamente</strong> para o cliente e descontado do seu saldo na Carteira.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={refunding}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmRefund();
              }}
              disabled={refunding}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {refunding ? "Processando..." : "Cancelar e reembolsar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
