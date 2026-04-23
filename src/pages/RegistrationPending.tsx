import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, ArrowLeft } from "lucide-react";

export default function RegistrationPending() {
  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8 text-primary-foreground">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <ArrowLeft className="h-5 w-5" />
            <span>Voltar para o início</span>
          </Link>
        </div>

        <Card className="bg-card/95 backdrop-blur-sm shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-whatsapp/10 p-4 rounded-full">
                <MessageCircle className="h-12 w-12 text-whatsapp" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Falta pouco para você ganhar o seu teste grátis!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-center text-muted-foreground text-lg">
              Entre em contato com a nossa equipe para finalizar o seu cadastro e tirar suas dúvidas sobre o Clica e Pede 👇
            </p>

            <Button
              asChild
              className="w-full h-14 text-lg font-bold bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <Link to="/criar-conta">
                <MessageCircle className="h-6 w-6 mr-2" />
                Finalizar Cadastro
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
