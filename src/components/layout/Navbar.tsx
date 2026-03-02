import { Button } from "@/components/ui/button";
import { User, LogIn, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link 
          to="/" 
          className="flex items-center gap-3 hover:scale-105 transition-all duration-300"
        >
          <img 
            src="/lovable-uploads/df0ab910-5641-4faf-b0dc-3743be76338e.png" 
            alt="Cardápio Fácil Logo" 
            className="h-9" 
          />
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-3 py-1 rounded-full font-semibold shadow-sm">
              FREE
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 rounded-xl" 
            asChild
          >
            <a href="https://cardapiofacil.site/entrar">
              <User className="mr-2 h-4 w-4" />
              Entrar
            </a>
          </Button>

          <Button 
            size="sm" 
            className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl rounded-xl px-5 transition-all duration-300 hover:scale-105" 
            onClick={() => document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <LogIn className="mr-2 h-4 w-4" />
            Criar Conta Grátis
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6 text-gray-700" />
          ) : (
            <Menu className="h-6 w-6 text-gray-700" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-gray-100 shadow-lg animate-slide-in-bottom">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-3">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 rounded-xl" 
              asChild
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <a href="https://cardapiofacil.site/entrar">
                <User className="mr-2 h-4 w-4" />
                Entrar
              </a>
            </Button>

            <Button 
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-lg rounded-xl" 
              onClick={() => {
                setIsMobileMenuOpen(false);
                document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <LogIn className="mr-2 h-4 w-4" />
              Criar Conta Grátis
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}