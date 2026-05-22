import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PixPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string | null;
  amount: number;
  onPaid: () => void;
  onExpired: () => void;
}

type PixState =
  | { status: "loading" }
  | { status: "ready"; qrcode: string; copia_cola: string; expiresAt: string }
  | { status: "paid" }
  | { status: "expired" }
  | { status: "error"; message: string };

export function PixPaymentModal({
  open,
  onOpenChange,
  orderId,
  amount,
  onPaid,
  onExpired,
}: PixPaymentModalProps) {
  const [state, setState] = useState<PixState>({ status: "loading" });
  const [secondsLeft, setSecondsLeft] = useState(300);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Create the PIX charge when modal opens
  useEffect(() => {
    if (!open || !orderId) return;
    let cancelled = false;

    (async () => {
      setState({ status: "loading" });
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validapay-create-charge`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ order_id: orderId, amount }),
          },
        );

        const payload = await res.json().catch(() => ({}));

        if (!res.ok) {
          const message = payload?.error || `Erro ao gerar PIX (${res.status})`;
          setState({ status: "error", message });
          return;
        }

        const data = payload;
        if (!data?.qrcode || !data?.copia_cola || !data?.expires_at) {
          setState({ status: "error", message: "Resposta inválida ao gerar PIX" });
          return;
        }

        if (cancelled) return;
        setState({
          status: "ready",
          qrcode: data.qrcode,
          copia_cola: data.copia_cola,
          expiresAt: data.expires_at,
        });
      } catch (e: any) {
        if (!cancelled) setState({ status: "error", message: e.message });
      }
    })();

    return () => { cancelled = true; };
  }, [open, orderId, amount]);

  // Countdown timer
  useEffect(() => {
    if (state.status !== "ready") return;
    const update = () => {
      const remaining = Math.max(0, Math.floor((new Date(state.expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) setState({ status: "expired" });
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [state]);

  // Polling for payment status
  useEffect(() => {
    if (state.status !== "ready" || !orderId) return;
    const t = setInterval(async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-pix-status?order_id=${orderId}`,
          {
            headers: {
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
          },
        );
        if (!res.ok) return;
        const json = await res.json();
        if (json.status === "pago") setState({ status: "paid" });
        if (json.status === "expirado") setState({ status: "expired" });
      } catch (e) {
        console.warn("polling error", e);
      }
    }, 4000);
    return () => clearInterval(t);
  }, [state, orderId]);

  // Notify parent when state becomes paid/expired
  useEffect(() => {
    if (state.status === "paid") {
      const t = setTimeout(() => onPaid(), 1500);
      return () => clearTimeout(t);
    }
    if (state.status === "expired") {
      const t = setTimeout(() => onExpired(), 1500);
      return () => clearTimeout(t);
    }
  }, [state.status, onPaid, onExpired]);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copiado!", description: "Cole no seu app do banco para pagar." });
    setTimeout(() => setCopied(false), 2000);
  };

  const getQrCodeSrc = (qrcode: string) => {
    if (qrcode.startsWith("data:") || qrcode.startsWith("http")) return qrcode;
    return `data:image/png;base64,${qrcode}`;
  };

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pagamento PIX</DialogTitle>
        </DialogHeader>

        {state.status === "loading" && (
          <div className="flex flex-col items-center py-12 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Gerando QR Code...</p>
          </div>
        )}

        {state.status === "ready" && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-orange-600">
              <Clock className="h-4 w-4" />
              Expira em {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </div>

            <div className="flex justify-center bg-white p-4 rounded-lg">
              <img
                src={getQrCodeSrc(state.qrcode)}
                alt="QR Code PIX"
                className="w-64 h-64"
              />
            </div>

            <div className="text-center text-2xl font-bold">
              R$ {amount.toFixed(2).replace(".", ",")}
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground text-center">
                Ou copie o código PIX:
              </p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={state.copia_cola}
                  className="flex-1 px-3 py-2 border rounded-md bg-muted text-xs truncate"
                />
                <Button size="sm" onClick={() => copyToClipboard(state.copia_cola)}>
                  {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Aguardando confirmação do pagamento... Não feche esta tela.
            </p>
          </div>
        )}

        {state.status === "paid" && (
          <div className="flex flex-col items-center py-8 gap-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <p className="text-lg font-semibold">Pagamento confirmado!</p>
            <p className="text-sm text-muted-foreground">Seu pedido foi enviado ao restaurante.</p>
          </div>
        )}

        {state.status === "expired" && (
          <div className="flex flex-col items-center py-8 gap-4">
            <XCircle className="h-16 w-16 text-destructive" />
            <p className="text-lg font-semibold">Tempo esgotado</p>
            <p className="text-sm text-muted-foreground text-center">
              O QR Code expirou. Faça o pedido novamente para gerar um novo PIX.
            </p>
          </div>
        )}

        {state.status === "error" && (
          <div className="flex flex-col items-center py-8 gap-4">
            <XCircle className="h-16 w-16 text-destructive" />
            <p className="font-semibold">Erro ao gerar pagamento</p>
            <p className="text-sm text-muted-foreground text-center">{state.message}</p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
