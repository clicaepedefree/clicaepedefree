import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  SidebarProvider, 
  SidebarTrigger, 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem,
  useSidebar 
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { 
  BarChart3,
  MessageCircle,
  Send,
  ShoppingCart,
  Settings,
  LogOut,
  Link as LinkIcon,
  ExternalLink,
  ChefHat,
  Sparkles,
  ChevronDown,
  Package,
  List,
  Plus,
  MapPin,
  CreditCard,
  Store,
  Clock,
  Copy,
  CheckCheck,
  FileText
} from "lucide-react";
import { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { SalesDashboard } from "./SalesDashboard";
import { CTABanner } from "./CTABanner";
import { RestaurantControls } from "./RestaurantControls";
import { OrdersKanban } from "../orders/OrdersKanban";
import { OnboardingHelpDialog } from "./OnboardingHelpDialog";
import { UpsellPopup } from "./UpsellPopup";
import { FloatingWhatsAppButton } from "./FloatingWhatsAppButton";
import { CouponManager } from "./CouponManager";

interface DashboardLayoutProps {
  restaurant: any;
  user: User;
  onLogout: () => void;
  onRestaurantUpdate: (restaurant: any) => void;
  activeSection?: string;
  onSectionChange?: (section: string) => void;
  isSuperAdminMode?: boolean;
}

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
  { title: "Relatórios", value: "reports", icon: FileText },
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
    icon: Settings,
    subItems: [
      { title: "Horário de funcionamento", value: "hours", icon: Clock },
      { title: "Áreas de entrega", value: "delivery", icon: MapPin },
      { title: "Formas de pagamento", value: "payment", icon: CreditCard },
      { title: "Perfil do restaurante", value: "profile", icon: Store },
    ]
  },
];

export function DashboardLayout({ 
  restaurant, 
  user, 
  onLogout, 
  onRestaurantUpdate, 
  activeSection: propActiveSection,
  onSectionChange: propOnSectionChange,
  isSuperAdminMode = false
}: DashboardLayoutProps) {
  const [activeSection, setActiveSection] = useState(propActiveSection || "dashboard");
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const { toast } = useToast();

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    propOnSectionChange?.(section);
  };

  const copyLink = () => {
    const link = `${window.location.origin}/cardapio/${restaurant.slug}`;
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    toast({
      title: "Link copiado!",
      description: "O link do seu cardápio foi copiado para a área de transferência.",
    });
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const openLink = () => {
    const link = `${window.location.origin}/cardapio/${restaurant.slug}`;
    window.open(link, '_blank');
  };

  const handleWhatsAppClick = () => {
    const message = encodeURIComponent("quero o robo de WhatsApp");
    const whatsappUrl = `https://wa.me/5511916651776?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/20">
        <OnboardingHelpDialog restaurantId={restaurant.id} />
        <UpsellPopup />
        <FloatingWhatsAppButton />
        
        <AppSidebar
          activeSection={propActiveSection || activeSection}
          onSectionChange={handleSectionChange}
          restaurant={restaurant}
          onLogout={onLogout}
          onWhatsAppClick={() => setShowWhatsAppModal(true)}
        />
        
        <main className="flex-1 flex flex-col min-h-screen">
          {/* Header — compact and functional */}
          <header className="sticky top-0 z-40 h-14 lg:h-16 bg-background/95 backdrop-blur-md border-b border-border/40 flex items-center justify-between px-4 lg:px-8">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="lg:hidden" />
              <div className="flex items-center gap-3">
                {restaurant.logo_url ? (
                  <img 
                    src={restaurant.logo_url} 
                    alt={restaurant.name}
                    className="h-8 w-8 rounded-lg object-cover ring-2 ring-border"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                    <span className="text-sm font-bold text-primary-foreground">
                      {restaurant.name?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="hidden sm:block">
                  <h1 className="text-sm lg:text-base font-semibold text-foreground leading-tight">{restaurant.name}</h1>
                  <p className="text-xs text-muted-foreground">Painel de Gestão</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={copyLink}
                className="hidden sm:inline-flex gap-2 h-9 border-border hover:bg-muted transition-all text-xs lg:text-sm"
              >
                {linkCopied ? (
                  <CheckCheck className="h-3.5 w-3.5 text-whatsapp" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span>{linkCopied ? "Copiado!" : "Copiar Link"}</span>
              </Button>
              <Button 
                size="sm" 
                onClick={openLink}
                className="gap-2 h-9 bg-primary hover:bg-primary/90 text-xs lg:text-sm"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Ver Cardápio</span>
              </Button>
            </div>
          </header>

          {/* Main Content — generous padding for desktop */}
          <div className="flex-1 p-4 lg:p-8 xl:p-10 space-y-5 lg:space-y-6 overflow-auto">
            {/* Quick Help — inline, non-intrusive */}
            <div className="flex flex-wrap items-center gap-2">
              <Button 
                variant="outline"
                size="sm"
                className="h-8 bg-background hover:bg-muted border-border text-xs"
                asChild
              >
                <a 
                  href="https://www.youtube.com/watch?v=XHJScS_YEMo" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5"
                >
                  <span className="text-base">📺</span>
                  <span>Como configurar</span>
                </a>
              </Button>
              
              <Button 
                variant="outline"
                size="sm"
                className="h-8 bg-background hover:bg-whatsapp/5 border-whatsapp/30 text-whatsapp hover:text-whatsapp text-xs"
                asChild
              >
                <a 
                  href="https://wa.me/5511916651776?text=Preciso%20de%20ajuda%20no%20cardápio%20grátis" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>Preciso de ajuda</span>
                </a>
              </Button>
            </div>

            <CTABanner />
            
            {/* Dashboard Section */}
            {activeSection === "dashboard" && (
              <div className="space-y-5 lg:space-y-6 animate-fade-in-up">
                <RestaurantControls 
                  restaurant={restaurant}
                  onRestaurantUpdate={onRestaurantUpdate}
                />
                <SalesDashboard restaurant={restaurant} />
              </div>
            )}
            
            {/* Orders Section */}
            {activeSection === "orders" && (
              <div className="animate-fade-in-up">
                <OrdersKanban restaurant={restaurant} />
              </div>
            )}
            
            {/* Marketing Section */}
            {activeSection === "marketing" && (
              <div className="animate-fade-in-up">
                <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
                  <div className="p-5 lg:p-6 border-b border-border/50 bg-gradient-to-r from-whatsapp/5 to-transparent">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-whatsapp/10 flex items-center justify-center">
                        <Send className="h-5 w-5 text-whatsapp" />
                      </div>
                      <div>
                        <h2 className="text-lg lg:text-xl font-semibold text-foreground">Marketing</h2>
                        <p className="text-sm text-muted-foreground">Alcance mais clientes</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-5 lg:p-6">
                    <CouponManager restaurantId={restaurant.id} />

                    <div className="bg-muted/30 rounded-xl p-5 lg:p-6 border border-border/50 mt-6">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-whatsapp/20 to-whatsapp/5 flex items-center justify-center flex-shrink-0">
                          <Sparkles className="h-6 w-6 text-whatsapp" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-base lg:text-lg font-semibold text-foreground mb-2">Próximas funções de marketing</h3>
                          <p className="text-muted-foreground text-sm leading-relaxed">
                            Em breve você poderá disparar campanhas e mensagens para clientes direto pelo painel.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
        
        {/* WhatsApp Robot Modal */}
        <Dialog open={showWhatsAppModal} onOpenChange={setShowWhatsAppModal}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 min-h-[450px]">
              <div className="p-8 flex flex-col justify-center">
                <DialogHeader className="mb-6">
                  <DialogTitle className="text-2xl font-bold text-foreground">
                    Robô de WhatsApp
                  </DialogTitle>
                </DialogHeader>
                
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Uma ferramenta poderosa para vender e responder automaticamente aos seus clientes. 
                  Use facilmente, sem necessidade de conhecimentos de programação!
                </p>
                
                <ul className="space-y-3 mb-8">
                  {[
                    "Mensagens automáticas totalmente editáveis",
                    "Respostas instantâneas e inteligentes com IA",
                    "Atendimento 24/7 para seus clientes"
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-foreground">
                      <span className="h-2 w-2 rounded-full bg-whatsapp" />
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <Button 
                  onClick={handleWhatsAppClick}
                  className="bg-whatsapp hover:bg-whatsapp/90 text-white text-lg py-6 px-8 rounded-xl font-semibold shadow-lg"
                >
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Conectar Robô de WhatsApp
                </Button>
              </div>
              
              <div className="bg-gradient-to-br from-primary/5 to-whatsapp/5 flex items-center justify-center p-6 hidden md:flex">
                <img 
                  src="/lovable-uploads/71f177cc-fd8b-47d3-a73c-fadf7e48e36d.png" 
                  alt="WhatsApp Robot Banner" 
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarProvider>
  );
}

function AppSidebar({ 
  activeSection, 
  onSectionChange, 
  restaurant, 
  onLogout,
  onWhatsAppClick 
}: {
  activeSection: string;
  onSectionChange: (section: string) => void;
  restaurant: any;
  onLogout: () => void;
  onWhatsAppClick: () => void;
}) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const [openMenus, setOpenMenus] = useState<string[]>([]);

  const toggleMenu = (value: string) => {
    setOpenMenus(prev => 
      prev.includes(value) 
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const handleMenuClick = (item: MenuItem, subValue?: string) => {
    const value = subValue || item.value;
    
    if (value === "orders") {
      navigate("/admin/orders");
    } else if (value === "reports") {
      navigate("/admin/reports");
    } else if (value === "whatsapp-robot") {
      onWhatsAppClick();
    } else if (value === "products" || value === "categories" || value === "addons" || 
               value === "delivery" || value === "hours" || value === "payment" || value === "profile") {
      navigate(`/admin/settings?tab=${value}`);
    } else if (item.subItems) {
      toggleMenu(item.value);
    } else {
      onSectionChange(value);
    }
  };

  const isSubItemActive = (item: MenuItem) => {
    return item.subItems?.some(sub => activeSection === sub.value);
  };

  return (
    <Sidebar collapsible="none" className="w-16 lg:w-[260px] border-r border-border/50 bg-sidebar transition-all duration-300">
      <SidebarContent className="flex flex-col h-full py-5">
        {/* Logo */}
        <div className="flex items-center justify-center lg:justify-start px-4 lg:px-5 mb-8">
          <img 
            src="/lovable-uploads/df0ab910-5641-4faf-b0dc-3743be76338e.png" 
            alt="Logo" 
            className="h-8 lg:h-10 w-auto"
          />
        </div>
        
        <SidebarGroup className="flex-1">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5 px-2 lg:px-3">
              {menuItems.map((item) => {
                const isActive = activeSection === item.value || isSubItemActive(item);
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
                              h-11 lg:h-[44px] w-full rounded-lg lg:rounded-xl px-3 
                              transition-all duration-200 cursor-pointer
                              ${isActive 
                                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                              }
                            `}
                          >
                            <item.icon className="h-[18px] w-[18px] lg:h-5 lg:w-5 flex-shrink-0" />
                            <span className="hidden lg:block text-[13px] font-medium flex-1 text-left">{item.title}</span>
                            <ChevronDown className={`hidden lg:block h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                          <div className="mt-1 lg:ml-5 space-y-0.5 lg:border-l-2 lg:border-sidebar-accent/40 lg:pl-3">
                            {item.subItems?.map((subItem) => {
                              const isSubActive = activeSection === subItem.value;
                              return (
                                <SidebarMenuButton
                                  key={subItem.value}
                                  onClick={() => handleMenuClick(item, subItem.value)}
                                  className={`
                                    flex items-center justify-center lg:justify-start gap-2.5 
                                    h-9 lg:h-10 w-full rounded-lg px-2 lg:px-3
                                    transition-all duration-200 cursor-pointer
                                    ${isSubActive 
                                      ? "bg-sidebar-primary/20 text-sidebar-primary-foreground font-medium"
                                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground"
                                    }
                                  `}
                                >
                                  <subItem.icon className="h-4 w-4 flex-shrink-0" />
                                  <span className="hidden lg:block text-[13px]">{subItem.title}</span>
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
                        h-11 lg:h-[44px] w-full rounded-lg lg:rounded-xl px-3 
                        transition-all duration-200 cursor-pointer
                        ${isActive 
                          ? isAccent
                            ? "bg-whatsapp/90 text-whatsapp-foreground shadow-sm"
                            : "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                          : isAccent
                            ? "text-whatsapp-foreground/80 hover:bg-whatsapp/10"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                        }
                      `}
                    >
                      <item.icon className="h-[18px] w-[18px] lg:h-5 lg:w-5 flex-shrink-0" />
                      <span className="hidden lg:block text-[13px] font-medium">{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Logout Button */}
        <div className="px-2 lg:px-3 pt-2 border-t border-sidebar-border/30 mt-2">
          <Button 
            variant="ghost" 
            onClick={onLogout}
            className="w-full flex items-center justify-center lg:justify-start gap-2.5 h-11 px-3 rounded-xl
                       text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/30 cursor-pointer"
          >
            <LogOut className="h-[18px] w-[18px] lg:h-5 lg:w-5 flex-shrink-0" />
            <span className="hidden lg:block text-[13px]">Sair</span>
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
