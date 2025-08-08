import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, DollarSign, TrendingUp, Package, Eye, MapPin, Phone, User, CreditCard, Clock, Truck } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OrdersDashboardProps {
  restaurant: any;
}

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  items: any;
  subtotal: number;
  delivery_fee: number;
  total: number;
  address: string;
  payment_method: string;
  status: string;
  created_at: string;
}

interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  todayOrders: number;
}

export function OrdersDashboard({ restaurant }: OrdersDashboardProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    todayOrders: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchOrders();
  }, [restaurant.id]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter out delivered orders older than 10 minutes
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const filteredOrders = (data || []).filter(order => {
        if (order.status === 'delivered') {
          return new Date(order.created_at) >= tenMinutesAgo;
        }
        return true;
      });

      setOrders(filteredOrders);
      calculateStats(data || []); // Use all orders for stats
    } catch (error: any) {
      console.error('Erro ao buscar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (orderData: Order[]) => {
    const totalOrders = orderData.length;
    const totalRevenue = orderData.reduce((sum, order) => sum + Number(order.total), 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrders = orderData.filter(order => 
      new Date(order.created_at) >= today
    ).length;

    setStats({
      totalOrders,
      totalRevenue,
      averageOrderValue,
      todayOrders
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      new: { label: "Novo", variant: "secondary" as const },
      preparing: { label: "Em Preparo", variant: "outline" as const },
      delivered: { label: "Entregue", variant: "default" as const },
      cancelled: { label: "Cancelado", variant: "destructive" as const }
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.new;
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      
      // Refresh orders list
      fetchOrders();
    } catch (error: any) {
      console.error('Erro ao atualizar status do pedido:', error);
    }
  };

  const renderOrderDetails = (order: Order) => {
    const orderType = order.delivery_fee > 0 ? "Entrega" : "Retirada";
    
    // Debug log para ver a estrutura dos itens
    console.log("Order items structure:", order.items);
    
    return (
      <div className="space-y-4">
        {/* Status do Pedido */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Status do Pedido</h3>
          </div>
          <Select value={order.status} onValueChange={(value) => updateOrderStatus(order.id, value)}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {getStatusBadge(order.status)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">Novo</SelectItem>
              <SelectItem value="preparing">Em Preparo</SelectItem>
              <SelectItem value="delivered">Entregue</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Informações do Cliente */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Informações do Cliente</h3>
          </div>
          <div className="space-y-1 text-sm">
            <div><strong>Nome:</strong> {order.customer_name || "Não informado"}</div>
            <div className="flex items-center gap-2">
              <Phone className="h-3 w-3" />
              <span>{order.customer_phone || "Não informado"}</span>
            </div>
            {orderType === "Entrega" && order.address && (
              <div className="flex items-start gap-2">
                <MapPin className="h-3 w-3 mt-0.5" />
                <span>{order.address}</span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Tipo do Pedido */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Tipo do Pedido</h3>
          </div>
          <Badge variant={orderType === "Entrega" ? "default" : "secondary"} className="text-sm">
            {orderType}
          </Badge>
        </div>

        <Separator />

        {/* Itens do Pedido */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Itens do Pedido ({order.items?.length || 0} {(order.items?.length || 0) === 1 ? 'item' : 'itens'})</h3>
          </div>
          <div className="space-y-2">
            {order.items && order.items.length > 0 ? (
              order.items.map((item: any, index: number) => {
                // Debug log para cada item
                console.log(`Item ${index}:`, item);
                
                // Acessar o nome do produto corretamente
                const productName = item.productName || 
                                  item.product_name || 
                                  item.name || 
                                  item.product?.name || 
                                  `Produto #${index + 1}`;
                
                return (
                  <div key={index} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                    <div className="space-y-2">
                      {/* Nome do Produto - Destaque principal */}
                      <div className="font-semibold text-base text-foreground">
                        {productName}
                      </div>
                      
                      {/* Quantidade e Preço */}
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-muted-foreground">
                          <strong>Quantidade:</strong> {item.quantity || 1}
                        </div>
                        <div className="font-medium">
                          R$ {Number((item.unitPrice || item.price || 0) * (item.quantity || 1)).toFixed(2)}
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        Preço unitário: R$ {Number(item.unitPrice || item.price || 0).toFixed(2)}
                      </div>
                      
                      {/* Adicionais */}
                      {item.addons && item.addons.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-muted-foreground">Adicionais:</div>
                          <div className="bg-background rounded border p-2 space-y-1">
                            {item.addons.map((addon: any, addonIndex: number) => (
                              <div key={addonIndex} className="flex justify-between items-center text-xs">
                                <span>• {addon.name}</span>
                                <span className="font-medium">+R$ {Number(addon.price || 0).toFixed(2)}</span>
                              </div>
                            ))}
                            <div className="border-t pt-1 mt-1">
                              <div className="flex justify-between text-xs font-medium">
                                <span>Total adicionais:</span>
                                <span>+R$ {Number(item.addons.reduce((sum: number, addon: any) => sum + (Number(addon.price || 0) * (item.quantity || 1)), 0)).toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Observações */}
                      {item.observations && (
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-muted-foreground">Observações:</div>
                          <div className="text-xs bg-yellow-50 border border-yellow-200 rounded p-2">
                            {item.observations}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum item encontrado no pedido</p>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Forma de Pagamento */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Forma de Pagamento</h3>
          </div>
          <div className="text-sm bg-muted/50 rounded p-2">
            {order.payment_method || "Não informado"}
          </div>
        </div>

        <Separator />

        {/* Resumo Financeiro */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Resumo Financeiro</h3>
          </div>
          <div className="space-y-2 bg-muted/30 rounded-lg p-3">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>R$ {Number(order.subtotal || 0).toFixed(2)}</span>
            </div>
            {Number(order.delivery_fee || 0) > 0 && (
              <div className="flex justify-between text-sm">
                <span>Taxa de entrega:</span>
                <span>R$ {Number(order.delivery_fee).toFixed(2)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-semibold text-base">
              <span>Total:</span>
              <span>R$ {Number(order.total || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Data do Pedido */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Data do Pedido</h3>
          </div>
          <div className="text-sm bg-muted/50 rounded p-2">
            {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-muted rounded w-20 animate-pulse"></div>
                <div className="h-4 w-4 bg-muted rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-24 animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard de Pedidos</h2>
        <p className="text-muted-foreground">
          Acompanhe os pedidos e o faturamento do seu restaurante
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {stats.averageOrderValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Hoje</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayOrders}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pedidos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum pedido encontrado</p>
              <p className="text-sm">Os pedidos aparecerão aqui quando os clientes fizerem pedidos através do seu cardápio</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.slice(0, 10).map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.customer_name || "Cliente"}</div>
                        <div className="text-sm text-muted-foreground">{order.customer_phone}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
                      </div>
                    </TableCell>
                    <TableCell>
                      R$ {Number(order.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Select value={order.status} onValueChange={(value) => updateOrderStatus(order.id, value)}>
                        <SelectTrigger className="w-32">
                          <SelectValue>
                            {getStatusBadge(order.status)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">Novo</SelectItem>
                          <SelectItem value="preparing">Em Preparo</SelectItem>
                          <SelectItem value="delivered">Entregue</SelectItem>
                          <SelectItem value="cancelled">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver Pedido
                          </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-[500px] sm:w-[600px] overflow-y-auto">
                          <SheetHeader>
                            <SheetTitle>Detalhes do Pedido #{order.id.slice(-8)}</SheetTitle>
                          </SheetHeader>
                          <div className="mt-6">
                            {selectedOrder && renderOrderDetails(selectedOrder)}
                          </div>
                        </SheetContent>
                      </Sheet>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
