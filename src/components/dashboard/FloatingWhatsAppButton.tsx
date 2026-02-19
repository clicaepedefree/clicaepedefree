import { MessageCircle } from "lucide-react";

export function FloatingWhatsAppButton() {
  const handleClick = () => {
    const message = encodeURIComponent("Preciso de um suporte aqui");
    window.open(`https://wa.me/5511934963958?text=${message}`, '_blank');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
      {/* Tag/Label */}
      <div className="bg-white shadow-lg rounded-lg px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 hidden sm:block">
        Precisa de ajuda? Fale com o Suporte
      </div>
      
      {/* WhatsApp Button */}
      <button
        onClick={handleClick}
        className="bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
        aria-label="Fale com o suporte via WhatsApp"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    </div>
  );
}
