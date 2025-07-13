import { Button } from "@/components/ui/button";
import { Phone, User, LogIn, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

export function Navbar() {
  return (
    <nav className="bg-card border-b shadow-card sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 hover:scale-105 transition-all duration-300">
          <img src={logo} alt="Clica e Pede FREE" className="h-10 w-10" />
          <div>
            <h1 className="text-xl font-bold text-primary">Clica e Pede</h1>
            <span className="text-xs text-muted-foreground font-medium">FREE</span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/contato" className="hidden sm:flex">
              <Phone className="mr-2 h-4 w-4" />
              Contato
            </Link>
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