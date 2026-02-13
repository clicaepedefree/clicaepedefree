import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, MessageCircle, Sparkles, X } from "lucide-react";
import { useState } from "react";

export function CTABanner() {
  const [isVisible, setIsVisible] = useState(true);

  const handleUpgradeClick = () => {
    const message = encodeURIComponent("quero conhecer o sistema completo");
    window.open(`https://wa.me/5511951986641?text=${message}`, '_blank');
  };

  const handleWhatsAppClick = () => {
    window.open('https://wa.me/5511951986641', '_blank');
  };

  if (!isVisible) return null;

  return (
    <Card className="relative overflow-hidden border-border/50 bg-gradient-to-r from-primary/5 via-transparent to-whatsapp/5 mb-6">
      <button 
        onClick={() => setIsVisible(false)}
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted/50 transition-colors z-10"
        aria-label="Fechar"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
      
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-whatsapp/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Precisa de mais recursos?
              </h3>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Robô de WhatsApp, integração com iFood, pagamento online, controle de estoque, PDV e muito mais!
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={handleUpgradeClick} 
                size="sm"
                className="bg-primary hover:bg-primary/90 shadow-sm"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Conhecer Sistema Completo
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleWhatsAppClick} 
                className="border-whatsapp/30 text-whatsapp hover:bg-whatsapp/5 hover:text-whatsapp"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Falar com Equipe
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
