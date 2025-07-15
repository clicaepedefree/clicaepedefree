import { Button } from "@/components/ui/button";
import { Phone, User, LogIn, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/clic-logo.png";

export function Navbar() {
  return (
    <nav className="bg-card border-b shadow-card sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 hover:scale-105 transition-all duration-300">
          <img src={logo} alt="Clic Logo" className="h-8" />
          <div>
            <span className="text-xs text-muted-foreground font-medium">FREE</span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700 text-white" asChild>
            <a href="https://wa.me/5511916924490?text=Quero%20saber%20mais%20sobre%20o%20cardápio%20grátis" target="_blank" rel="noopener noreferrer" className="hidden sm:flex">
              <Phone className="mr-2 h-4 w-4" />
              CHAMAR NO WHATSAPP
            </a>
          </Button>
          
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin">
              <User className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Entrar</span> Admin
            </Link>
          </Button>

          <Button variant="hero" size="sm" asChild>
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