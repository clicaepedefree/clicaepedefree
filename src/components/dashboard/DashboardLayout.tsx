import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  SidebarProvider, 
  SidebarTrigger, 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem,
  useSidebar 
} from "@/components/ui/sidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { 
  Store, 
  Menu as MenuIcon, 
  Plus, 
  Settings, 
  LogOut, 
  Link as LinkIcon,
  Package,
  MapPin,
  BarChart3,
  MessageCircle,
  Send,
  CreditCard,
  ShoppingCart,
  Home,
  List,
  ChefHat
} from "lucide-react";
import { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { CategoryManager } from "./CategoryManager";
import { ProductManager } from "./ProductManager";
import { AddonManager } from "./AddonManager";
import { RestaurantSettings } from "./RestaurantSettings";
import { DeliveryZoneManager } from "./DeliveryZoneManager";
import { PaymentMethodsManager } from "./PaymentMethodsManager";
import { SalesDashboard } from "./SalesDashboard";
import { CTABanner } from "./CTABanner";
import { RestaurantControls } from "./RestaurantControls";
import { OrdersKanban } from "../orders/OrdersKanban";
import { OnboardingHelpDialog } from "./OnboardingHelpDialog";


interface DashboardLayoutProps {
  restaurant: any;
  user: User;
  onLogout: () => void;
  onRestaurantUpdate: (restaurant: any) => void;
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

const menuItems = [
  { title: "Financeiro", value: "dashboard", icon: BarChart3 },
  { title: "Pedidos", value: "orders", icon: ShoppingCart },
  { title: "Entrega", value: "delivery", icon: MapPin },
  { title: "Marketing", value: "marketing", icon: Send, isGreen: true },
  { title: "Ajustes", value: "settings", icon: Settings },
];

export function DashboardLayout({ 
  restaurant, 
  user, 
  onLogout, 
  onRestaurantUpdate, 
  activeSection: propActiveSection,
  onSectionChange: propOnSectionChange 
}: DashboardLayoutProps) {
  const [activeSection, setActiveSection] = useState(propActiveSection || "dashboard");
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const { toast } = useToast();

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    propOnSectionChange?.(section);
  };

  const copyLink = () => {
    const link = `${window.location.origin}/cardapio/${restaurant.slug}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copiado!",
      description: "O link do seu cardápio foi copiado para a área de transferência.",
    });
  };

  const openLink = () => {
    const link = `${window.location.origin}/cardapio/${restaurant.slug}`;
    window.open(link, '_blank');
  };

  const handleWhatsAppClick = () => {
    const message = encodeURIComponent("quero o robo de WhatsApp");
    const whatsappUrl = `https://wa.me/5511916924490?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <OnboardingHelpDialog restaurantId={restaurant.id} />
        <AppSidebar
          activeSection={propActiveSection || activeSection}
          onSectionChange={handleSectionChange}
          restaurant={restaurant}
          onLogout={onLogout}
          onWhatsAppClick={() => setShowWhatsAppModal(true)}
        />
        
        <main className="flex-1 bg-background">
          <header className="h-16 border-b bg-background flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div className="flex items-center gap-3">
                <img src="/lovable-uploads/df0ab910-5641-4faf-b0dc-3743be76338e.png" alt="Cardápio Grátis Logo" className="h-8" />
                <h1 className="text-xl font-semibold text-foreground">{restaurant.name}</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="default" size="sm" onClick={copyLink} className="bg-blue-600 hover:bg-blue-700 text-white">
                <LinkIcon className="h-4 w-4 mr-2" />
                Copiar Link
              </Button>
              <Button variant="outline" size="sm" onClick={openLink}>
                Ver Cardápio
              </Button>
            </div>
          </header>

          <div className="p-6">
            <CTABanner />
            
            {/* Restaurant Controls */}
            {activeSection === "dashboard" && (
              <RestaurantControls 
                restaurant={restaurant}
                onRestaurantUpdate={onRestaurantUpdate}
              />
            )}
            
            {/* Mini Banner Tutorial */}
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  variant="default"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  asChild
                >
                  <a 
                    href="https://www.youtube.com/watch?v=XHJScS_YEMo" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    📺 Veja como configurar o sistema
                  </a>
                </Button>
                
                <Button 
                  variant="outline"
                  className="border-green-600 text-green-600 hover:bg-green-50"
                  asChild
                >
                  <a 
                    href="https://wa.me/5511916924490?text=Preciso%20de%20ajuda%20no%20cardápio%20grátis" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    💬 Preciso de ajuda
                  </a>
                </Button>
              </div>
            </div>
            
            {activeSection === "dashboard" && <SalesDashboard restaurant={restaurant} />}
            {activeSection === "orders" && <OrdersKanban restaurant={restaurant} />}
            {activeSection === "delivery" && <DeliveryZoneManager restaurant={restaurant} />}
            {activeSection === "marketing" && (
              <div className="bg-card rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-6 text-foreground">Marketing</h2>
                
                <div className="space-y-6">
                  {/* Disparar Mensagens */}
                  <div className="border border-border rounded-lg p-6">
                    <h3 className="text-xl font-semibold mb-4 text-foreground">Disparar Mensagens</h3>
                    <p className="text-muted-foreground mb-4">
                      Para liberar esta funcionalidade, entre em contato conosco.
                    </p>
                    <Button 
                      onClick={() => {
                        const message = "Quero liberar a função de disparar mensagens";
                        const whatsappUrl = `https://wa.me/5511916924490?text=${encodeURIComponent(message)}`;
                        window.open(whatsappUrl, '_blank');
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Solicitar Liberação
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
        
        <Dialog open={showWhatsAppModal} onOpenChange={setShowWhatsAppModal}>
          <DialogContent className="max-w-4xl p-0">
            <div className="grid grid-cols-1 md:grid-cols-2 min-h-[400px]">
              {/* Left Content */}
              <div className="p-8 flex flex-col justify-center">
                <DialogHeader className="mb-6">
                  <DialogTitle className="text-2xl font-bold text-gray-900">
                    Robô de WhatsApp da Clica e Pede
                  </DialogTitle>
                </DialogHeader>
                
                <p className="text-gray-700 mb-6 leading-relaxed">
                  Uma ferramenta poderosa para vender e responder automaticamente aos seus clientes. 
                  Use facilmente, sem necessidade de conhecimentos de programação!
                </p>
                
                <ul className="space-y-3 mb-8 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">•</span>
                    Mensagens automáticas totalmente editáveis.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">•</span>
                    Respostas instantâneas e inteligentes impulsionadas por IA.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">•</span>
                    Informações chave do seu negócio 24/7 para seus clientes.
                  </li>
                </ul>
                
                <Button 
                  onClick={handleWhatsAppClick}
                  className="bg-green-600 hover:bg-green-700 text-white text-lg py-6 px-8 rounded-lg font-semibold"
                >
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Conectar Robô de WhatsApp
                </Button>
              </div>
              
              {/* Right Banner */}
              <div className="bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
                <img 
                  src="/lovable-uploads/71f177cc-fd8b-47d3-a73c-fadf7e48e36d.png" 
                  alt="WhatsApp Robot Banner" 
                  className="max-w-full max-h-full object-contain"
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

  const handleMenuClick = (item: any) => {
    if (item.value === "orders") {
      navigate("/admin/orders");
    } else if (item.value === "settings") {
      navigate("/admin/settings");
    } else {
      onSectionChange(item.value);
    }
  };

  return (
    <Sidebar collapsible="none" className="w-[100px] border-r">
      <SidebarContent className="p-2">
        {/* Logo */}
        <div className="flex items-center justify-center py-4 mb-2">
          <img 
            src="/lovable-uploads/df0ab910-5641-4faf-b0dc-3743be76338e.png" 
            alt="Logo" 
            className="h-10 w-auto"
          />
        </div>
        
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.value}>
                  <SidebarMenuButton
                    onClick={() => handleMenuClick(item)}
                    className={`flex flex-col items-center justify-center h-16 w-full rounded-lg gap-1 p-2 ${
                      item.isGreen
                        ? activeSection === item.value
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "text-green-600 hover:bg-green-50 hover:text-green-700"
                        : activeSection === item.value
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent/50"
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-xs font-medium">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* WhatsApp Robot Button */}
        <div className="px-2 pb-4">
          <Button 
            onClick={onWhatsAppClick}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-2 rounded-lg flex flex-col items-center justify-center gap-0.5 h-16"
          >
            <MessageCircle className="h-5 w-5" />
            <span className="text-xs leading-tight text-center">Robô de<br />WhatsApp</span>
          </Button>
        </div>

        <div className="mt-auto p-2">
          <Button 
            variant="ghost" 
            onClick={onLogout}
            className="w-full flex flex-col items-center justify-center gap-1 h-16 rounded-lg"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-xs">Sair</span>
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}