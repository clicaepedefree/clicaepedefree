import { ReactNode, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { Copy, CheckCheck, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AppShellProps {
  restaurant?: any;
  onLogout?: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
}

export function AppShell({ restaurant, onLogout, title, subtitle, children }: AppShellProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    if (!restaurant?.slug) return;
    const link = `${window.location.origin}/cardapio/${restaurant.slug}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast({ title: "✓ Link copiado!", description: "Cole no WhatsApp ou Instagram." });
    setTimeout(() => setCopied(false), 2000);
  };

  const openLink = () => {
    if (!restaurant?.slug) return;
    window.open(`${window.location.origin}/cardapio/${restaurant.slug}`, "_blank");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/20">
        <AppSidebar restaurantId={restaurant?.id} onLogout={onLogout} />
        <main className="flex-1 flex flex-col min-h-screen min-w-0">
          <header className="sticky top-0 z-40 h-14 lg:h-16 bg-background/95 backdrop-blur-md border-b border-border/40 flex items-center justify-between px-3 lg:px-6 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <SidebarTrigger className="flex-shrink-0" />
              {restaurant && (
                <div className="flex items-center gap-3 min-w-0">
                  {restaurant.logo_url ? (
                    <img
                      src={restaurant.logo_url}
                      alt={restaurant.name}
                      className="h-8 w-8 rounded-lg object-cover ring-2 ring-border flex-shrink-0"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary-foreground">
                        {restaurant.name?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="hidden sm:block min-w-0">
                    <h1 className="text-sm lg:text-base font-semibold text-foreground leading-tight truncate">
                      {title || restaurant.name}
                    </h1>
                    <p className="text-xs text-muted-foreground truncate">
                      {subtitle || (title ? restaurant.name : "Painel da sua loja")}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {restaurant?.slug && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyLink}
                  className="hidden sm:inline-flex gap-2 h-9 text-xs"
                >
                  {copied ? (
                    <CheckCheck className="h-4 w-4 text-whatsapp" />
                  ) : (
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span>{copied ? "Copiado!" : "Copiar Link"}</span>
                </Button>
                <Button size="sm" onClick={openLink} className="gap-2 h-9 bg-primary hover:bg-primary/90 text-xs">
                  <ExternalLink className="h-4 w-4" />
                  <span className="hidden sm:inline">Ver Cardápio</span>
                  <span className="sm:hidden">Ver</span>
                </Button>
              </div>
            )}
          </header>

          <div className="flex-1 overflow-auto">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
