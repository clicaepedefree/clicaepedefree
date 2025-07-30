import { Button } from "@/components/ui/button";
import { Phone, User, LogIn, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "/lovable-uploads/1ddc24de-f742-4120-83ea-1a47a09aa99a.png";

export function Navbar() {
  return (
    <nav className="bg-primary border-b border-primary-glow/20 shadow-brand sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 hover:scale-105 transition-all duration-300">
          <img src="/lovable-uploads/df0ab910-5641-4faf-b0dc-3743be76338e.png" alt="Cardápio Grátis Logo" className="h-8" />
          <div className="hidden sm:block">
            <span className="text-xs bg-white/20 text-white px-2 py-1 rounded-full font-medium">FREE</span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Button variant="default" size="sm" className="bg-white/20 hover:bg-white/30 text-white shadow-md border border-white/30" asChild>
            <a href="https://wa.me/5511916924490?text=Quero%20saber%20mais%20sobre%20o%20cardápio%20grátis" target="_blank" rel="noopener noreferrer" className="hidden sm:flex">
              <Phone className="mr-2 h-4 w-4" />
              WhatsApp
            </a>
          </Button>
          
          <Button variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/20" asChild>
            <Link to="/admin">
              <User className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Entrar</span>
            </Link>
          </Button>

          <Button variant="default" size="sm" className="bg-secondary hover:bg-secondary/90 text-white shadow-md" asChild>
            <Link to="/criar-conta">
              <LogIn className="mr-2 h-4 w-4" />
              Criar Conta
            </Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}