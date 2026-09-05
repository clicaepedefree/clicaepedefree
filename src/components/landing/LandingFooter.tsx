import { Mail, MessageSquare } from "lucide-react";
import logo from "@/assets/logo.png";
import { openSignupWhatsApp } from "@/lib/signup-cta";

export function LandingFooter() {
  return (
    <footer className="bg-ink py-14 text-white">
      <div className="container mx-auto px-4">
        <div className="grid gap-10 md:grid-cols-3">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Cardápio Fácil" className="h-10 w-10" />
              <h3 className="text-xl font-bold">Cardápio Fácil</h3>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-white/70">
              Sistema completo para restaurantes venderem mais, atenderem mais rápido e fidelizarem
              clientes.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-widest text-flame">Navegação</h4>
            <ul className="space-y-2 text-sm text-white/75">
              <li><a href="#beneficios" className="hover:text-white">Benefícios</a></li>
              <li><a href="#recursos" className="hover:text-white">Recursos</a></li>
              <li><a href="#planos" className="hover:text-white">Preço</a></li>
              <li><a href="#como-funciona" className="hover:text-white">Como funciona</a></li>
              <li>
                <button onClick={openSignupWhatsApp} className="hover:text-white">
                  Começar teste grátis
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-widest text-flame">Contato</h4>
            <ul className="space-y-3 text-sm text-white/75">
              <li className="flex items-center gap-3">
                <MessageSquare className="h-4 w-4 text-flame" />
                WhatsApp: (11) 91665-1776
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-flame" />
                comercial@clicaepede.online
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-center text-sm text-white/50">
          © {new Date().getFullYear()} Cardápio Fácil. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
