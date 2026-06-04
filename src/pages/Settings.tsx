import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { 
  SidebarProvider, 
  SidebarTrigger,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ChefHat, 
  List, 
  Plus, 
  CreditCard, 
  Settings as SettingsIcon, 
  MapPin,
  BarChart3,
  ShoppingCart,
  Send,
  MessageCircle,
  LogOut,
  ArrowRight,
  ArrowLeft,
  Package,
  Store,
  ChevronDown,
  Clock
} from "lucide-react";
import { CategoryManager } from "@/components/dashboard/CategoryManager";
import { ProductManager } from "@/components/dashboard/ProductManager";
import { AddonManager } from "@/components/dashboard/AddonManager";
import { PaymentMethodsManager } from "@/components/dashboard/PaymentMethodsManager";
import { RestaurantSettings } from "@/components/dashboard/RestaurantSettings";
import { DeliveryZoneManager } from "@/components/dashboard/DeliveryZoneManager";
import { OperatingHoursManager } from "@/components/dashboard/OperatingHoursManager";
import { BankAccountManager } from "@/components/dashboard/BankAccountManager";
import { Landmark } from "lucide-react";

interface MenuItem {
  title: string;
  value: string;
  icon: any;
  accent?: boolean;
  subItems?: { title: string; value: string; icon: any }[];
}

const menuItems: MenuItem[] = [
  { title: "Dashboard", value: "dashboard", icon: BarChart3 },
  { title: "Pedidos", value: "orders", icon: ShoppingCart },
  { 
    title: "Cardápio", 
    value: "cardapio", 
    icon: ChefHat,
    subItems: [
      { title: "Produtos", value: "products", icon: Package },
      { title: "Categorias", value: "categories", icon: List },
      { title: "Adicionais", value: "addons", icon: Plus },
    ]
  },
  { title: "Robô de WhatsApp", value: "whatsapp-robot", icon: MessageCircle, accent: true },
  { title: "Marketing", value: "marketing", icon: Send, accent: true },
  { 
    title: "Configurações", 
    value: "configuracoes", 
    icon: SettingsIcon,
    subItems: [
      { title: "Horário de funcionamento", value: "hours", icon: Clock },
      { title: "Áreas de entrega", value: "delivery", icon: MapPin },
      { title: "Formas de pagamento", value: "payment", icon: CreditCard },
      { title: "Conta bancária", value: "bank", icon: Landmark },
      { title: "Perfil do restaurante", value: "profile", icon: Store },
    ]
  },
];

const settingsCards = [
  { 
    title: "Produtos", 
    description: "Gerencie produtos e preços",
    icon: Package, 
    value: "products",
    color: "primary"
  },
  { 
    title: "Categorias", 
    description: "Organize seu cardápio",
    icon: List, 
    value: "categories",
    color: "secondary"
  },
  { 
    title: "Adicionais", 
    description: "Configure complementos",
    icon: Plus, 
    value: "addons",
    color: "accent"
  },
  { 
    title: "Áreas de Entrega", 
    description: "Defina zonas e taxas",
    icon: MapPin, 
    value: "delivery",
    color: "whatsapp"
  },
  { 
    title: "Horário de Funcionamento", 
    description: "Configure dias e horários",
    icon: Clock, 
    value: "hours",
    color: "accent"
  },
  { 
    title: "Formas de Pagamento", 
    description: "Configure métodos de pagamento",
    icon: CreditCard, 
    value: "payment",
    color: "primary"
  },
  {
    title: "Conta bancária",
    description: "Cadastro para receber pagamentos",
    icon: Landmark,
    value: "bank",
    color: "primary"
  },
  { 
    title: "Perfil do Restaurante", 
    description: "Ajustes gerais do restaurante",
    icon: Store, 
    value: "profile",
    color: "secondary"
  },
];

export default function Settings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, restaurant, loading, updateRestaurant, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<string | null>(searchParams.get('tab'));

  const handleLogout = async () => {
    await logout();
    navigate("/criar-conta");
  };

  const handleWhatsAppClick = () => {
    const message = encodeURIComponent("quero o robo de WhatsApp");
    const whatsappUrl = `https://wa.me/5511916651776?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/criar-conta");
    }
  }, [loading, user]);

  const handleRestaurantUpdate = (updatedRestaurant: any) => {
    updateRestaurant(updatedRestaurant);
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      primary: { bg: "bg-primary/10", text: "text-primary", border: "hover:border-primary/50" },
      secondary: { bg: "bg-secondary/10", text: "text-secondary", border: "hover:border-secondary/50" },
      accent: { bg: "bg-accent/10", text: "text-accent-foreground", border: "hover:border-accent/50" },
      whatsapp: { bg: "bg-whatsapp/10", text: "text-whatsapp", border: "hover:border-whatsapp/50" }
    };
    return colors[color] || colors.primary;
  };

  if (loading || !restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "products":
        return <ProductManager restaurant={restaurant} />;
      case "categories":
        return <CategoryManager restaurant={restaurant} />;
      case "addons":
        return <AddonManager restaurant={restaurant} />;
      case "delivery":
        return <DeliveryZoneManager restaurant={restaurant} />;
      case "hours":
        return <OperatingHoursManager restaurant={restaurant} />;
      case "payment":
        return <PaymentMethodsManager restaurant={restaurant} />;
      case "bank":
        return <BankAccountManager restaurant={restaurant} />;
      case "profile":
        return <RestaurantSettings restaurant={restaurant} onUpdate={handleRestaurantUpdate} />;
      default:
        return null;
    }
  };

  const getPageTitle = () => {
    const card = settingsCards.find(c => c.value === activeTab);
    return card?.title || "Configurações";
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/30">
        <SettingsSidebar 
          activeTab={activeTab}
          onLogout={handleLogout}
          onWhatsAppClick={handleWhatsAppClick}
        />
        
        <main className="flex-1 flex flex-col min-h-screen">
          {/* Header */}
          <header className="sticky top-0 z-40 h-16 bg-background/80 backdrop-blur-lg border-b border-border/50 flex items-center px-4 md:px-6">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="lg:hidden" />
              {activeTab && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setActiveTab(null);
                    navigate('/admin/settings');
                  }}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Voltar</span>
                </Button>
              )}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <SettingsIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-base font-semibold text-foreground">{getPageTitle()}</h1>
                  <p className="text-xs text-muted-foreground">{restaurant?.name}</p>
                </div>
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="flex-1 p-4 md:p-6">
            {activeTab ? (
              <div className="animate-fade-in-up">
                {renderContent()}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {settingsCards.map((card) => {
                  const colors = getColorClasses(card.color);
                  return (
                    <Card 
                      key={card.value}
                      className={`group cursor-pointer border-border/50 bg-card hover:shadow-lg transition-all duration-300 ${colors.border}`}
                      onClick={() => {
                        setActiveTab(card.value);
                        navigate(`/admin/settings?tab=${card.value}`);
                      }}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-3">
                            <div className={`h-12 w-12 rounded-xl ${colors.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                              <card.icon className={`h-6 w-6 ${colors.text}`} />
                            </div>
                            <div>
                              <CardTitle className="text-lg text-foreground group-hover:text-primary transition-colors">
                                {card.title}
                              </CardTitle>
                              <CardDescription className="mt-1">
                                {card.description}
                              </CardDescription>
                            </div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

function SettingsSidebar({ 
  activeTab,
  onLogout,
  onWhatsAppClick 
}: {
  activeTab: string | null;
  onLogout: () => void;
  onWhatsAppClick: () => void;
}) {
  const { state } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState<string[]>(['configuracoes']);

  const toggleMenu = (value: string) => {
    setOpenMenus(prev => 
      prev.includes(value) 
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const currentTab = activeTab || new URLSearchParams(location.search).get("tab");

  useEffect(() => {
    if (["products", "categories", "addons"].includes(currentTab || "")) {
      setOpenMenus((prev) => (prev.includes("cardapio") ? prev : [...prev, "cardapio"]));
    }

    if (["delivery", "hours", "payment", "bank", "profile"].includes(currentTab || "")) {
      setOpenMenus((prev) => (prev.includes("configuracoes") ? prev : [...prev, "configuracoes"]));
    }
  }, [currentTab]);

  const handleMenuClick = (item: MenuItem, subValue?: string) => {
    const value = subValue || item.value;
    
    if (value === "dashboard") {
      navigate("/admin");
    } else if (value === "orders") {
      navigate("/admin/orders");
    } else if (value === "marketing") {
      navigate("/admin");
    } else if (value === "whatsapp-robot") {
      onWhatsAppClick();
    } else if (value === "products" || value === "categories" || value === "addons" || 
               value === "delivery" || value === "hours" || value === "payment" || value === "bank" || value === "profile") {
      navigate(`/admin/settings?tab=${value}`);
    } else if (item.subItems) {
      toggleMenu(item.value);
    }
  };

  const isSubItemActive = (item: MenuItem) => {
    return item.subItems?.some(sub => currentTab === sub.value);
  };

  return (
    <Sidebar collapsible="none" className="w-20 lg:w-[220px] border-r bg-sidebar transition-all duration-300">
      <SidebarContent className="flex flex-col h-full py-4">
        {/* Logo */}
        <div className="flex items-center justify-center lg:justify-start px-4 mb-6">
          <img 
            src="/lovable-uploads/df0ab910-5641-4faf-b0dc-3743be76338e.png" 
            alt="Logo" 
            className="h-10 w-auto"
          />
        </div>
        
        <SidebarGroup className="flex-1">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 px-2">
              {menuItems.map((item) => {
                const isActive = isSubItemActive(item) || 
                  (item.value === 'configuracoes' && ['delivery', 'hours', 'payment', 'bank', 'profile'].includes(currentTab || '')) ||
                  (item.value === 'cardapio' && ['products', 'categories', 'addons'].includes(currentTab || ''));
                const isAccent = item.accent;
                const isOpen = openMenus.includes(item.value);
                const hasSubItems = item.subItems && item.subItems.length > 0;
                
                if (hasSubItems) {
                  return (
                    <Collapsible 
                      key={item.value} 
                      open={isOpen} 
                      onOpenChange={() => toggleMenu(item.value)}
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            className={`
                              flex items-center justify-center lg:justify-start gap-3 
                              h-12 w-full rounded-xl px-3 
                              transition-all duration-200
                              ${isActive 
                                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                              }
                            `}
                          >
                            <item.icon className="h-5 w-5 flex-shrink-0" />
                            <span className="hidden lg:block text-sm font-medium flex-1 text-left">{item.title}</span>
                            <ChevronDown className={`hidden lg:block h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                          <div className="mt-1 ml-4 lg:ml-6 space-y-1 border-l-2 border-sidebar-accent/50 pl-3">
                            {item.subItems?.map((subItem) => {
                              const isSubActive = currentTab === subItem.value;
                              return (
                                <SidebarMenuButton
                                  key={subItem.value}
                                  onClick={() => handleMenuClick(item, subItem.value)}
                                  className={`
                                    flex items-center justify-center lg:justify-start gap-2 
                                    h-10 w-full rounded-lg px-2
                                    transition-all duration-200
                                    ${isSubActive 
                                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm"
                                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground"
                                    }
                                  `}
                                >
                                  <subItem.icon className="h-4 w-4 flex-shrink-0" />
                                  <span className="hidden lg:block text-sm">{subItem.title}</span>
                                </SidebarMenuButton>
                              );
                            })}
                          </div>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }
                
                return (
                  <SidebarMenuItem key={item.value}>
                    <SidebarMenuButton
                      onClick={() => handleMenuClick(item)}
                      className={`
                        flex items-center justify-center lg:justify-start gap-3 
                        h-12 w-full rounded-xl px-3 
                        transition-all duration-200
                        ${isActive
                          ? isAccent
                            ? "bg-whatsapp text-white shadow-sm"
                            : "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                          : isAccent
                            ? "text-whatsapp hover:bg-whatsapp/10"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        }
                      `}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <span className="hidden lg:block text-sm font-medium">{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Logout Button */}
        <div className="px-2">
          <Button 
            variant="ghost" 
            onClick={onLogout}
            className="w-full flex items-center justify-center lg:justify-start gap-2 h-12 px-3 rounded-xl
                       text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            <span className="hidden lg:block text-sm">Sair</span>
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
