import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";


export function MobileStickyCtA() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 backdrop-blur-lg border-t border-gray-200 shadow-2xl p-3">
      <Button 
        size="lg" 
        className="w-full py-6 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg text-base font-bold rounded-xl"
        asChild
      >
        <a href="/criar-conta">
          Criar meu cardápio grátis
          <ArrowRight className="ml-2 h-5 w-5" />
        </a>
      </Button>
    </div>
  );
}
