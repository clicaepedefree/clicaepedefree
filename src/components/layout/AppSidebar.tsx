import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  Home,
  Wallet as WalletIcon,
  ChefHat,
  ShoppingCart,
  FileText,
  Settings as SettingsIcon,
  Send,
  MessageCircle,
  Package,
  List,
  Plus,
  Clock,
  MapPin,
  CreditCard,
  Store,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type SubItem = { title: string; value: string; icon: any; path: string };
type Item = {
  title: string;
  value: string;
  icon: any;
  path?: string;
  accent?: boolean;
  subItems?: SubItem[];
  badgeKey?: "orders";
  action?: "whatsapp-robot";
};

// Ordem fixa – nunca muda entre páginas
const items: Item[] = [
  { title: "Início", value: "dashboard", icon: Home, path: "/admin" },
  { title: "Carteira", value: "wallet", icon: WalletIcon, path: "/admin/carteira" },
  {
    title: "Meu Cardápio",
    value: "cardapio",
    icon: ChefHat,
    subItems: [
      { title: "Meus Pratos", value: "products", icon: Package, path: "/admin/settings?tab=products" },
      { title: "Categorias", value: "categories", icon: List, path: "/admin/settings?tab=categories" },
      { title: "Complementos", value: "addons", icon: Plus, path: "/admin/settings?tab=addons" },
    ],
  },
  { title: "Pedidos", value: "orders", icon: ShoppingCart, path: "/admin/orders", badgeKey: "orders" },
  { title: "Relatórios", value: "reports", icon: FileText, path: "/admin/reports" },
  {
    title: "Ajustes da Loja",
    value: "configuracoes",
    icon: SettingsIcon,
    subItems: [
      { title: "Horário de funcionamento", value: "hours", icon: Clock, path: "/admin/settings?tab=hours" },
      { title: "Bairros que atendo", value: "delivery", icon: MapPin, path: "/admin/settings?tab=delivery" },
      { title: "Formas de pagamento", value: "payment", icon: CreditCard, path: "/admin/settings?tab=payment" },
      { title: "Dados da loja", value: "profile", icon: Store, path: "/admin/settings?tab=profile" },
    ],
  },
  { title: "Marketing", value: "marketing", icon: Send, path: "/admin?section=marketing", accent: true },
  { title: "Robô de WhatsApp", value: "whatsapp-robot", icon: MessageCircle, accent: true, action: "whatsapp-robot" },
];

export function AppSidebar({
  restaurantId,
  onLogout,
}: {
  restaurantId?: string;
  onLogout?: () => void;
}) {
  const location = useLocation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const tab = params.get("tab");
  const section = params.get("section");
  const [newOrders, setNewOrders] = useState(0);
  const [openGroups, setOpenGroups] = useState<string[]>(["cardapio", "configuracoes"]);

  const activeValue = (() => {
    const p = location.pathname;
    if (p === "/admin/orders") return "orders";
    if (p === "/admin/carteira") return "wallet";
    if (p === "/admin/reports") return "reports";
    if (p === "/admin/analytics") return "reports";
    if (p.startsWith("/admin/settings") && tab) return tab;
    if (p === "/admin") return section === "marketing" ? "marketing" : "dashboard";
    return "";
  })();

  useEffect(() => {
    for (const it of items) {
      if (it.subItems?.some((s) => s.value === activeValue)) {
        setOpenGroups((prev) => (prev.includes(it.value) ? prev : [...prev, it.value]));
      }
    }
  }, [activeValue]);

  useEffect(() => {
    if (!restaurantId) return;
    let mounted = true;
    const fetchCount = async () => {
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId)
        .eq("status", "new");
      if (mounted) setNewOrders(count || 0);
    };
    fetchCount();
    const ch = supabase
      .channel(`orders-badge-${restaurantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurantId}` },
        fetchCount
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [restaurantId]);

  const toggle = (v: string) =>
    setOpenGroups((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  const openSupport = () => {
    const msg = encodeURIComponent("Preciso de suporte no painel do Clica e Pede");
    window.open(`https://wa.me/5511916651776?text=${msg}`, "_blank");
  };
  const openRobo = () => {
    const msg = encodeURIComponent("quero o robo de WhatsApp");
    window.open(`https://wa.me/5511916651776?text=${msg}`, "_blank");
  };

  const handleClick = (it: Item) => {
    if (it.action === "whatsapp-robot") return openRobo();
    if (it.path) navigate(it.path);
    else if (it.subItems) toggle(it.value);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/40">
      <SidebarContent className="flex flex-col h-full py-3 gap-0">
        {/* Logo */}
        <div className={`px-3 mb-3 flex items-center ${collapsed ? "justify-center" : ""}`}>
          <img
            src="/lovable-uploads/df0ab910-5641-4faf-b0dc-3743be76338e.png"
            alt="Logo"
            className={`w-auto transition-all ${collapsed ? "h-7" : "h-9"}`}
          />
        </div>

        {/* Suporte WhatsApp — destaque no topo */}
        <div className="px-2 mb-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={openSupport}
                className={`group w-full flex items-center rounded-xl transition-all font-semibold text-sm shadow-md hover:shadow-lg bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90 ${
                  collapsed ? "justify-center h-11 px-0" : "justify-start gap-2 h-11 px-3"
                }`}
                aria-label="Suporte via WhatsApp"
              >
                <MessageCircle className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>Suporte no WhatsApp</span>}
              </button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">
                <p className="font-medium">Suporte no WhatsApp</p>
                <p className="text-xs text-muted-foreground">Fale com nosso time</p>
              </TooltipContent>
            )}
          </Tooltip>
        </div>

        <SidebarGroup className="flex-1 overflow-y-auto">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5 px-2">
              {items.map((it) => {
                const isActive =
                  activeValue === it.value || it.subItems?.some((s) => s.value === activeValue);
                const isOpen = openGroups.includes(it.value);
                const showBadge = it.badgeKey === "orders" && newOrders > 0;

                if (it.subItems) {
                  return (
                    <Collapsible
                      key={it.value}
                      open={!collapsed && isOpen}
                      onOpenChange={() => !collapsed && toggle(it.value)}
                    >
                      <SidebarMenuItem>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton
                                className={`h-11 rounded-xl px-3 gap-3 transition-all ${
                                  isActive
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                                }`}
                              >
                                <it.icon className="h-5 w-5 flex-shrink-0" />
                                {!collapsed && (
                                  <>
                                    <span className="flex-1 text-left text-sm font-medium">{it.title}</span>
                                    <ChevronDown
                                      className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                                    />
                                  </>
                                )}
                              </SidebarMenuButton>
                            </CollapsibleTrigger>
                          </TooltipTrigger>
                          {collapsed && (
                            <TooltipContent side="right">
                              <p className="font-medium">{it.title}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                        {!collapsed && (
                          <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                            <div className="mt-1 ml-4 space-y-0.5 border-l-2 border-sidebar-accent/40 pl-3">
                              {it.subItems.map((sub) => {
                                const subActive = activeValue === sub.value;
                                return (
                                  <SidebarMenuButton
                                    key={sub.value}
                                    onClick={() => navigate(sub.path)}
                                    className={`h-9 rounded-lg px-2 gap-2 transition-all ${
                                      subActive
                                        ? "bg-sidebar-primary/25 text-sidebar-foreground font-medium"
                                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground"
                                    }`}
                                  >
                                    <sub.icon className="h-4 w-4 flex-shrink-0" />
                                    <span className="text-[13px]">{sub.title}</span>
                                  </SidebarMenuButton>
                                );
                              })}
                            </div>
                          </CollapsibleContent>
                        )}
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }

                return (
                  <SidebarMenuItem key={it.value}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton
                          onClick={() => handleClick(it)}
                          className={`relative h-11 rounded-xl px-3 gap-3 transition-all ${
                            isActive
                              ? it.accent
                                ? "bg-whatsapp/90 text-whatsapp-foreground shadow-sm"
                                : "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                              : it.accent
                              ? "text-whatsapp hover:bg-whatsapp/10"
                              : "text-sidebar-foreground/80 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                          }`}
                        >
                          <div className="relative flex-shrink-0">
                            <it.icon className="h-5 w-5" />
                            {showBadge && (
                              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
                                {newOrders > 9 ? "9+" : newOrders}
                              </span>
                            )}
                          </div>
                          {!collapsed && (
                            <span className="text-sm font-medium flex-1 text-left">{it.title}</span>
                          )}
                          {!collapsed && showBadge && (
                            <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold flex items-center justify-center">
                              {newOrders}
                            </span>
                          )}
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      {collapsed && (
                        <TooltipContent side="right">
                          <p className="font-medium">{it.title}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {onLogout && (
          <div className="px-2 pt-2 border-t border-sidebar-border/30">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={onLogout}
                  className={`w-full h-11 rounded-xl gap-2 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30 ${
                    collapsed ? "justify-center px-0" : "justify-start px-3"
                  }`}
                >
                  <LogOut className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span className="text-sm">Sair</span>}
                </Button>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right">
                  <p>Sair da conta</p>
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
