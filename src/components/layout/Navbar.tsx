import { Button } from "@/components/ui/button";
import { User, ArrowRight, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { openSignupWhatsApp } from "@/lib/signup-cta";

const links = [
  { label: "Benefícios", href: "#beneficios" },
  { label: "Recursos", href: "#recursos" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Preço", href: "#planos" },
];

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-ink/90 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/lovable-uploads/df0ab910-5641-4faf-b0dc-3743be76338e.png"
            alt="Cardápio Fácil"
            className="h-9"
          />
        </Link>

        <div className="hidden items-center gap-6 lg:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-white/75 transition-colors hover:text-white">
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" size="sm" className="rounded-xl text-white/80 hover:bg-white/10 hover:text-white" asChild>
            <Link to="/entrar">
              <User className="mr-2 h-4 w-4" />
              Entrar
            </Link>
          </Button>

          <Button
            size="sm"
            className="group rounded-xl bg-gradient-flame px-5 font-bold text-flame-foreground shadow-[var(--shadow-flame)] transition-transform hover:scale-105"
            onClick={openSignupWhatsApp}
          >
            COMEÇAR TESTE GRÁTIS
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>

        <button
          className="rounded-xl p-2 text-white transition-colors hover:bg-white/10 md:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Abrir menu"
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="absolute left-0 right-0 top-16 border-b border-white/10 bg-ink md:hidden">
          <div className="container mx-auto flex flex-col gap-3 px-4 py-4">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-xl px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10"
              >
                {l.label}
              </a>
            ))}

            <Button variant="ghost" className="w-full justify-start rounded-xl text-white/80 hover:bg-white/10 hover:text-white" asChild onClick={() => setIsMobileMenuOpen(false)}>
              <Link to="/entrar">
                <User className="mr-2 h-4 w-4" />
                Entrar
              </Link>
            </Button>

            <Button
              className="w-full rounded-xl bg-gradient-flame font-bold text-flame-foreground"
              onClick={() => {
                setIsMobileMenuOpen(false);
                openSignupWhatsApp();
              }}
            >
              COMEÇAR TESTE GRÁTIS
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}
