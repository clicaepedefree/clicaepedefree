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
import { NavLink, useLocation } from "react-router-dom";
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


interface DashboardLayoutProps {
  restaurant: any;
  user: User;
  onLogout: () => void;
  onRestaurantUpdate: (restaurant: any) => void;
}

const menuItems = [
  { title: "Dashboard", value: "dashboard", icon: Home },
  { title: "Pedidos", value: "orders", icon: ShoppingCart },
  { title: "Cardápio", value: "products", icon: ChefHat },
  { title: "Categorias", value: "categories", icon: List },
  { title: "Adicionais", value: "addons", icon: Plus },
  { title: "Zonas de Entrega", value: "delivery", icon: MapPin },
  { title: "Pagamento", value: "payment", icon: CreditCard },
  { title: "Marketing", value: "marketing", icon: Send, isGreen: true },
  { title: "Configurações", value: "settings", icon: Settings },
];

export function DashboardLayout({ restaurant, user, onLogout, onRestaurantUpdate }: DashboardLayoutProps) {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const { toast } = useToast();

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
        <AppSidebar 
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          restaurant={restaurant}
          onLogout={onLogout}
          onWhatsAppClick={() => setShowWhatsAppModal(true)}
        />
        
        <main className="flex-1 bg-background">
          <header className="h-16 border-b border-primary-glow/20 bg-primary flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-white hover:bg-white/20" />
              <div className="flex items-center gap-3">
                <img src="/lovable-uploads/df0ab910-5641-4faf-b0dc-3743be76338e.png" alt="Cardápio Grátis Logo" className="h-8" />
                <h1 className="text-xl font-semibold text-white">{restaurant.name}</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="default" size="sm" onClick={copyLink} className="bg-blue-600 hover:bg-blue-700 text-white">
                <LinkIcon className="h-4 w-4 mr-2" />
                Copiar Link
              </Button>
              <Button variant="secondary" size="sm" onClick={openLink} className="bg-white/20 hover:bg-white/30 text-white border border-white/30">
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
            {activeSection === "orders" && (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  A tela de pedidos foi movida para uma página separada para melhor experiência.
                </p>
                <a 
                  href="/admin/orders" 
                  className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Ir para Pedidos
                </a>
              </div>
            )}
            {activeSection === "categories" && <CategoryManager restaurant={restaurant} />}
            {activeSection === "products" && <ProductManager restaurant={restaurant} />}
            {activeSection === "addons" && <AddonManager restaurant={restaurant} />}
            {activeSection === "delivery" && <DeliveryZoneManager restaurant={restaurant} />}
            {activeSection === "payment" && <PaymentMethodsManager restaurant={restaurant} />}
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
            {activeSection === "settings" && (
              <RestaurantSettings 
                restaurant={restaurant} 
                onUpdate={onRestaurantUpdate} 
              />
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

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            {!collapsed && <span>Painel</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.value}>
                  <SidebarMenuButton
                    onClick={() => onSectionChange(item.value)}
                    className={
                      item.isGreen
                        ? activeSection === item.value
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "text-green-600 hover:bg-green-50 hover:text-green-700"
                        : activeSection === item.value
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent/50"
                    }
                  >
                    <item.icon className="h-4 w-4" />
                    {!collapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* WhatsApp Robot Button */}
        <div className="px-4 pb-4">
          <Button 
            onClick={onWhatsAppClick}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-3 rounded-lg flex items-center justify-start gap-3"
          >
            <MessageCircle className="h-4 w-4" />
            {!collapsed && <span>Robô de WhatsApp</span>}
          </Button>
        </div>

        <div className="mt-auto p-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onLogout}
            className="w-full justify-start"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Sair</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}