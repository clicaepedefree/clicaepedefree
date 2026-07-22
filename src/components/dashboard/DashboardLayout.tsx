import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  MessageCircle,
  Send,
  Sparkles,
} from "lucide-react";
import { User } from "@supabase/supabase-js";
import { AppShell } from "@/components/layout/AppShell";
import { SalesDashboard } from "./SalesDashboard";
import { CTABanner } from "./CTABanner";
import { RestaurantControls } from "./RestaurantControls";
import { OrdersKanban } from "../orders/OrdersKanban";
import { OnboardingHelpDialog } from "./OnboardingHelpDialog";
import { UpsellPopup } from "./UpsellPopup";
import { FloatingWhatsAppButton } from "./FloatingWhatsAppButton";
import { CouponManager } from "./CouponManager";
import { OnboardingChecklist } from "./OnboardingChecklist";
import { MenuLinkCard } from "./MenuLinkCard";
import { StoreStatusBanner } from "./StoreStatusBanner";
import { WelcomeTour } from "./WelcomeTour";
import { useSearchParams } from "react-router-dom";

interface DashboardLayoutProps {
  restaurant: any;
  user: User;
  onLogout: () => void;
  onRestaurantUpdate: (restaurant: any) => void;
  activeSection?: string;
  onSectionChange?: (section: string) => void;
  isSuperAdminMode?: boolean;
}

export function DashboardLayout({
  restaurant,
  user,
  onLogout,
  onRestaurantUpdate,
  activeSection: propActiveSection,
  isSuperAdminMode = false,
}: DashboardLayoutProps) {
  const [params] = useSearchParams();
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  // Section derivada da rota/prop: dashboard (default), orders, marketing
  const activeSection =
    propActiveSection || (params.get("section") === "marketing" ? "marketing" : "dashboard");

  const handleWhatsAppClick = () => {
    const message = encodeURIComponent("quero o robo de WhatsApp");
    window.open(`https://wa.me/5511916651776?text=${message}`, "_blank");
  };

  return (
    <AppShell restaurant={restaurant} onLogout={onLogout}>
      {!isSuperAdminMode && <WelcomeTour restaurantId={restaurant.id} />}
      <OnboardingHelpDialog restaurantId={restaurant.id} />
      <UpsellPopup />
      <FloatingWhatsAppButton />

      <div className="p-4 lg:p-8 xl:p-10 space-y-5 lg:space-y-6">
        <StoreStatusBanner restaurant={restaurant} onRestaurantUpdate={onRestaurantUpdate} />

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 bg-background hover:bg-muted text-xs" asChild>
            <a
              href="https://www.youtube.com/watch?v=XHJScS_YEMo"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5"
            >
              <span className="text-base">📺</span>
              <span>Ver vídeo de como usar</span>
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 bg-background hover:bg-whatsapp/5 border-whatsapp/30 text-whatsapp hover:text-whatsapp text-xs"
            asChild
          >
            <a
              href="https://wa.me/5511916651776?text=Preciso%20de%20ajuda%20no%20cardápio%20grátis"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Falar com o suporte</span>
            </a>
          </Button>
        </div>

        <CTABanner />

        {activeSection === "dashboard" && (
          <div className="space-y-5 lg:space-y-6 animate-fade-in-up">
            <OnboardingChecklist restaurant={restaurant} />
            <MenuLinkCard restaurant={restaurant} />
            <RestaurantControls restaurant={restaurant} onRestaurantUpdate={onRestaurantUpdate} />
            <SalesDashboard restaurant={restaurant} />
          </div>
        )}

        {activeSection === "orders" && (
          <div className="animate-fade-in-up">
            <OrdersKanban restaurant={restaurant} />
          </div>
        )}

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
                    <p className="text-sm text-muted-foreground">
                      Crie cupons e promoções para seus clientes
                    </p>
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
                      <h3 className="text-base lg:text-lg font-semibold text-foreground mb-2">
                        Em breve: campanhas no WhatsApp
                      </h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        Você poderá disparar mensagens para seus clientes direto pelo painel.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={showWhatsAppModal} onOpenChange={setShowWhatsAppModal}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 min-h-[450px]">
            <div className="p-8 flex flex-col justify-center">
              <DialogHeader className="mb-6">
                <DialogTitle className="text-2xl font-bold text-foreground">Robô de WhatsApp</DialogTitle>
              </DialogHeader>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Uma ferramenta poderosa para vender e responder automaticamente aos seus clientes. Use
                facilmente, sem necessidade de conhecimentos de programação!
              </p>
              <Button
                onClick={handleWhatsAppClick}
                className="bg-whatsapp hover:bg-whatsapp/90 text-white text-lg py-6 px-8 rounded-xl font-semibold shadow-lg"
              >
                <MessageCircle className="mr-2 h-5 w-5" />
                Conectar Robô de WhatsApp
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
