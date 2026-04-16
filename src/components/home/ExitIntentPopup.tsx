import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export function ExitIntentPopup() {
  const [isVisible, setIsVisible] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger when mouse leaves through the top of the page
      if (e.clientY <= 0 && !hasShown) {
        setIsVisible(true);
        setHasShown(true);
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);
    
    return () => {
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [hasShown]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={() => setIsVisible(false)}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-scale-in">
        {/* Close button */}
        <button 
          onClick={() => setIsVisible(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Content */}
        <div className="text-center">
          <div className="text-5xl mb-4">👋</div>
          
          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            Antes de sair…
          </h3>
          
          <p className="text-gray-600 mb-6 leading-relaxed">
            Quer testar o cardápio digital <strong className="text-emerald-600">grátis</strong> e sem precisar de cartão de crédito?
          </p>

          <Button 
            size="lg" 
            className="w-full py-7 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg text-lg font-bold rounded-xl mb-4" 
            onClick={() => {
              setIsVisible(false);
              window.open(`https://wa.me/5511916651776?text=${encodeURIComponent('Quero criar meu cardápio grátis')}`, '_blank');
            }}
          >
            Quero testar grátis
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>

          <button 
            onClick={() => setIsVisible(false)}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Não, obrigado
          </button>
        </div>
      </div>
    </div>
  );
}
