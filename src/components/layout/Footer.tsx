import { Link } from "react-router-dom";
import { Phone, Mail, MessageSquare, Heart } from "lucide-react";
import logo from "@/assets/logo.png";
export function Footer() {
  return <footer className="bg-foreground text-white py-16">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Clica e Pede FREE" className="h-10 w-10" />
              <div>
                <h3 className="text-xl font-bold text-primary-glow">Clica e Pede</h3>
                <span className="text-sm text-white/60">FREE</span>
              </div>
            </div>
            <p className="text-white/80 leading-relaxed">
              A solução gratuita mais simples para criar seu cardápio digital e receber pedidos via WhatsApp.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-primary-glow">Plataforma</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/criar-conta" className="text-white/80 hover:text-primary-glow transition-colors">
                  Criar Conta
                </Link>
              </li>
              <li>
                <Link to="/admin" className="text-white/80 hover:text-primary-glow transition-colors">
                  Área do Restaurante
                </Link>
              </li>
              <li>
                <Link to="/demo" className="text-white/80 hover:text-primary-glow transition-colors">
                  Ver Demonstração
                </Link>
              </li>
              <li>
                <Link to="/como-funciona" className="text-white/80 hover:text-primary-glow transition-colors">
                  Como Funciona
                </Link>
              </li>
            </ul>
          </div>

          {/* Suporte */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-primary-glow">Suporte</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/faq" className="text-white/80 hover:text-primary-glow transition-colors">
                  Perguntas Frequentes
                </Link>
              </li>
              <li>
                <Link to="/tutoriais" className="text-white/80 hover:text-primary-glow transition-colors">
                  Tutoriais
                </Link>
              </li>
              <li>
                <Link to="/contato" className="text-white/80 hover:text-primary-glow transition-colors">
                  Contato
                </Link>
              </li>
              <li>
                <a href="https://wa.me/5511934963958" target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-primary-glow transition-colors">
                  WhatsApp Suporte
                </a>
              </li>
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-primary-glow">Contato</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-4 w-4 text-primary-glow" />
                <span className="text-white/80 text-sm">WhatsApp: (11) 96192-4490</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-primary-glow" />
                <span className="text-white/80 text-sm">comercial@clicaepede.online</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/20 mt-12 pt-8 text-center">
          <p className="text-white/60 text-sm flex items-center justify-center gap-1">
            Feito com <Heart className="h-4 w-4 text-destructive" /> para ajudar pequenos negócios
          </p>
          <p className="text-white/60 text-sm mt-2">© 2025 Clica e Pede FREE. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>;
}