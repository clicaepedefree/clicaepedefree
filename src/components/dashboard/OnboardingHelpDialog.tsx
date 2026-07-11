import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import supportImage from "@/assets/support-help.png";

interface OnboardingHelpDialogProps {
  restaurantId: string;
}

export function OnboardingHelpDialog({ restaurantId }: OnboardingHelpDialogProps) {
  const [open, setOpen] = useState(false);
  const [hasProducts, setHasProducts] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkProducts();
  }, [restaurantId]);

  const checkProducts = async () => {
    try {
      // Check if user has already seen this dialog
      const hasSeenDialog = localStorage.getItem(`onboarding-help-seen-${restaurantId}`);
      
      if (hasSeenDialog) {
        setLoading(false);
        return;
      }

      // Check if restaurant has any products
      const { data, error } = await supabase
        .from('products')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .limit(1);

      if (error) throw error;

      const noProducts = !data || data.length === 0;
      setHasProducts(!noProducts);
      
      // Show dialog if no products
      if (noProducts) {
        // Small delay to let the dashboard load first
        setTimeout(() => {
          setOpen(true);
        }, 1000);
      }
    } catch (error) {
      console.error('Error checking products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    // Mark as seen in localStorage
    localStorage.setItem(`onboarding-help-seen-${restaurantId}`, 'true');
  };

  const handleWhatsAppClick = () => {
    const message = encodeURIComponent("Preciso que cadastrem meu cardápio");
    const whatsappUrl = `https://wa.me/5511916651776?text=${message}`;
    window.open(whatsappUrl, '_blank');
    handleClose();
  };

  if (loading || hasProducts) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <div className="p-8">
          <div className="flex flex-col items-center text-center">
            {/* Image */}
            <div className="mb-6">
              <img 
                src={supportImage} 
                alt="Suporte para cadastro" 
                className="w-64 h-64 object-contain"
              />
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Nós vamos cadastrar o seu cardápio para você!
            </h2>

            {/* Description */}
            <div className="text-gray-700 mb-6 space-y-3 max-w-xl">
              <p>
                Não precisa perder tempo e quebrar a cabeça para configurar seu cardápio. Solicite apoio da nossa equipe de suporte e nós fazemos isso para você!
              </p>
              <p>
                Cadastramos todos os seus produtos, fotos, descrições, preços e categorias para que você receba tudo pronto para começar a vender. Quer aproveitar? Clique no botão abaixo e solicite o cadastro com o nosso suporte.
              </p>
            </div>

            {/* WhatsApp Button */}
            <Button
              onClick={handleWhatsAppClick}
              className="bg-green-600 hover:bg-green-700 text-white text-lg py-6 px-8 rounded-lg font-semibold"
            >
              SOLICITAR O CADASTRO DE PRODUTOS
            </Button>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
