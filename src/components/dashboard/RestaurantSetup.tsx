import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { Store } from "lucide-react";

interface RestaurantSetupProps {
  user: User;
  onRestaurantCreated: (restaurant: any) => void;
}

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

export function RestaurantSetup({ user, onRestaurantCreated }: RestaurantSetupProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const restaurantName = formData.get("restaurantName") as string;
      const whatsappRaw = formData.get("whatsapp") as string;
      const taxIdRaw = formData.get("taxId") as string;

      const cleanedTaxId = onlyDigits(taxIdRaw);
      const cleanedWhats = onlyDigits(whatsappRaw);

      if (!isValidTaxId(cleanedTaxId)) {
        throw new Error("CPF/CNPJ inválido. Verifique os dígitos e tente novamente.");
      }

      if (!isValidWhatsApp(cleanedWhats)) {
        throw new Error("WhatsApp inválido. Use DDD + 9 dígitos e evite repetições (ex.: 11999999999).");
      }

      // Gerar slug único
      const { data: slugData, error: slugError } = await supabase
        .rpc('generate_unique_slug', { restaurant_name: restaurantName });

      if (slugError) throw slugError;

      // Criar restaurante
      const { data, error } = await supabase
        .from('restaurants')
        .insert({
          user_id: user.id,
          name: restaurantName,
          whatsapp: cleanedWhats,
          tax_id: cleanedTaxId,
          slug: slugData
        } as any)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Restaurante criado com sucesso!",
        description: `Seu link público: ${window.location.origin}/cardapio/${data.slug}`,
      });

      onRestaurantCreated(data);
    } catch (error: any) {
      console.error('Erro ao criar restaurante:', error);
      toast({
        variant: "destructive",
        title: "Erro ao criar restaurante",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <Store className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Configure seu restaurante</CardTitle>
          <CardDescription>
            Vamos criar o perfil do seu restaurante para começar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="restaurantName">Nome do Restaurante</Label>
              <Input
                id="restaurantName"
                name="restaurantName"
                placeholder="Ex: Pizzaria do João"
                defaultValue={user.user_metadata?.restaurant_name || ""}
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
              <p className="text-sm text-muted-foreground">
                Validamos automaticamente (CPF ou CNPJ).
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp (com DDD)</Label>
              <Input
                id="whatsapp"
                name="whatsapp"
                placeholder="Ex: 11987654321"
                inputMode="numeric"
                maxLength={11}
                defaultValue={user.user_metadata?.whatsapp || ""}
                required
              />
              <p className="text-sm text-muted-foreground">
                Use DDD + 9 dígitos e evite 4+ números iguais seguidos.
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Criando..." : "Criar Restaurante"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}