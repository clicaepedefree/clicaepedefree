import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, MessageCircle, Sparkles } from "lucide-react";
export function CTABanner() {
  const handleUpgradeClick = () => {
    window.open('https://clicaepede.online', '_blank');
  };
  const handleWhatsAppClick = () => {
    window.open('https://wa.me/5511916924490', '_blank');
  };
  return <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 mb-6">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground mb-2">Precisa de mais recursos? Conheça o Clica e Pede completo!</h3>
            <p className="text-muted-foreground mb-4">Com robô de WhatsApp, integração com Ifood, pagamento online, controle de estoque, PDV, atendimento de mesas e App do Garçom, relatórios e controle financeiro. Conheça todas as funcionalidades avançadas!</p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={handleUpgradeClick} className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Conhecer Sistema Completo
              </Button>
              
              <Button variant="outline" onClick={handleWhatsAppClick} className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Fale com Nossa Equipe
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>;
}