import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Plus, Receipt, RefreshCw, Search, ShoppingBag, Users, Wallet } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCustomerOverview, useCustomers, type CustomerFilters } from '@/hooks/useCustomers';
import { AppShell } from '@/components/layout/AppShell';
import { CustomerDialog } from '@/components/customers/CustomerDialog';
import { CustomerProfile } from '@/components/customers/CustomerProfile';
import { type Customer, dateLabel, maskCustomerPhone, money } from '@/lib/customers';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const initial: CustomerFilters = { search: '', registeredFrom: '', registeredTo: '', lastFrom: '', lastTo: '', sort: 'created', page: 0 };
const dateFilters = {
  registeredFrom: 'Cadastro a partir de',
  registeredTo: 'Cadastro até',
  lastFrom: 'Última compra a partir de',
  lastTo: 'Última compra até',
} as const;
const number = new Intl.NumberFormat('pt-BR');

export default function Customers() {
  const { user, restaurant, loading, logout } = useAuth();
  const [filters, setFilters] = useState(initial);
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [profile, setProfile] = useState<Customer | null>(null);
  const queryClient = useQueryClient();
  const query = useCustomers(restaurant?.id, filters);
  const overview = useCustomerOverview(restaurant?.id);
  const openedFrom = useRef<HTMLButtonElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setFilters(previous => ({ ...previous, search, page: 0 })), 250);
    return () => clearTimeout(timeout);
  }, [search]);

  if (loading) return <div className="p-8" role="status">Carregando...</div>;
  if (!user) return <Navigate to="/entrar" replace />;
  if (!restaurant) return <Navigate to="/admin" replace />;

  const update = (key: Exclude<keyof CustomerFilters, 'page' | 'search'>, value: string) =>
    setFilters(previous => ({ ...previous, [key]: value, page: 0 }));
  const total = Number(query.data?.[0]?.total_count ?? 0);
  const hasFilters = Boolean(search || filters.registeredFrom || filters.registeredTo || filters.lastFrom || filters.lastTo);
  const stats = overview.data;
  const metrics = [
    { label: 'Clientes cadastrados', value: number.format(Number(stats?.customer_count ?? 0)), icon: Users, tone: 'bg-primary/10 text-primary' },
    { label: 'Compras concluídas', value: number.format(Number(stats?.purchase_count ?? 0)), icon: ShoppingBag, tone: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300' },
    { label: 'Total em compras', value: money(Number(stats?.total_spent ?? 0)), icon: Wallet, tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
    { label: 'Ticket médio', value: money(stats?.purchase_count ? Number(stats.total_spent) / Number(stats.purchase_count) : 0), icon: Receipt, tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  ];

  const saved = (customer: Customer) => {
    void queryClient.invalidateQueries({ queryKey: ['customers', restaurant.id] });
    void queryClient.invalidateQueries({ queryKey: ['customer-overview', restaurant.id] });
    setProfile(previous => previous?.id === customer.id ? { ...previous, ...customer } : previous);
  };

  const openProfile = (customer: Customer, button: HTMLButtonElement) => {
    openedFrom.current = button;
    setProfile(customer);
  };

  return (
    <AppShell restaurant={restaurant} onLogout={logout} title="Clientes">
      <div className="mx-auto max-w-[1600px] space-y-5 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Clientes</h1>
            <p className="mt-1 text-sm text-muted-foreground">Acompanhe os cadastros e o histórico de compras da loja.</p>
          </div>
          <Button onClick={() => { setEditing(null); setDialog(true); }}><Plus className="mr-2 size-4" aria-hidden="true" /> Novo cliente</Button>
        </header>

        <section aria-labelledby="crm-overview" className="space-y-3">
          <div>
            <h2 id="crm-overview" className="text-lg font-semibold">Visão geral</h2>
            <p className="text-xs text-muted-foreground">Histórico da loja · compras finalizadas e pagas ou sem cobrança online.</p>
          </div>
          {overview.isError ? (
            <Card className="flex flex-wrap items-center justify-between gap-2 p-4">
              <p role="alert" className="text-sm">Não foi possível carregar o resumo da loja.</p>
              <Button type="button" variant="outline" size="sm" onClick={() => void overview.refetch()}>Tentar novamente</Button>
            </Card>
          ) : (
            <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-busy={overview.isPending}>
              {metrics.map(({ label, value, icon: Icon, tone }) => (
                <Card key={label} className="flex min-w-0 items-start justify-between gap-2 p-3 shadow-sm sm:p-4">
                  <div className="min-w-0">
                    <dt className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</dt>
                    <dd className="mt-1 break-words text-lg font-bold tracking-tight tabular-nums xl:text-2xl">{overview.isPending ? '—' : value}</dd>
                  </div>
                  <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${tone}`}><Icon className="size-4" aria-hidden="true" /></span>
                </Card>
              ))}
            </dl>
          )}
        </section>

        <section aria-labelledby="crm-directory" className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="space-y-4 border-b p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="crm-directory" className="text-lg font-semibold">Lista de clientes</h2>
              {query.isSuccess && <span className="text-sm text-muted-foreground" aria-live="polite">{number.format(total)} {total === 1 ? 'resultado' : 'resultados'}</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-48 flex-1">
                <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden="true" />
                <Input ref={searchInput} aria-label="Pesquisar clientes" placeholder="Buscar por nome ou telefone" value={search} maxLength={100}
                  onChange={event => setSearch(event.target.value)} className="pl-9" />
              </div>
              <Select value={filters.sort} onValueChange={value => update('sort', value)}>
                <SelectTrigger aria-label="Ordenar clientes" className="w-auto"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="created">Cadastros recentes</SelectItem>
                  <SelectItem value="purchases">Mais compras</SelectItem>
                  <SelectItem value="spent">Maior valor gasto</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" aria-label="Atualizar clientes" onClick={() => void query.refetch()}>
                <RefreshCw className="size-4" aria-hidden="true" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              {(Object.keys(dateFilters) as (keyof typeof dateFilters)[]).map(key => (
                <div key={key} className="min-w-0 space-y-1">
                  <Label htmlFor={key} className="text-xs">{dateFilters[key]}</Label>
                  <Input type="date" id={key} value={filters[key]} className="min-w-0 px-2"
                    onChange={event => update(key, event.target.value)} />
                </div>
              ))}
            </div>
            {hasFilters && <Button variant="ghost" size="sm" onClick={() => { setFilters(initial); setSearch(''); }}>Limpar filtros</Button>}
          </div>

          {query.isError ? (
            <div className="p-5"><p role="alert" className="text-sm text-destructive">Não foi possível carregar os clientes.</p>
              <Button variant="link" className="px-0" onClick={() => void query.refetch()}>Tentar novamente</Button>
            </div>
          ) : query.isLoading ? <p role="status" className="p-5 text-sm text-muted-foreground">Carregando clientes...</p>
            : query.data?.length ? (
              <>
                <div className="hidden md:block">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Cliente</TableHead><TableHead>Cadastro</TableHead><TableHead>Último pedido</TableHead>
                      <TableHead className="text-right">Compras</TableHead><TableHead className="text-right">Total gasto</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>{query.data.map(customer => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <Button variant="link" className="h-auto whitespace-normal p-0 text-left" onClick={event => openProfile(customer, event.currentTarget)}>{customer.name}</Button>
                          <p className="mt-1 text-xs text-muted-foreground">{maskCustomerPhone(customer.phone)}</p>
                        </TableCell>
                        <TableCell>{dateLabel(customer.created_at)}</TableCell><TableCell>{dateLabel(customer.last_order)}</TableCell>
                        <TableCell className="text-right tabular-nums">{number.format(customer.purchases)}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{money(customer.total_spent)}</TableCell>
                      </TableRow>
                    ))}</TableBody>
                  </Table>
                </div>
                <ul className="divide-y md:hidden">
                  {query.data.map(customer => (
                    <li key={customer.id}>
                      <button type="button" onClick={event => openProfile(customer, event.currentTarget)}
                        className="w-full space-y-2 p-4 text-left text-sm hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                        <span className="flex items-center justify-between gap-2">
                          <span className="min-w-0 break-words font-semibold">{customer.name}</span><ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        </span>
                        <span className="block text-muted-foreground">{maskCustomerPhone(customer.phone)}</span>
                        <span className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <span>Compras <strong className="text-foreground">{number.format(customer.purchases)}</strong></span>
                          <span>Total <strong className="text-foreground">{money(customer.total_spent)}</strong></span>
                          <span>Cadastro {dateLabel(customer.created_at)}</span><span>Último pedido {dateLabel(customer.last_order)}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <Users className="mx-auto mb-3 size-8" aria-hidden="true" />
                <p>{hasFilters ? 'Nenhum cliente corresponde aos filtros.' : 'Nenhum cliente encontrado nesta página.'}</p>
              </div>
            )}

          <div className="flex flex-wrap items-center justify-end gap-2 border-t p-4">
            <Button variant="outline" size="sm" disabled={filters.page === 0} onClick={() => setFilters(previous => ({ ...previous, page: previous.page - 1 }))}>Anterior</Button>
            <span className="text-sm text-muted-foreground">Página {filters.page + 1}</span>
            <Button variant="outline" size="sm" disabled={(filters.page + 1) * 25 >= total}
              onClick={() => setFilters(previous => ({ ...previous, page: previous.page + 1 }))}>Próxima</Button>
          </div>
        </section>

        <CustomerProfile customer={profile} restaurantId={restaurant.id} onClose={() => setProfile(null)}
          restoreFocus={() => (openedFrom.current?.isConnected ? openedFrom.current : searchInput.current)?.focus()}
          onEdit={customer => { setEditing(customer); setDialog(true); }} />
        <CustomerDialog open={dialog} onOpenChange={setDialog} restaurantId={restaurant.id} customer={editing} onSaved={saved} />
      </div>
    </AppShell>
  );
}
