import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThumbsUp, MessageCircle, Share2 } from "lucide-react";

export const CTA_LABELS: Record<string, string> = {
  ORDER_NOW: "Pedir agora",
  LEARN_MORE: "Saiba mais",
  SHOP_NOW: "Comprar agora",
};

interface Props {
  restaurantName: string;
  logoUrl?: string | null;
  imageUrl?: string | null;
  headline: string;
  primaryText: string;
  cta: string;
  url: string;
}

export function AdPreview({ restaurantName, logoUrl, imageUrl, headline, primaryText, cta, url }: Props) {
  let host = url;
  try { host = new URL(url).host; } catch { /* keep */ }
  return (
    <Card className="overflow-hidden max-w-sm mx-auto w-full">
      <div className="flex items-center gap-2 p-3">
        <div className="h-9 w-9 rounded-full bg-muted overflow-hidden flex items-center justify-center text-xs font-bold">
          {logoUrl ? <img src={logoUrl} alt="" className="h-full w-full object-cover" /> : restaurantName.slice(0, 2)}
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">{restaurantName}</p>
          <p className="text-xs text-muted-foreground">Patrocinado</p>
        </div>
      </div>
      <p className="px-3 pb-3 text-sm whitespace-pre-line">{primaryText || "O texto principal aparecerá aqui."}</p>
      <div className="aspect-square bg-muted">
        {imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-cover" /> :
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Produto sem foto</div>}
      </div>
      <div className="flex items-center justify-between gap-3 bg-muted/60 p-3">
        <div className="min-w-0">
          <p className="text-xs uppercase text-muted-foreground truncate">{host}</p>
          <p className="text-sm font-semibold truncate">{headline || "Título do anúncio"}</p>
        </div>
        <Button size="sm" variant="secondary" className="shrink-0">{CTA_LABELS[cta] ?? "Pedir agora"}</Button>
      </div>
      <div className="flex justify-around border-t p-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5" />Curtir</span>
        <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" />Comentar</span>
        <span className="flex items-center gap-1"><Share2 className="h-3.5 w-3.5" />Compartilhar</span>
      </div>
    </Card>
  );
}
