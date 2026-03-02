import { Button } from "@/components/ui/button";
import { ArrowRight, Play, CheckCircle2, Users, Clock, Star, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

// Counter animation hook
function useCountUp(target: number, duration: number = 2000, startDelay: number = 500) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      let start = 0;
      const increment = target / (duration / 16);
      const counter = setInterval(() => {
        start += increment;
        if (start >= target) {
          setCount(target);
          clearInterval(counter);
        } else {
          setCount(Math.floor(start));
        }
      }, 16);
      return () => clearInterval(counter);
    }, startDelay);
    return () => clearTimeout(timer);
  }, [target, duration, startDelay]);
  
  return count;
}

export function HeroSection() {
  const restaurantCount = useCountUp(1247, 2500, 800);
  const orderCount = useCountUp(48750, 2500, 1000);

  return (
    <section className="min-h-screen flex items-center relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50" />
      
      {/* Animated shapes */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl animate-float animation-delay-300" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-blue-200/10 to-emerald-200/10 rounded-full blur-3xl" />
      
      {/* Dot pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, #000 1px, transparent 0)`,
        backgroundSize: '40px 40px'
      }} />
      
      <div className="container mx-auto px-4 relative z-10 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Content */}
            <div className="text-center lg:text-left space-y-8">
              {/* Social proof badge */}
              <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-full px-5 py-2.5 shadow-lg animate-fade-in-up">
                <div className="flex -space-x-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-white">J</div>
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-white">A</div>
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-white">R</div>
                </div>
                <span className="text-sm font-medium text-gray-700">
                  <span className="font-bold text-emerald-600">{restaurantCount.toLocaleString()}</span> restaurantes já usam
                </span>
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.1] text-gray-900 animate-fade-in-up animation-delay-100">
                Receba pedidos no WhatsApp{" "}
                <span className="relative">
                  <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-emerald-500 bg-clip-text text-transparent">
                    sem bagunça, sem taxa e sem mensalidade
                  </span>
                  <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                    <path d="M2 10C50 2 150 2 298 10" stroke="url(#gradient)" strokeWidth="4" strokeLinecap="round"/>
                    <defs>
                      <linearGradient id="gradient" x1="0" y1="0" x2="300" y2="0">
                        <stop stopColor="#2563eb"/>
                        <stop offset="1" stopColor="#10b981"/>
                      </linearGradient>
                    </defs>
                  </svg>
                </span>
              </h1>
              
              <p className="text-xl text-gray-600 leading-relaxed max-w-xl mx-auto lg:mx-0 animate-fade-in-up animation-delay-200">
                Envie um link, o cliente escolhe, e o pedido chega <strong className="text-gray-800">organizado no WhatsApp e no painel do restaurante.</strong>
              </p>

              {/* Trust badges */}
              <div className="flex flex-wrap gap-3 justify-center lg:justify-start animate-fade-in-up animation-delay-300">
                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Grátis até 100 pedidos ou R$2.000/mês
                </div>
                <div className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-full text-sm font-medium">
                  <X className="w-4 h-4" />
                  Sem cartão de crédito
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-fade-in-up animation-delay-400">
                <Button 
                  size="lg" 
                  className="group relative text-lg px-8 py-7 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-xl shadow-emerald-500/25 hover:shadow-2xl hover:shadow-emerald-500/30 transform hover:scale-[1.02] transition-all duration-300 rounded-2xl btn-shine animate-pulse-glow" 
                  onClick={() => document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <span className="flex items-center gap-2">
                    Criar meu cardápio grátis agora
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Button>
                
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="group text-lg px-8 py-7 border-2 border-gray-200 bg-white/80 backdrop-blur-sm hover:border-blue-300 hover:bg-blue-50/50 rounded-2xl transition-all duration-300" 
                  asChild
                >
                  <a href="https://cardapiogratis.online/cardapio/pizza-do-z-1" target="_blank" rel="noopener noreferrer">
                    <Play className="mr-2 h-5 w-5 text-blue-600 group-hover:scale-110 transition-transform" />
                    Ver Demonstração
                  </a>
                </Button>
              </div>

              {/* Micro-copy */}
              <p className="text-sm text-gray-500 flex items-center gap-2 justify-center lg:justify-start animate-fade-in-up animation-delay-500">
                <Clock className="w-4 h-4" />
                Pronto em 5 minutos • Funciona direto no WhatsApp
              </p>
            </div>

            {/* Mockup */}
            <div className="relative animate-fade-in-right animation-delay-200">
              {/* Glow effect behind card */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-emerald-400 rounded-3xl blur-3xl opacity-20 scale-95" />
              
              <div className="relative bg-white rounded-3xl shadow-2xl p-8 transform hover:scale-[1.02] transition-transform duration-500">
                {/* Order notification header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-6 text-white mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl backdrop-blur-sm">
                        🍕
                      </div>
                      <div>
                        <h3 className="font-bold text-xl">Pizza do Zé</h3>
                        <p className="text-sm opacity-80 flex items-center gap-1">
                          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                          Pedido #1247 • Agora
                        </p>
                      </div>
                    </div>
                    <div className="bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                      NOVO
                    </div>
                  </div>
                  
                  <div className="space-y-3 bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium">1x Pizza Margherita G</span>
                        <p className="text-xs opacity-70 mt-0.5">+ Borda recheada catupiry</p>
                      </div>
                      <span className="font-bold">R$ 52,90</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">1x Coca-Cola 2L</span>
                      <span className="font-bold">R$ 14,90</span>
                    </div>
                    <div className="border-t border-white/20 pt-3 flex justify-between items-center">
                      <span className="text-lg font-bold">Total</span>
                      <span className="text-2xl font-bold">R$ 67,80</span>
                    </div>
                  </div>
                </div>
                
                {/* Feature icons */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: "💬", label: "WhatsApp", color: "emerald" },
                    { icon: "📱", label: "Sem App", color: "blue" },
                    { icon: "📊", label: "Painel", color: "purple" },
                  ].map((feature, index) => (
                    <div 
                      key={index} 
                      className={`bg-gradient-to-br from-${feature.color}-50 to-${feature.color}-100/50 p-4 rounded-xl text-center hover:scale-105 transition-transform cursor-default`}
                    >
                      <div className="text-2xl mb-1">{feature.icon}</div>
                      <div className="text-xs font-medium text-gray-700">{feature.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Floating badges */}
              <div className="absolute -top-4 -right-4 bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 px-5 py-2.5 rounded-2xl shadow-xl font-bold text-sm animate-float flex items-center gap-2">
                <span className="text-lg">⚡</span> Automático!
              </div>
              <div className="absolute -bottom-4 -left-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-5 py-2.5 rounded-2xl shadow-xl font-bold text-sm animate-float animation-delay-500">
                🎁 Grátis até 100 pedidos/mês
              </div>

              {/* Live counter */}
              <div className="absolute top-1/2 -left-16 hidden xl:flex flex-col items-center gap-2 bg-white rounded-2xl shadow-xl p-4 animate-fade-in-left animation-delay-600">
                <Users className="w-5 h-5 text-blue-600" />
                <div className="text-2xl font-bold text-gray-900">{orderCount.toLocaleString()}</div>
                <div className="text-xs text-gray-500 text-center">pedidos<br/>este mês</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
