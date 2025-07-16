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
import { NavLink, useLocation } from "react-router-dom";
import { 
  Store, 
  Menu as MenuIcon, 
  Plus, 
  Settings, 
  LogOut, 
  Link as LinkIcon,
  Package,
  MapPin
} from "lucide-react";
import { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { CategoryManager } from "./CategoryManager";
import { ProductManager } from "./ProductManager";
import { AddonManager } from "./AddonManager";
import { RestaurantSettings } from "./RestaurantSettings";
import { DeliveryZoneManager } from "./DeliveryZoneManager";
import { CTABanner } from "./CTABanner";

interface DashboardLayoutProps {
  restaurant: any;
  user: User;
  onLogout: () => void;
  onRestaurantUpdate: (restaurant: any) => void;
}

const menuItems = [
  { title: "Categorias", value: "categories", icon: MenuIcon },
  { title: "Produtos", value: "products", icon: Package },
  { title: "Adicionais", value: "addons", icon: Plus },
  { title: "Zonas de Entrega", value: "delivery", icon: MapPin },
  { title: "Configurações", value: "settings", icon: Settings },
];

export function DashboardLayout({ restaurant, user, onLogout, onRestaurantUpdate }: DashboardLayoutProps) {
  const [activeSection, setActiveSection] = useState("categories");
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

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar 
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          restaurant={restaurant}
          onLogout={onLogout}
        />
        
        <main className="flex-1 bg-background">
          <header className="h-16 border-b bg-white flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <h1 className="text-xl font-semibold">{restaurant.name}</h1>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={copyLink}>
                <LinkIcon className="h-4 w-4 mr-2" />
                Copiar Link
              </Button>
              <Button variant="secondary" size="sm" onClick={openLink}>
                Ver Cardápio
              </Button>
            </div>
          </header>

          <div className="p-6">
            <CTABanner />
            
            {/* Mini Banner Tutorial */}
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
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
            </div>
            
            {activeSection === "categories" && <CategoryManager restaurant={restaurant} />}
            {activeSection === "products" && <ProductManager restaurant={restaurant} />}
            {activeSection === "addons" && <AddonManager restaurant={restaurant} />}
            {activeSection === "delivery" && <DeliveryZoneManager restaurant={restaurant} />}
            {activeSection === "settings" && (
              <RestaurantSettings 
                restaurant={restaurant} 
                onUpdate={onRestaurantUpdate} 
              />
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

function AppSidebar({ 
  activeSection, 
  onSectionChange, 
  restaurant, 
  onLogout 
}: {
  activeSection: string;
  onSectionChange: (section: string) => void;
  restaurant: any;
  onLogout: () => void;
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
                    className={activeSection === item.value ? 
                      "bg-accent text-accent-foreground" : 
                      "hover:bg-accent/50"
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