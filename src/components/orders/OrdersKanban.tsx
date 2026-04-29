import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, User, Phone, MapPin, Clock, Printer, Truck, Eye, CreditCard, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatPaymentMethod } from "@/lib/payment-labels";

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
  order.order_number ? `#${String(order.order_number).padStart(2, '0')}` : `#${order.id.slice(-8)}`;

interface OrdersKanbanProps {
  restaurant: any;
}

export function OrdersKanban({ restaurant }: OrdersKanbanProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const statusColumns = [
    { key: 'new', title: 'Novos', color: 'bg-blue-50 border-blue-200' },
    { key: 'preparing', title: 'Em Preparo', color: 'bg-yellow-50 border-yellow-200' },
    { key: 'delivered', title: 'Em Entrega', color: 'bg-green-50 border-green-200' },
    { key: 'cancelled', title: 'Cancelados', color: 'bg-red-50 border-red-200' }
  ];

  useEffect(() => {
    fetchOrders();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `restaurant_id=eq.${restaurant.id}`
      }, (payload) => {
        console.log('Order change detected:', payload);
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurant.id]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('secure_orders_view')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setOrders(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      
      fetchOrders();
    } catch (error: any) {
      console.error('Erro ao atualizar status do pedido:', error);
    }
  };

  const confirmDelivery = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', orderId);

      if (error) throw error;
      
      fetchOrders();
    } catch (error: any) {
      console.error('Erro ao confirmar entrega:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      new: { label: "Novo", variant: "secondary" as const },
      preparing: { label: "Em Preparo", variant: "outline" as const },
      delivered: { label: "Em Entrega", variant: "default" as const },
      cancelled: { label: "Cancelado", variant: "destructive" as const }
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.new;
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const handlePrintReceipt = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita pop-ups para usar a função de impressão.');
      return;
    }

    const printContent = generateReceiptHTML(order);
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 100);
    };
  };

  const generateReceiptHTML = (order: Order) => {
    const orderType = order.delivery_fee > 0 ? "ENTREGA" : "RETIRADA";
    
    let itemsHTML = '';
    if (order.items && order.items.length > 0) {
      itemsHTML = order.items.map((item: any, index: number) => {
        const productName = item.productName || 
                          item.product_name || 
                          item.name || 
                          item.product?.name || 
                          `Produto #${index + 1}`;
        
        const unitPrice = Number(item.unitPrice || item.price || 0);
        const quantity = item.quantity || 1;
        const itemTotal = unitPrice * quantity;

        let addonsHTML = '';
        if (item.addons && item.addons.length > 0) {
          addonsHTML = item.addons.map((addon: any, addonIndex: number) => {
            const addonName = addon.option?.name || addon.name || `Adicional ${addonIndex + 1}`;
            const addonPrice = Number(addon.option?.price || addon.price || 0);
            
            return `
              <div style="margin-left: 5mm; display: flex; justify-content: space-between; font-size: 10px;">
                <div>+ ${addonName}</div>
                <div>R$ ${(addonPrice * quantity).toFixed(2)}</div>
              </div>
            `;
          }).join('');
        }

        return `
          <div style="margin-bottom: 1mm;">
            <div style="display: flex; justify-content: space-between;">
              <div>${quantity}x ${productName}</div>
              <div>R$ ${itemTotal.toFixed(2)}</div>
            </div>
            ${addonsHTML}
          </div>
        `;
      }).join('');
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Cupom - Pedido ${formatOrderNumber(order)}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.2; color: black; background: white; padding: 5mm; width: 80mm; }
            .text-center { text-align: center; }
            .text-bold { font-weight: bold; }
            .separator { border-top: 1px dashed black; margin: 3mm 0; }
          </style>
        </head>
        <body>
          <div class="text-center">
            <div class="text-bold" style="font-size: 14px;">${restaurant.name}</div>
            ${restaurant.whatsapp ? `<div style="font-size: 10px;">WhatsApp: ${restaurant.whatsapp}</div>` : ''}
          </div>
          
          <div class="separator"></div>
          
          <div class="text-center">
            <div class="text-bold">CUPOM NÃO FISCAL</div>
            <div>Pedido ${formatOrderNumber(order)}</div>
            <div>${format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>
          </div>
          
          <div class="separator"></div>
          
          <div class="text-center text-bold">${orderType}</div>
          
          ${order.customer_name ? `
            <div>
              <div><strong>Cliente:</strong> ${order.customer_name}</div>
              ${order.customer_phone ? `<div><strong>Telefone:</strong> ${order.customer_phone}</div>` : ''}
              ${orderType === "ENTREGA" && order.address ? `<div><strong>Endereço:</strong> ${order.address}</div>` : ''}
            </div>
          ` : ''}
          
          <div class="separator"></div>
          
          <div>
            <div class="text-bold">ITENS:</div>
            ${itemsHTML}
          </div>
          
          <div class="separator"></div>
          
          <div>
            <div style="display: flex; justify-content: space-between;">
              <div>Subtotal:</div>
              <div>R$ ${Number(order.subtotal || 0).toFixed(2)}</div>
            </div>
            
            ${Number(order.delivery_fee || 0) > 0 ? `
              <div style="display: flex; justify-content: space-between;">
                <div>Taxa de entrega:</div>
                <div>R$ ${Number(order.delivery_fee).toFixed(2)}</div>
              </div>
            ` : ''}
            
            <div class="separator"></div>
            
            <div style="display: flex; justify-content: space-between;" class="text-bold">
              <div>TOTAL:</div>
              <div>R$ ${Number(order.total || 0).toFixed(2)}</div>
            </div>
          </div>
          
          ${order.payment_method ? `
            <div class="separator"></div>
            <div><strong>Pagamento:</strong> ${order.payment_method}</div>
          ` : ''}
          
          <div class="separator"></div>
          
          <div class="text-center">
            <div>Obrigado pela preferência!</div>
            <div>${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>
          </div>
        </body>
      </html>
    `;
  };

  const getOrdersByStatus = (status: string) => {
    return orders.filter(order => order.status === status && order.status !== 'completed');
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pedidos</h2>
          <p className="text-muted-foreground">
            Total de {orders.length} pedido{orders.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statusColumns.map((column) => {
          const columnOrders = getOrdersByStatus(column.key);
          
          return (
            <div key={column.key} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">{column.title}</h3>
                <Badge variant="outline" className="text-xs">
                  {columnOrders.length}
                </Badge>
              </div>
              
              <div className={`min-h-[500px] rounded-lg border-2 border-dashed p-4 space-y-3 ${column.color}`}>
                {columnOrders.map((order) => (
                  <Card key={order.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">
                          {formatOrderNumber(order)}
                        </CardTitle>
                        {getStatusBadge(order.status)}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(order.created_at), "HH:mm", { locale: ptBR })}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm">
                          <User className="h-3 w-3" />
                          <span className="truncate">{order.customer_name || "Cliente"}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <ShoppingCart className="h-3 w-3" />
                          <span>{order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CreditCard className="h-3 w-3" />
                          <span className="truncate">{formatPaymentMethod(order.payment_method)}</span>
                          {order.payment_method === 'pix_online' && order.payment_status === 'pago' && (
                            <Badge className="ml-1 h-5 px-1.5 text-[10px] bg-green-600 hover:bg-green-600 text-white">
                              <CheckCircle className="h-3 w-3 mr-0.5" /> Pago
                            </Badge>
                          )}
                          {order.payment_method === 'pix_online' && order.payment_status === 'aguardando_pagamento' && (
                            <Badge variant="outline" className="ml-1 h-5 px-1.5 text-[10px] border-amber-500 text-amber-600">
                              Aguardando
                            </Badge>
                          )}
                        </div>
                        <div className="font-medium text-sm">
                          R$ {Number(order.total).toFixed(2)}
                        </div>
                      </div>
                      
                       <div className="flex gap-1 pt-2">
                         <Sheet>
                           <SheetTrigger asChild>
                             <Button 
                               size="sm" 
                               variant="outline" 
                               className="flex-1 text-xs"
                               onClick={() => setSelectedOrder(order)}
                             >
                               <Eye className="h-3 w-3 mr-1" />
                               Ver
                             </Button>
                           </SheetTrigger>
                          <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                            <SheetHeader>
                              <SheetTitle>Pedido {selectedOrder ? formatOrderNumber(selectedOrder) : ''}</SheetTitle>
                            </SheetHeader>
                            {selectedOrder && (
                              <div className="mt-6 space-y-4">
                                {/* Status do Pedido */}
                                <div className="space-y-2">
                                  <h3 className="font-semibold">Status</h3>
                                  <Select value={selectedOrder.status} onValueChange={(value) => updateOrderStatus(selectedOrder.id, value)}>
                                    <SelectTrigger className="w-full">
                                      <SelectValue>
                                        {getStatusBadge(selectedOrder.status)}
                                      </SelectValue>
                                    </SelectTrigger>
                                     <SelectContent>
                                       <SelectItem value="new">Novo</SelectItem>
                                       <SelectItem value="preparing">Em Preparo</SelectItem>
                                       <SelectItem value="delivered">Em Entrega</SelectItem>
                                       <SelectItem value="cancelled">Cancelado</SelectItem>
                                     </SelectContent>
                                  </Select>
                                </div>

                                <Separator />

                                {/* Informações do Cliente */}
                                <div className="space-y-2">
                                  <h3 className="font-semibold">Cliente</h3>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex items-center gap-2">
                                      <User className="h-4 w-4" />
                                      <span>{selectedOrder.customer_name || "Não informado"}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Phone className="h-4 w-4" />
                                      <span>{selectedOrder.customer_phone || "Não informado"}</span>
                                    </div>
                                    {selectedOrder.delivery_fee > 0 && selectedOrder.address && (
                                      <div className="flex items-start gap-2">
                                        <MapPin className="h-4 w-4 mt-0.5" />
                                        <span>{selectedOrder.address}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <Separator />

                                {/* Itens do Pedido */}
                                <div className="space-y-2">
                                  <h3 className="font-semibold">Itens</h3>
                                  <div className="space-y-2">
                                    {selectedOrder.items?.map((item: any, index: number) => {
                                      const productName = item.productName || 
                                                        item.product_name || 
                                                        item.name || 
                                                        item.product?.name || 
                                                        `Produto #${index + 1}`;
                                      
                                      return (
                                        <div key={index} className="border rounded p-3 space-y-2">
                                          <div className="font-medium">{productName}</div>
                                          <div className="flex justify-between text-sm">
                                            <span>Quantidade: {item.quantity || 1}</span>
                                            <span>R$ {Number((item.unitPrice || item.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
                                          </div>
                                          
                                          {item.addons && item.addons.length > 0 && (
                                            <div className="space-y-1">
                                              <div className="text-sm font-medium">Adicionais:</div>
                                              {item.addons.map((addon: any, addonIndex: number) => (
                                                <div key={addonIndex} className="flex justify-between text-xs text-muted-foreground">
                                                  <span>• {addon.option?.name || addon.name}</span>
                                                  <span>+R$ {Number(addon.option?.price || addon.price || 0).toFixed(2)}</span>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                          
                                          {item.observations && (
                                            <div className="text-xs text-muted-foreground">
                                              <strong>Obs:</strong> {item.observations}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                <Separator />

                                {/* Totais */}
                                <div className="space-y-2">
                                  <h3 className="font-semibold">Resumo</h3>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span>Subtotal:</span>
                                      <span>R$ {Number(selectedOrder.subtotal).toFixed(2)}</span>
                                    </div>
                                    {selectedOrder.delivery_fee > 0 && (
                                      <div className="flex justify-between">
                                        <span>Taxa de entrega:</span>
                                        <span>R$ {Number(selectedOrder.delivery_fee).toFixed(2)}</span>
                                      </div>
                                    )}
                                    <Separator />
                                    <div className="flex justify-between font-semibold">
                                      <span>Total:</span>
                                      <span>R$ {Number(selectedOrder.total).toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>

                                {selectedOrder.payment_method && (
                                  <>
                                    <Separator />
                                    <div className="space-y-2">
                                      <h3 className="font-semibold">Pagamento</h3>
                                      <div className="flex items-center gap-2">
                                        <CreditCard className="h-4 w-4" />
                                        <span>{selectedOrder.payment_method}</span>
                                      </div>
                                    </div>
                                  </>
                                )}

                                 <div className="pt-4 space-y-2">
                                   <Button 
                                     onClick={() => handlePrintReceipt(selectedOrder)} 
                                     className="w-full"
                                     variant="outline"
                                   >
                                     <Printer className="h-4 w-4 mr-2" />
                                     Imprimir Cupom
                                   </Button>
                                   
                                   {selectedOrder.status === 'delivered' && (
                                     <Button 
                                       onClick={() => confirmDelivery(selectedOrder.id)} 
                                       className="w-full"
                                       variant="default"
                                     >
                                       <CheckCircle className="h-4 w-4 mr-2" />
                                       Confirmar Entrega
                                     </Button>
                                   )}
                                 </div>
                              </div>
                            )}
                          </SheetContent>
                        </Sheet>
                        
                         {order.status === 'delivered' ? (
                           <Button 
                             size="sm" 
                             variant="default"
                             onClick={() => confirmDelivery(order.id)}
                             className="text-xs"
                           >
                             <CheckCircle className="h-3 w-3" />
                           </Button>
                         ) : (
                           <Button 
                             size="sm" 
                             variant="outline"
                             onClick={() => handlePrintReceipt(order)}
                           >
                             <Printer className="h-3 w-3" />
                           </Button>
                         )}
                       </div>
                    </CardContent>
                  </Card>
                ))}
                
                {columnOrders.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum pedido</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}