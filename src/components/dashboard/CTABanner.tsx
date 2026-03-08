import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, MessageCircle, Sparkles } from "lucide-react";

export function CTABanner() {
  const handleUpgradeClick = () => {
    const message = encodeURIComponent("quero conhecer o sistema completo");
    window.open(`https://wa.me/5511916651776?text=${message}`, '_blank');
  };

  const handleWhatsAppClick = () => {
    window.open('https://wa.me/5511916651776', '_blank');
  };

  return (
    <Card className="relative overflow-hidden border-border/40 bg-gradient-to-r from-primary/[0.04] via-transparent to-whatsapp/[0.04]">
      <CardContent className="p-4 lg:p-5">
        <div className="flex flex-col sm:flex-row items-start gap-3 lg:gap-4">
          <div className="h-10 w-10 lg:h-11 lg:w-11 rounded-xl bg-gradient-to-br from-primary/15 to-whatsapp/15 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-5 w-5 lg:h-5.5 lg:w-5.5 text-primary" />
          </div>
          
          <div className="flex-1 space-y-2.5">
            <div>
              <h3 className="text-sm lg:text-base font-semibold text-foreground">
                Precisa de mais recursos?
              </h3>
              <p className="text-xs lg:text-sm text-muted-foreground mt-0.5 leading-relaxed">
                Robô de WhatsApp, integração com iFood, pagamento online, controle de estoque, PDV e muito mais!
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={handleUpgradeClick} 
                size="sm"
                className="h-8 lg:h-9 bg-primary hover:bg-primary/90 shadow-sm text-xs lg:text-sm"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Conhecer Sistema Completo
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleWhatsAppClick} 
                className="h-8 lg:h-9 border-whatsapp/30 text-whatsapp hover:bg-whatsapp/5 hover:text-whatsapp text-xs lg:text-sm"
              >
                <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                Falar com Equipe
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
