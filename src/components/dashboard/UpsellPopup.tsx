import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import upsellImage from "@/assets/upsell-features.png";

const POPUP_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

export function UpsellPopup() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Show popup after 5 minutes, then every 5 minutes
    const showPopup = () => {
      setIsOpen(true);
    };

    const interval = setInterval(showPopup, POPUP_INTERVAL);

    // Also show after first 5 minutes
    const initialTimeout = setTimeout(showPopup, POPUP_INTERVAL);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
    };
  }, []);

  const handleCtaClick = () => {
    const message = encodeURIComponent("olá quero conhecer os outros recursos do sistema");
    const whatsappUrl = `https://wa.me/5511916651776?text=${message}`;
    window.open(whatsappUrl, '_blank');
    setIsOpen(false);
  };

  const features = [
    "Pagamento online",
    "Robô de Atendimento no WhatsApp",
    "PDV para lançar vendas",
    "Abertura e fechamento de Caixa",
    "Controle de estoque e muito mais...",
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 min-h-[380px]">
          {/* Left Content */}
          <div className="p-8 flex flex-col justify-center">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Precisa de mais recursos? Aqui temos muito mais para você!
            </h2>
            
            <ul className="space-y-3 mb-8">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-3 text-foreground">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-base">{feature}</span>
                </li>
              ))}
            </ul>
            
            <Button 
              onClick={handleCtaClick}
              className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-6 px-8 rounded-lg font-bold shadow-lg hover:shadow-xl transition-all"
            >
              LIBERAR MAIS RECURSOS
            </Button>
          </div>
          
          {/* Right Image */}
          <div className="bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-6">
            <img 
              src={upsellImage} 
              alt="Recursos adicionais" 
              className="max-w-full max-h-[320px] object-contain"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
