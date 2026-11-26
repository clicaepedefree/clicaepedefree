import { type ReactNode, useState } from "react";
import { ChevronDown, Copy, CheckCheck, ExternalLink, LogOut, ShoppingBag, UserRound } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { AppSidebar } from "./AppSidebar";

interface AppShellProps {
  restaurant?: { id: string; name: string; slug?: string | null; logo_url?: string | null };
  onLogout?: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
}

export function AppShell({ restaurant, onLogout, title, subtitle, children }: AppShellProps) {
  const { toast } = useToast();
  const { pathname } = useLocation();
  const menuPath = restaurant?.slug ? `/cardapio/${restaurant.slug}` : null;
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const copyLink = async () => {
    if (!menuPath) return;
    try {
      await navigator.clipboard.writeText(new URL(menuPath, window.location.origin).href);
      setCopiedPath(menuPath);
      toast({ title: "Link do cardápio copiado" });
    } catch {
      toast({ title: "Não foi possível copiar o link", variant: "destructive" });
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar restaurantId={restaurant?.id} />
      <div className="flex min-w-0 flex-1 flex-col bg-muted/40">
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-2 border-b bg-background/95 px-3 backdrop-blur md:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger aria-label="Alternar menu lateral" className="size-10 shrink-0" />
            <div className="min-w-0 border-l pl-3 leading-tight">
              <p className="truncate text-sm font-semibold">{title || (pathname === "/admin/orders" ? "Pedidos" : "Painel")}</p>
              {(subtitle || restaurant?.name) && (
                <p className="hidden truncate text-xs text-muted-foreground sm:block">{subtitle || restaurant?.name}</p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {restaurant && (
              <Button asChild size="sm" variant={pathname === "/admin/orders" ? "secondary" : "default"} className="h-9 gap-1.5">
                <Link to="/admin/orders" aria-current={pathname === "/admin/orders" ? "page" : undefined} aria-label="Gestor de pedidos">
                  <ShoppingBag className="size-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Gestor de pedidos</span>
                </Link>
              </Button>
            )}
            {menuPath && (
              <Button asChild variant="outline" size="sm" className="hidden h-9 gap-1.5 lg:inline-flex">
                <a href={menuPath} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-4" aria-hidden="true" /> Ver cardápio
                </a>
              </Button>
            )}
            {(restaurant || onLogout) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" aria-label="Menu da conta" className="h-10 gap-1.5 px-1.5">
                    {restaurant?.logo_url ? (
                      <img src={restaurant.logo_url} alt="" className="size-8 rounded-lg border object-cover" />
                    ) : (
                      <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary"><UserRound className="size-4" aria-hidden="true" /></span>
                    )}
                    <ChevronDown className="size-3 text-muted-foreground" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate">{restaurant?.name || "Minha conta"}</DropdownMenuLabel>
                  {menuPath && <>
                    <DropdownMenuItem asChild>
                      <a href={menuPath} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 size-4" aria-hidden="true" /> Ver cardápio</a>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => void copyLink()}>
                      {copiedPath === menuPath ? <CheckCheck className="mr-2 size-4" aria-hidden="true" /> : <Copy className="mr-2 size-4" aria-hidden="true" />}
                      {copiedPath === menuPath ? "Link copiado" : "Copiar link do cardápio"}
                    </DropdownMenuItem>
                  </>}
                  {onLogout && <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={onLogout}><LogOut className="mr-2 size-4" aria-hidden="true" /> Sair da conta</DropdownMenuItem>
                  </>}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>
        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      </div>
    </SidebarProvider>
  );
}
