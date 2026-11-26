import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  BarChart3, ChevronDown, Clock, CreditCard, FileText, FolderOpen, House, List, MapPin,
  Megaphone, MessageCircle, Package, Plus, ReceiptText, Settings, ShoppingBag, Sparkles, Store, Users, Wallet, X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, useSidebar } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";

type Page = { title: string; value: string; icon: LucideIcon; path: string };
type Group = { title: string; value: string; icon: LucideIcon; pages: Page[] };

const items: (Page | Group)[] = [
  { title: "Visão geral", value: "dashboard", icon: House, path: "/admin" },
  { title: "Pedidos", value: "orders", icon: ShoppingBag, path: "/admin/orders" },
  { title: "Clientes", value: "customers", icon: Users, path: "/admin/clientes" },
  { title: "Catálogo", value: "catalog", icon: FolderOpen, pages: [
    { title: "Produtos", value: "products", icon: Package, path: "/admin/settings?tab=products" },
    { title: "Categorias", value: "categories", icon: List, path: "/admin/settings?tab=categories" },
    { title: "Complementos", value: "addons", icon: Plus, path: "/admin/settings?tab=addons" },
  ] },
  { title: "Marketing", value: "marketing-group", icon: Megaphone, pages: [
    { title: "Cupons e promoções", value: "marketing", icon: Megaphone, path: "/admin?section=marketing" },
    { title: "Marketing com IA", value: "ai-marketing", icon: Sparkles, path: "/admin/marketing" },
  ] },
  { title: "Financeiro", value: "finance", icon: Wallet, pages: [
    { title: "Gestão de Caixa", value: "cash", icon: ReceiptText, path: "/admin/caixa" },
    { title: "Carteira", value: "wallet", icon: Wallet, path: "/admin/carteira" },
    { title: "Relatórios", value: "reports", icon: FileText, path: "/admin/reports" },
    { title: "Métricas", value: "analytics", icon: BarChart3, path: "/admin/analytics" },
  ] },
  { title: "Loja", value: "store", icon: Store, pages: [
    { title: "Configurações", value: "settings", icon: Settings, path: "/admin/settings" },
    { title: "Dados da loja", value: "profile", icon: Store, path: "/admin/settings?tab=profile" },
    { title: "Horário de funcionamento", value: "hours", icon: Clock, path: "/admin/settings?tab=hours" },
    { title: "Áreas de entrega", value: "delivery", icon: MapPin, path: "/admin/settings?tab=delivery" },
    { title: "Formas de pagamento", value: "payment", icon: CreditCard, path: "/admin/settings?tab=payment" },
  ] },
];

const supportUrl = "https://wa.me/5511916651776?text=Preciso%20de%20suporte%20no%20painel%20do%20Clica%20e%20Pede";
const robotUrl = "https://wa.me/5511916651776?text=quero%20o%20robo%20de%20WhatsApp";

export function AppSidebar({ restaurantId }: { restaurantId?: string }) {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const { state, isMobile, setOpen, setOpenMobile } = useSidebar();
  const collapsed = !isMobile && state === "collapsed";
  const activePath = pathname === "/admin/settings" && params.has("tab")
    ? `${pathname}?tab=${params.get("tab")}`
    : pathname === "/admin" && params.get("section") === "marketing"
      ? "/admin?section=marketing" : pathname;
  const activeGroup = items.find(item => "pages" in item && item.pages.some(page => page.path === activePath))?.value;
  const [groupOverride, setGroupOverride] = useState<{ path: string; group?: string }>();
  const openGroup = groupOverride?.path === activePath ? groupOverride.group : activeGroup;
  const [orderCount, setOrderCount] = useState({ restaurantId, count: 0 });

  useEffect(() => {
    if (!restaurantId) return;
    let mounted = true;
    const fetchCount = async () => {
      const { count } = await supabase.from("orders").select("id", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId).eq("status", "new");
      if (mounted) setOrderCount({ restaurantId, count: count ?? 0 });
    };
    void fetchCount();
    const channel = supabase.channel(`orders-badge-${restaurantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurantId}` }, fetchCount)
      .subscribe();
    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  const closeMobile = () => { if (isMobile) setOpenMobile(false); };
  const newOrders = orderCount.restaurantId === restaurantId ? orderCount.count : 0;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-16 flex-row items-center justify-between border-b px-3">
        <Link to="/admin" onClick={closeMobile} aria-label="Clica e Pede, visão geral"
          className="flex min-w-0 items-center gap-2 rounded-md px-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <img src="/lovable-uploads/df0ab910-5641-4faf-b0dc-3743be76338e.png"
            alt="" className="h-7 w-7 shrink-0 object-contain" />
          {!collapsed && <span className="truncate text-sm font-bold tracking-tight">Clica e Pede</span>}
        </Link>
        {isMobile && (
          <Button variant="ghost" size="icon" aria-label="Fechar menu lateral" onClick={closeMobile}>
            <X aria-hidden="true" />
          </Button>
        )}
      </SidebarHeader>
      <SidebarContent className="pt-3">
        <SidebarGroup>
          <nav aria-label="Navegação do painel">
            <SidebarMenu>
              {items.map(item => {
                if ("pages" in item) {
                  return (
                    <Collapsible key={item.value} asChild open={!collapsed && openGroup === item.value}
                      onOpenChange={open => {
                        if (collapsed) setOpen(true);
                        setGroupOverride({ path: activePath, group: open ? item.value : undefined });
                      }}>
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton isActive={activeGroup === item.value} tooltip={item.title} aria-label={item.title} className="h-10">
                            <item.icon aria-hidden="true" />
                            {!collapsed && <><span className="flex-1">{item.title}</span><ChevronDown aria-hidden="true" className={openGroup === item.value ? "rotate-180" : ""} /></>}
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.pages.map(page => (
                              <SidebarMenuSubItem key={page.value}>
                                <SidebarMenuSubButton asChild isActive={activePath === page.path} className="min-h-9">
                                  <Link to={page.path} onClick={closeMobile} aria-current={activePath === page.path ? "page" : undefined}>
                                    <page.icon aria-hidden="true" /><span>{page.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }
                const count = item.value === "orders" && newOrders > 0 ? newOrders : null;
                return (
                  <SidebarMenuItem key={item.value}>
                    <SidebarMenuButton asChild isActive={activePath === item.path} tooltip={item.title} className="relative h-10">
                      <Link to={item.path} onClick={closeMobile} aria-current={activePath === item.path ? "page" : undefined}
                        aria-label={count ? `${item.title}, ${count} novos` : item.title}>
                        <item.icon aria-hidden="true" />
                        {!collapsed && <span className="flex-1">{item.title}</span>}
                        {count && <span aria-hidden="true" className={collapsed ? "absolute right-1 top-1 size-2 rounded-full bg-primary" : "rounded-md bg-primary/10 px-1.5 text-xs font-semibold text-primary"}>{!collapsed && count}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </nav>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t">
        <SidebarMenu>
          {[
            { title: "Robô de WhatsApp", icon: Sparkles, url: robotUrl },
            { title: "Suporte no WhatsApp", icon: MessageCircle, url: supportUrl },
          ].map(action => (
            <SidebarMenuItem key={action.title}>
              <SidebarMenuButton asChild tooltip={action.title}>
                <a href={action.url} aria-label={action.title} target="_blank" rel="noopener noreferrer">
                  <action.icon aria-hidden="true" />{!collapsed && <span>{action.title}</span>}
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
