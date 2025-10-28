export function SEOSection() {
  const cities = [
    "São Paulo", "Rio de Janeiro", "Belo Horizonte", "Brasília", "Fortaleza",
    "Salvador", "Curitiba", "Recife", "Porto Alegre", "Goiânia"
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-blue-50 to-white">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="text-6xl mb-6">🌎</div>
          
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Presente em todo o Brasil
          </h2>
          
          <p className="text-xl text-gray-600 leading-relaxed mb-8">
            O <strong className="text-blue-600">Cardápio Fácil</strong> ajuda restaurantes, pizzarias, hamburguerias e lanchonetes em todo o país a venderem mais. 
            Seja você de <strong>São Paulo, Rio de Janeiro, Belo Horizonte, Fortaleza</strong> ou qualquer cidade, 
            nosso sistema está pronto para o seu negócio.
          </p>

          <div className="flex flex-wrap gap-3 justify-center mb-12">
            {cities.map((city, index) => (
              <span 
                key={index} 
                className="bg-white px-4 py-2 rounded-full text-sm font-medium text-gray-700 shadow-sm border border-gray-200"
              >
                📍 {city}
              </span>
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              Solução completa para delivery e atendimento presencial
            </h3>
            
            <div className="grid md:grid-cols-2 gap-6 text-left">
              <div className="space-y-3">
                <p className="text-gray-700">
                  ✅ <strong>Cardápio digital</strong> profissional e responsivo
                </p>
                <p className="text-gray-700">
                  ✅ <strong>Pedidos no WhatsApp</strong> automáticos e formatados
                </p>
                <p className="text-gray-700">
                  ✅ <strong>Sistema para delivery</strong> completo
                </p>
              </div>
              <div className="space-y-3">
                <p className="text-gray-700">
                  ✅ <strong>Gestão de pedidos</strong> em tempo real
                </p>
                <p className="text-gray-700">
                  ✅ <strong>Controle financeiro</strong> integrado
                </p>
                <p className="text-gray-700">
                  ✅ <strong>Software para restaurante</strong> 100% online
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
