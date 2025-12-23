import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { ArrowLeft, ChefHat } from "lucide-react";

// Helpers de validação (CPF/CNPJ e WhatsApp)
const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");

const hasRepeatedRun = (digits: string, runLength = 4) => {
  const re = new RegExp(`(\\d)\\1{${runLength - 1},}`);
  return re.test(digits);
};

const isValidCPF = (value: string) => {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i);
  let rev = 11 - (sum % 11);
  const d1 = rev >= 10 ? 0 : rev;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i);
  rev = 11 - (sum % 11);
  const d2 = rev >= 10 ? 0 : rev;
  return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
};

const isValidCNPJ = (value: string) => {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (len: number) => {
    let sum = 0;
    const weights = len === 12
      ? [5,4,3,2,9,8,7,6,5,4,3,2]
      : [6,5,4,3,2,9,8,7,6,5,4,3,2];
    for (let i = 0; i < weights.length; i++) sum += Number(cnpj[i]) * weights[i];
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  const d1 = calc(12);
  const d2 = calc(13);
  return d1 === Number(cnpj[12]) && d2 === Number(cnpj[13]);
};

const isValidTaxId = (value: string) => {
  const digits = onlyDigits(value);
  return isValidCPF(digits) || isValidCNPJ(digits);
};

const isValidWhatsApp = (value: string) => {
  const digits = onlyDigits(value);
  if (digits.length !== 11) return false; // DDD(2) + 9 dígitos
  if (/^(\d)\1{10}$/.test(digits)) return false; // todos iguais
  if (hasRepeatedRun(digits, 4)) return false; // 4+ repetidos em sequência
  if (digits[0] === '0') return false; // DDD não pode iniciar com 0
  if (digits[2] !== '9') return false; // Celular deve iniciar com 9
  return true;
};

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const authIntentRef = useRef<"signup" | "signin" | null>(null);

  useEffect(() => {
    // Verificar se o usuário já está logado
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          navigate("/admin");
        }
      } catch (error) {
        console.error("Erro ao verificar autenticação:", error);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        const intent = authIntentRef.current;
        authIntentRef.current = null;
        navigate(intent === "signup" ? "/cadastro-pendente" : "/admin");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const restaurantName = formData.get("restaurantName") as string;
    const responsibleName = formData.get("responsibleName") as string;
    const whatsappRaw = formData.get("whatsapp") as string;
    const taxIdRaw = formData.get("taxId") as string;

    const cleanedWhats = onlyDigits(whatsappRaw);
    const cleanedTaxId = onlyDigits(taxIdRaw);

    try {
      if (!isValidTaxId(cleanedTaxId)) {
        throw new Error("CPF/CNPJ inválido. Verifique os dígitos e tente novamente.");
      }
      if (!isValidWhatsApp(cleanedWhats)) {
        throw new Error("WhatsApp inválido. Use DDD + 9 dígitos e evite repetições (ex.: 11987654321).");
      }

      authIntentRef.current = "signup";

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/cadastro-pendente`,
          data: {
            restaurant_name: restaurantName,
            responsible_name: responsibleName,
            whatsapp: cleanedWhats,
            tax_id: cleanedTaxId,
          }
        }
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          toast({
            title: "Erro",
            description: "Este email já está cadastrado. Tente fazer login.",
            variant: "destructive"
          });
          return;
        }
        throw error;
      }

      // Garante que o usuário não seja direcionado para dentro do sistema mesmo quando o Supabase cria sessão automaticamente
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore
      }

      navigate("/cadastro-pendente");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao criar conta",
        description: error.message || "Ocorreu um erro inesperado",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    authIntentRef.current = "signin";

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast({
            title: "Erro",
            description: "Email ou senha incorretos",
            variant: "destructive"
          });
          return;
        }
        if (error.message.includes("Email not confirmed")) {
          toast({
            title: "Email não confirmado",
            description: "Verifique seu email e confirme sua conta antes de fazer login",
            variant: "destructive"
          });
          return;
        }
        throw error;
      }

      toast({
        title: "Login realizado com sucesso!",
        description: "Redirecionando para o painel...",
      });

      // A navegação será feita pelo useEffect que escuta mudanças de auth
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao fazer login",
        description: error.message || "Ocorreu um erro inesperado",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/admin`,
      });

      if (error) {
        throw error;
      }

      setEmailSent(true);
      toast({
        title: "Email de recuperação enviado!",
        description: "Verifique sua caixa de entrada e siga as instruções.",
      });

      // Limpar formulário
      (e.target as HTMLFormElement).reset();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao enviar email",
        description: error.message || "Ocorreu um erro inesperado",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8 text-white">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <ArrowLeft className="h-5 w-5" />
            <span>Voltar</span>
          </Link>
        </div>

        <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <ChefHat className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Clica e Pede FREE</CardTitle>
            <CardDescription>
              Crie seu cardápio digital gratuitamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signup" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="signup">Criar Conta</TabsTrigger>
                <TabsTrigger value="signin">Entrar</TabsTrigger>
                <TabsTrigger value="recover">Recuperar</TabsTrigger>
              </TabsList>

              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="restaurantName">Nome do Restaurante</Label>
                    <Input
                      id="restaurantName"
                      name="restaurantName"
                      placeholder="Ex: Pizzaria do João"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="responsibleName">Nome do Responsável</Label>
                    <Input
                      id="responsibleName"
                      name="responsibleName"
                      placeholder="Ex: João Silva"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="taxId">CPF ou CNPJ</Label>
                    <Input
                      id="taxId"
                      name="taxId"
                      placeholder="Somente números"
                      inputMode="numeric"
                      required
                    />
                    <p className="text-sm text-muted-foreground">Validamos automaticamente (CPF ou CNPJ).</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp (com DDD)</Label>
                    <Input
                      id="whatsapp"
                      name="whatsapp"
                      placeholder="Ex: 11987654321"
                      inputMode="numeric"
                      maxLength={11}
                      required
                    />
                    <p className="text-sm text-muted-foreground">Use DDD + 9 dígitos e evite 4+ números iguais seguidos.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="seu@email.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      minLength={6}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Criando conta..." : "Criar Conta Grátis"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signin" className="space-y-4">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      name="email"
                      type="email"
                      placeholder="seu@email.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Senha</Label>
                    <Input
                      id="signin-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Entrando..." : "Entrar"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="recover" className="space-y-4">
                {emailSent ? (
                  <div className="text-center space-y-4">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-green-800 mb-2">Email Enviado!</h3>
                      <p className="text-green-700 text-sm">
                        Enviamos um link de recuperação para seu email. 
                        Verifique sua caixa de entrada (e também o spam) e siga as instruções.
                      </p>
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setEmailSent(false)}
                    >
                      Enviar novamente
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handlePasswordReset} className="space-y-4">
                    <div className="text-center mb-4">
                      <h3 className="font-semibold text-gray-800 mb-2">Recuperar Senha</h3>
                      <p className="text-sm text-muted-foreground">
                        Digite seu email e enviaremos um link para redefinir sua senha.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recover-email">Email</Label>
                      <Input
                        id="recover-email"
                        name="email"
                        type="email"
                        placeholder="seu@email.com"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Enviando..." : "Enviar Link de Recuperação"}
                    </Button>
                  </form>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}