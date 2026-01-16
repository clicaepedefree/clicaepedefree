import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
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
} from "@/components/ui/sidebar";
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
  ArrowRight
} from "lucide-react";
import { CategoryManager } from "@/components/dashboard/CategoryManager";
import { ProductManager } from "@/components/dashboard/ProductManager";
import { AddonManager } from "@/components/dashboard/AddonManager";
import { PaymentMethodsManager } from "@/components/dashboard/PaymentMethodsManager";
import { RestaurantSettings } from "@/components/dashboard/RestaurantSettings";
import { DeliveryZoneManager } from "@/components/dashboard/DeliveryZoneManager";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const mainMenuItems = [
  { title: "Dashboard", value: "dashboard", icon: BarChart3, path: "/admin" },
  { title: "Pedidos", value: "orders", icon: ShoppingCart, path: "/admin/orders" },
  { title: "Marketing", value: "marketing", icon: Send, accent: true, path: "/admin" },
  { title: "Ajustes", value: "settings", icon: SettingsIcon, path: "/admin/settings" },
];

const settingsCards = [
  { 
    title: "Cardápio", 
    description: "Gerencie produtos e preços",
    icon: ChefHat, 
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
    title: "Área de Entrega", 
    description: "Defina zonas e taxas",
    icon: MapPin, 
    value: "delivery",
    color: "whatsapp"
  },
  { 
    title: "Formas de Pagamento", 
    description: "Configure métodos de pagamento",
    icon: CreditCard, 
    value: "payment",
    color: "primary"
  },
  { 
    title: "Configurações", 
    description: "Ajustes gerais do restaurante",
    icon: SettingsIcon, 
    value: "settings",
    color: "secondary"
  },
];

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeDialog, setActiveDialog] = useState<string | null>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/criar-conta");
  };

  const handleWhatsAppClick = () => {
    const message = encodeURIComponent("quero o robo de WhatsApp");
    const whatsappUrl = `https://wa.me/5511916924490?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/criar-conta");
      return;
    }

    setUser(user);

    const { data: restaurantData } = await supabase
      .from("restaurants")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!restaurantData) {
      navigate("/criar-conta");
      return;
    }

    setRestaurant(restaurantData);
    setLoading(false);
  };

  const handleRestaurantUpdate = (updatedRestaurant: any) => {
    setRestaurant(updatedRestaurant);
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

  const renderDialogContent = () => {
    switch (activeDialog) {
      case "products":
        return <ProductManager restaurant={restaurant} />;
      case "categories":
        return <CategoryManager restaurant={restaurant} />;
      case "addons":
        return <AddonManager restaurant={restaurant} />;
      case "delivery":
        return <DeliveryZoneManager restaurant={restaurant} />;
      case "payment":
        return <PaymentMethodsManager restaurant={restaurant} />;
      case "settings":
        return <RestaurantSettings restaurant={restaurant} onUpdate={handleRestaurantUpdate} />;
      default:
        return null;
    }
  };

  const getDialogTitle = () => {
    const card = settingsCards.find(c => c.value === activeDialog);
    return card?.title || "Ajustes";
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/30">
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
                  {mainMenuItems.map((item) => {
                    const isActive = item.value === "settings";
                    const isAccent = item.accent;
                    
                    return (
                      <SidebarMenuItem key={item.value}>
                        <SidebarMenuButton
                          onClick={() => navigate(item.path)}
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

            {/* WhatsApp Robot Button */}
            <div className="px-2 mb-2">
              <Button 
                onClick={handleWhatsAppClick}
                className="w-full bg-whatsapp hover:bg-whatsapp/90 text-white font-medium rounded-xl 
                           flex items-center justify-center lg:justify-start gap-2 h-12 px-3 shadow-sm"
              >
                <MessageCircle className="h-5 w-5 flex-shrink-0" />
                <span className="hidden lg:block text-sm">Robô WhatsApp</span>
              </Button>
            </div>

            {/* Logout Button */}
            <div className="px-2">
              <Button 
                variant="ghost" 
                onClick={handleLogout}
                className="w-full flex items-center justify-center lg:justify-start gap-2 h-12 px-3 rounded-xl
                           text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
              >
                <LogOut className="h-5 w-5 flex-shrink-0" />
                <span className="hidden lg:block text-sm">Sair</span>
              </Button>
            </div>
          </SidebarContent>
        </Sidebar>
        
        <main className="flex-1 flex flex-col min-h-screen">
          {/* Header */}
          <header className="sticky top-0 z-40 h-16 bg-background/80 backdrop-blur-lg border-b border-border/50 flex items-center px-4 md:px-6">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="lg:hidden" />
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <SettingsIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-base font-semibold text-foreground">Ajustes</h1>
                  <p className="text-xs text-muted-foreground">{restaurant?.name}</p>
                </div>
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="flex-1 p-4 md:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {settingsCards.map((card) => {
                const colors = getColorClasses(card.color);
                return (
                  <Card 
                    key={card.value}
                    className={`group cursor-pointer border-border/50 bg-card hover:shadow-lg transition-all duration-300 ${colors.border}`}
                    onClick={() => setActiveDialog(card.value)}
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
          </div>
        </main>

        <Dialog open={!!activeDialog} onOpenChange={(open) => !open && setActiveDialog(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">{getDialogTitle()}</DialogTitle>
            </DialogHeader>
            {renderDialogContent()}
          </DialogContent>
        </Dialog>
      </div>
    </SidebarProvider>
  );
}
