import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChefHat, List, Plus, CreditCard, Settings as SettingsIcon } from "lucide-react";
import { CategoryManager } from "@/components/dashboard/CategoryManager";
import { ProductManager } from "@/components/dashboard/ProductManager";
import { AddonManager } from "@/components/dashboard/AddonManager";
import { PaymentMethodsManager } from "@/components/dashboard/PaymentMethodsManager";
import { RestaurantSettings } from "@/components/dashboard/RestaurantSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="min-h-screen bg-background">
      <header className="h-16 border-b bg-background flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <SettingsIcon className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold text-foreground">Ajustes</h1>
          </div>
        </div>
      </header>

      <div className="p-6">
        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="products" className="flex items-center gap-2">
              <ChefHat className="h-4 w-4" />
              Cardápio
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Categorias
            </TabsTrigger>
            <TabsTrigger value="addons" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Adicionais
            </TabsTrigger>
            <TabsTrigger value="payment" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Pagamento
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <ProductManager restaurant={restaurant} />
          </TabsContent>

          <TabsContent value="categories">
            <CategoryManager restaurant={restaurant} />
          </TabsContent>

          <TabsContent value="addons">
            <AddonManager restaurant={restaurant} />
          </TabsContent>

          <TabsContent value="payment">
            <PaymentMethodsManager restaurant={restaurant} />
          </TabsContent>

          <TabsContent value="settings">
            <RestaurantSettings restaurant={restaurant} onUpdate={handleRestaurantUpdate} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
