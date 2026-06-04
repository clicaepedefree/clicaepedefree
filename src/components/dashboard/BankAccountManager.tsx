import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Clock, XCircle, Building2 } from "lucide-react";

interface Props {
  restaurant: { id: string };
}

interface Subaccount {
  id: string;
  account_type: "PF" | "PJ";
  status: "pending" | "approved" | "rejected";
  holder_name: string;
  holder_document: string;
  subaccount_id: string | null;
  subaccount_number: string | null;
  branch: string | null;
  rejection_reason: string | null;
  approved_at: string | null;
  created_at: string;
}

const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");

export function BankAccountManager({ restaurant }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [subaccount, setSubaccount] = useState<Subaccount | null>(null);

  const [accountType, setAccountType] = useState<"PF" | "PJ">("PF");
  const [form, setForm] = useState({
    fullName: "",
    motherName: "",
    document: "",
    birthDate: "",
    email: "",
    phone: "",
    companyName: "",
    tradingName: "",
    repName: "",
    repMotherName: "",
    repDocument: "",
    repBirthDate: "",
    repEmail: "",
    repPhone: "",
    zipCode: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
  });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("validapay_subaccounts")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .maybeSingle();
    setSubaccount((data as any) || null);
    setLoading(false);
  };

  useEffect(() => { load(); }, [restaurant.id]);

  const submit = async () => {
    const requiredAddress = form.zipCode && form.street && form.number && form.neighborhood && form.city && form.state;
    if (!requiredAddress) {
      toast({ title: "Preencha o endereço completo", variant: "destructive" });
      return;
    }

    let payload: any;
    if (accountType === "PF") {
      if (!form.fullName || !form.motherName || !form.document || !form.birthDate || !form.email || !form.phone) {
        toast({ title: "Preencha todos os campos", variant: "destructive" });
        return;
      }
      payload = {
        type: "PF",
        fullName: form.fullName.trim(),
        motherName: form.motherName.trim(),
        document: onlyDigits(form.document),
        birthDate: form.birthDate,
        email: form.email.trim().toLowerCase(),
        phone: onlyDigits(form.phone),
        address: {
          zipCode: onlyDigits(form.zipCode),
          street: form.street, number: form.number,
          complement: form.complement || undefined,
          neighborhood: form.neighborhood, city: form.city, state: form.state.toUpperCase(),
        },
      };
    } else {
      if (!form.companyName || !form.document || !form.email || !form.phone ||
          !form.repName || !form.repMotherName || !form.repDocument || !form.repBirthDate || !form.repEmail || !form.repPhone) {
        toast({ title: "Preencha todos os campos", variant: "destructive" });
        return;
      }
      payload = {
        type: "PJ",
        companyName: form.companyName.trim(),
        tradingName: form.tradingName || undefined,
        document: onlyDigits(form.document),
        email: form.email.trim().toLowerCase(),
        phone: onlyDigits(form.phone),
        address: {
          zipCode: onlyDigits(form.zipCode),
          street: form.street, number: form.number,
          complement: form.complement || undefined,
          neighborhood: form.neighborhood, city: form.city, state: form.state.toUpperCase(),
        },
        legalRepresentative: {
          fullName: form.repName.trim(),
          motherName: form.repMotherName.trim(),
          document: onlyDigits(form.repDocument),
          birthDate: form.repBirthDate,
          email: form.repEmail.trim().toLowerCase(),
          phone: onlyDigits(form.repPhone),
        },
      };
    }

    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("validapay-create-subaccount", {
      body: { restaurant_id: restaurant.id, payload },
    });
    setSubmitting(false);

    if (error || (data as any)?.error) {
      const msg = (data as any)?.error || error?.message || "Erro ao enviar cadastro";
      toast({ title: "Erro", description: msg, variant: "destructive" });
      return;
    }
    toast({ title: "Cadastro enviado!", description: "Aguarde a aprovação do gateway." });
    load();
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (subaccount) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" /> Conta bancária
          </CardTitle>
          <CardDescription>Subconta de pagamentos do seu restaurante.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            {subaccount.status === "approved" && (
              <Badge className="bg-green-600 hover:bg-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />Aprovada</Badge>
            )}
            {subaccount.status === "pending" && (
              <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Em análise</Badge>
            )}
            {subaccount.status === "rejected" && (
              <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Reprovada</Badge>
            )}
            <span className="text-sm text-muted-foreground">Tipo: {subaccount.account_type}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Titular: </span>{subaccount.holder_name}</div>
            <div><span className="text-muted-foreground">Documento: </span>{subaccount.holder_document}</div>
            {subaccount.subaccount_number && (
              <div><span className="text-muted-foreground">Conta: </span>{subaccount.branch}/{subaccount.subaccount_number}</div>
            )}
          </div>

          {subaccount.status === "pending" && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 p-4 text-sm">
              Seu cadastro está em análise pelo gateway. Você receberá uma confirmação assim que for aprovado.
            </div>
          )}
          {subaccount.status === "rejected" && (
            <div className="space-y-3">
              <div className="rounded-lg bg-destructive/10 border border-destructive/40 p-4 text-sm">
                <p className="font-medium text-destructive">Cadastro reprovado</p>
                <p className="mt-1">{subaccount.rejection_reason || "Verifique os dados e tente novamente."}</p>
              </div>
              <Button onClick={() => setSubaccount(null)}>Reenviar cadastro</Button>
            </div>
          )}
          {subaccount.status === "approved" && (
            <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 p-4 text-sm">
              Sua conta está liberada para receber pagamentos e fazer saques.
              A chave PIX cadastrada na Carteira precisa estar no mesmo CPF/CNPJ: <strong>{subaccount.holder_document}</strong>.
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" /> Cadastro bancário
        </CardTitle>
        <CardDescription>
          Crie sua conta de recebimentos. Após a aprovação, os pagamentos PIX dos seus clientes
          ficam no seu saldo e os saques vão direto para a chave PIX do mesmo titular.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <Label>Tipo de conta</Label>
          <Select value={accountType} onValueChange={v => setAccountType(v as "PF" | "PJ")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PF">Pessoa Física (CPF)</SelectItem>
              <SelectItem value="PJ">Pessoa Jurídica (CNPJ)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {accountType === "PF" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Label>Nome completo</Label>
              <Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Nome da mãe</Label>
              <Input value={form.motherName} onChange={e => setForm({ ...form, motherName: e.target.value })} />
            </div>
            <div>
              <Label>CPF</Label>
              <Input value={form.document} onChange={e => setForm({ ...form, document: e.target.value })} />
            </div>
            <div>
              <Label>Data de nascimento</Label>
              <Input type="date" value={form.birthDate} onChange={e => setForm({ ...form, birthDate: e.target.value })} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Celular</Label>
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(11) 91234-5678" />
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Razão social</Label>
                <Input value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} />
              </div>
              <div>
                <Label>Nome fantasia</Label>
                <Input value={form.tradingName} onChange={e => setForm({ ...form, tradingName: e.target.value })} />
              </div>
              <div>
                <Label>CNPJ</Label>
                <Input value={form.document} onChange={e => setForm({ ...form, document: e.target.value })} />
              </div>
              <div>
                <Label>E-mail da empresa</Label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label>Telefone da empresa</Label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="pt-3 border-t">
              <p className="text-sm font-medium mb-2">Representante legal</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <Label>Nome completo</Label>
                  <Input value={form.repName} onChange={e => setForm({ ...form, repName: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <Label>Nome da mãe</Label>
                  <Input value={form.repMotherName} onChange={e => setForm({ ...form, repMotherName: e.target.value })} />
                </div>
                <div>
                  <Label>CPF</Label>
                  <Input value={form.repDocument} onChange={e => setForm({ ...form, repDocument: e.target.value })} />
                </div>
                <div>
                  <Label>Data de nascimento</Label>
                  <Input type="date" value={form.repBirthDate} onChange={e => setForm({ ...form, repBirthDate: e.target.value })} />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input type="email" value={form.repEmail} onChange={e => setForm({ ...form, repEmail: e.target.value })} />
                </div>
                <div>
                  <Label>Celular</Label>
                  <Input value={form.repPhone} onChange={e => setForm({ ...form, repPhone: e.target.value })} />
                </div>
              </div>
            </div>
          </>
        )}

        <div className="pt-3 border-t">
          <p className="text-sm font-medium mb-2">Endereço</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>CEP</Label>
              <Input value={form.zipCode} onChange={e => setForm({ ...form, zipCode: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Rua</Label>
              <Input value={form.street} onChange={e => setForm({ ...form, street: e.target.value })} />
            </div>
            <div>
              <Label>Número</Label>
              <Input value={form.number} onChange={e => setForm({ ...form, number: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Complemento</Label>
              <Input value={form.complement} onChange={e => setForm({ ...form, complement: e.target.value })} />
            </div>
            <div>
              <Label>Bairro</Label>
              <Input value={form.neighborhood} onChange={e => setForm({ ...form, neighborhood: e.target.value })} />
            </div>
            <div>
              <Label>Cidade</Label>
              <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <Label>UF</Label>
              <Input maxLength={2} value={form.state} onChange={e => setForm({ ...form, state: e.target.value.toUpperCase() })} />
            </div>
          </div>
        </div>

        <Button onClick={submit} disabled={submitting} className="w-full" size="lg">
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Enviar cadastro
        </Button>
      </CardContent>
    </Card>
  );
}
