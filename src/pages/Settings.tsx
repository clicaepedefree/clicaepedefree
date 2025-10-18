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
  LogOut
} from "lucide-react";
import { CategoryManager } from "@/components/dashboard/CategoryManager";
import { ProductManager } from "@/components/dashboard/ProductManager";
import { AddonManager } from "@/components/dashboard/AddonManager";
import { PaymentMethodsManager } from "@/components/dashboard/PaymentMethodsManager";
import { RestaurantSettings } from "@/components/dashboard/RestaurantSettings";
import { DeliveryZoneManager } from "@/components/dashboard/DeliveryZoneManager";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const mainMenuItems = [
  { title: "Financeiro", value: "dashboard", icon: BarChart3, path: "/admin" },
  { title: "Pedidos", value: "orders", icon: ShoppingCart, path: "/admin/orders" },
  { title: "Marketing", value: "marketing", icon: Send, isGreen: true, path: "/admin" },
  { title: "Ajustes", value: "settings", icon: SettingsIcon, path: "/admin/settings" },
];

const settingsCards = [
  { 
    title: "Cardápio", 
    description: "Gerencie produtos e preços",
    icon: ChefHat, 
    value: "products" 
  },
  { 
    title: "Categorias", 
    description: "Organize seu cardápio",
    icon: List, 
    value: "categories" 
  },
  { 
    title: "Adicionais", 
    description: "Configure complementos",
    icon: Plus, 
    value: "addons" 
  },
  { 
    title: "Área de Entrega", 
    description: "Defina zonas e taxas",
    icon: MapPin, 
    value: "delivery" 
  },
  { 
    title: "Formas de Pagamento", 
    description: "Configure métodos de pagamento",
    icon: CreditCard, 
    value: "payment" 
  },
  { 
    title: "Configurações", 
    description: "Ajustes gerais do restaurante",
    icon: SettingsIcon, 
    value: "settings" 
  },
];

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

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

  if (loading || !restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
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
      <div className="min-h-screen flex w-full bg-background">
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
                  {mainMenuItems.map((item) => (
                    <SidebarMenuItem key={item.value}>
                      <SidebarMenuButton
                        onClick={() => navigate(item.path)}
                        className={`flex flex-col items-center justify-center h-16 w-full rounded-lg gap-1 p-2 ${
                          item.isGreen
                            ? "settings" === item.value
                              ? "bg-green-600 text-white hover:bg-green-700"
                              : "text-green-600 hover:bg-green-50 hover:text-green-700"
                            : "settings" === item.value
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
                onClick={handleWhatsAppClick}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-2 rounded-lg flex flex-col items-center justify-center gap-0.5 h-16"
              >
                <MessageCircle className="h-5 w-5" />
                <span className="text-xs leading-tight text-center">Robô de<br />WhatsApp</span>
              </Button>
            </div>

            <div className="mt-auto p-2">
              <Button 
                variant="ghost" 
                onClick={handleLogout}
                className="w-full flex flex-col items-center justify-center gap-1 h-16 rounded-lg"
              >
                <LogOut className="h-5 w-5" />
                <span className="text-xs">Sair</span>
              </Button>
            </div>
          </SidebarContent>
        </Sidebar>
        
        <div className="flex-1">
          <header className="h-16 border-b bg-background flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div className="flex items-center gap-3">
                <SettingsIcon className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-semibold text-foreground">{restaurant?.name || "Ajustes"}</h1>
              </div>
            </div>
          </header>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {settingsCards.map((card) => (
                <Card 
                  key={card.value}
                  className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary/50"
                  onClick={() => setActiveDialog(card.value)}
                >
                  <CardHeader className="text-center pb-4">
                    <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <card.icon className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{card.title}</CardTitle>
                    <CardDescription>{card.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <Dialog open={!!activeDialog} onOpenChange={(open) => !open && setActiveDialog(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{getDialogTitle()}</DialogTitle>
            </DialogHeader>
            {renderDialogContent()}
          </DialogContent>
        </Dialog>
      </div>
    </SidebarProvider>
  );
}
