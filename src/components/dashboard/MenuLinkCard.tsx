import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, CheckCheck, ExternalLink, Share2, QrCode, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MenuLinkCardProps {
  restaurant: any;
}

export function MenuLinkCard({ restaurant }: MenuLinkCardProps) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const { toast } = useToast();

  const link = `${window.location.origin}/cardapio/${restaurant.slug}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(link)}`;

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast({ title: "✓ Link copiado!", description: "Agora é só colar no WhatsApp ou Instagram." });
    setTimeout(() => setCopied(false), 2500);
  };

  const shareWhats = () => {
    const text = `Olá! Confira nosso cardápio e faça seu pedido aqui: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    localStorage.setItem(`link_shared_${restaurant.id}`, "1");
  };

  const downloadQr = () => {
    const a = document.createElement("a");
    a.href = qrUrl;
    a.download = `qrcode-${restaurant.slug}.png`;
    a.target = "_blank";
    a.click();
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-whatsapp/5 overflow-hidden">
      <CardContent className="p-5 lg:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-5">
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center">
                <Share2 className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-base lg:text-lg font-bold text-foreground">Seu link do cardápio</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Compartilhe este link com seus clientes para receber pedidos.
            </p>

            <div className="flex items-center gap-2 p-3 bg-background rounded-xl border border-border mb-3 overflow-hidden">
              <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-mono text-foreground truncate flex-1">{link}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={shareWhats} className="bg-whatsapp hover:bg-whatsapp/90 text-white gap-2 h-11 flex-1 sm:flex-initial">
                <Share2 className="h-4 w-4" />
                Compartilhar no WhatsApp
              </Button>
              <Button onClick={copy} variant="outline" className="gap-2 h-11">
                {copied ? <CheckCheck className="h-4 w-4 text-whatsapp" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copiado!" : "Copiar"}
              </Button>
              <Button onClick={() => setShowQr(v => !v)} variant="outline" className="gap-2 h-11">
                <QrCode className="h-4 w-4" />
                {showQr ? "Ocultar QR" : "Ver QR Code"}
              </Button>
            </div>
          </div>

          {/* QR */}
          {showQr && (
            <div className="flex flex-col items-center gap-2 p-4 bg-background rounded-xl border border-border">
              <img src={qrUrl} alt="QR Code do cardápio" className="w-40 h-40 lg:w-44 lg:h-44" />
              <p className="text-xs text-muted-foreground text-center">Imprima e cole na sua loja</p>
              <Button size="sm" variant="outline" onClick={downloadQr} className="gap-1.5">
                <Download className="h-3.5 w-3.5" />
                Baixar QR
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
