import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import {
  List,
  Plus,
  CreditCard,
  Settings as SettingsIcon,
  MapPin,
  ArrowLeft,
  Package,
  Store,
  Clock,
  ArrowRight,
} from "lucide-react";
import { CategoryManager } from "@/components/dashboard/CategoryManager";
import { ProductManager } from "@/components/dashboard/ProductManager";
import { AddonManager } from "@/components/dashboard/AddonManager";
import { PaymentMethodsManager } from "@/components/dashboard/PaymentMethodsManager";
import { RestaurantSettings } from "@/components/dashboard/RestaurantSettings";
import { DeliveryZoneManager } from "@/components/dashboard/DeliveryZoneManager";
import { OperatingHoursManager } from "@/components/dashboard/OperatingHoursManager";
import { AppShell } from "@/components/layout/AppShell";

const settingsCards = [
  { title: "Produtos", description: "Gerencie produtos e preços", icon: Package, value: "products", color: "primary" },
  { title: "Categorias", description: "Organize seu cardápio", icon: List, value: "categories", color: "secondary" },
  { title: "Adicionais", description: "Configure complementos", icon: Plus, value: "addons", color: "accent" },
  { title: "Áreas de Entrega", description: "Defina zonas e taxas", icon: MapPin, value: "delivery", color: "whatsapp" },
  { title: "Horário de Funcionamento", description: "Configure dias e horários", icon: Clock, value: "hours", color: "accent" },
  { title: "Formas de Pagamento", description: "Configure métodos de pagamento", icon: CreditCard, value: "payment", color: "primary" },
  { title: "Perfil do Restaurante", description: "Ajustes gerais do restaurante", icon: Store, value: "profile", color: "secondary" },
];

export default function Settings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, restaurant, loading, updateRestaurant, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<string | null>(searchParams.get("tab"));

  useEffect(() => {
    setActiveTab(searchParams.get("tab"));
  }, [searchParams]);

  useEffect(() => {
    if (!loading && !user) navigate("/criar-conta");
  }, [loading, user, navigate]);

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      primary: { bg: "bg-primary/10", text: "text-primary", border: "hover:border-primary/50" },
      secondary: { bg: "bg-secondary/10", text: "text-secondary", border: "hover:border-secondary/50" },
      accent: { bg: "bg-accent/10", text: "text-accent-foreground", border: "hover:border-accent/50" },
      whatsapp: { bg: "bg-whatsapp/10", text: "text-whatsapp", border: "hover:border-whatsapp/50" },
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
      case "products": return <ProductManager restaurant={restaurant} />;
      case "categories": return <CategoryManager restaurant={restaurant} />;
      case "addons": return <AddonManager restaurant={restaurant} />;
      case "delivery": return <DeliveryZoneManager restaurant={restaurant} />;
      case "hours": return <OperatingHoursManager restaurant={restaurant} />;
      case "payment": return <PaymentMethodsManager restaurant={restaurant} />;
      case "profile": return <RestaurantSettings restaurant={restaurant} onUpdate={updateRestaurant} />;
      default: return null;
    }
  };

  const getPageTitle = () => settingsCards.find((c) => c.value === activeTab)?.title || "Configurações";

  return (
    <AppShell restaurant={restaurant} onLogout={logout} title={getPageTitle()} subtitle={restaurant.name}>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          {activeTab && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setActiveTab(null);
                navigate("/admin/settings");
              }}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Todas as configurações</span>
            </Button>
          )}
          {!activeTab && (
            <div className="flex items-center gap-2">
              <SettingsIcon className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Configurações</h2>
            </div>
          )}
        </div>

        {activeTab ? (
          <div className="animate-fade-in-up">{renderContent()}</div>
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
                          <CardTitle className="text-lg text-foreground group-hover:text-primary transition-colors">{card.title}</CardTitle>
                          <CardDescription className="mt-1">{card.description}</CardDescription>
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
    </AppShell>
  );
}
