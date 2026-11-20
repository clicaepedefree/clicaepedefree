import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useCustomers, CustomerFilters } from '@/hooks/useCustomers';
import { AppShell } from '@/components/layout/AppShell';
import { CustomerDialog } from '@/components/customers/CustomerDialog';
import { CustomerProfile } from '@/components/customers/CustomerProfile';
import { Customer, dateLabel, money } from '@/lib/customers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Users, RefreshCw } from 'lucide-react';

const initial: CustomerFilters = { search: '', registeredFrom: '', registeredTo: '', lastFrom: '', lastTo: '', sort: 'created', page: 0 };
export default function Customers() {
  const { user, restaurant, loading, logout } = useAuth();
  const [filters, setFilters] = useState(initial);
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [profile, setProfile] = useState<Customer | null>(null);
  const queryClient = useQueryClient();
  const query = useCustomers(restaurant?.id, filters);
  useEffect(() => { const timeout = setTimeout(() => setFilters(prev => ({ ...prev, search, page: 0 })), 250); return () => clearTimeout(timeout); }, [search]);
  if (loading) return <div className="p-8">Carregando...</div>;
  if (!user) return <Navigate to="/entrar" replace />;
  if (!restaurant) return <Navigate to="/admin" replace />;
  const update = (key: keyof CustomerFilters, value: string) => setFilters(prev => ({ ...prev, [key]: value, page: 0 }));
  const total = query.data?.[0]?.total_count || 0;
  const saved = (customer: Customer) => { queryClient.invalidateQueries({ queryKey: ['customers', restaurant.id] }); if (profile?.id === customer.id) setProfile({ ...profile, ...customer }); };
  return <AppShell restaurant={restaurant} onLogout={logout} title="Clientes"><div className="p-4 lg:p-8 space-y-6">
    <div className="flex justify-between items-center gap-3"><div><h2 className="text-2xl font-semibold">Clientes</h2><p className="text-sm text-muted-foreground">{total} cadastros</p></div><Button onClick={() => { setEditing(null); setDialog(true); }}><Plus className="h-4 w-4 mr-2" />Novo Cliente</Button></div>
    <div className="space-y-4 border-b pb-5"><div className="flex flex-col sm:flex-row gap-3"><div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Pesquisar clientes" placeholder="Buscar por nome ou telefone" value={search} maxLength={100} onChange={event => setSearch(event.target.value)} className="pl-9" /></div><Select value={filters.sort} onValueChange={value => update('sort', value)}><SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="created">Cadastros recentes</SelectItem><SelectItem value="purchases">Mais compras</SelectItem><SelectItem value="spent">Maior valor gasto</SelectItem></SelectContent></Select><Button variant="outline" size="icon" aria-label="Atualizar clientes" onClick={() => query.refetch()}><RefreshCw className="h-4 w-4" /></Button></div><div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{(['registeredFrom', 'registeredTo', 'lastFrom', 'lastTo'] as const).map(key => <div key={key}><Label htmlFor={key} className="text-xs">{({ registeredFrom: 'Cadastro a partir de', registeredTo: 'Cadastro até', lastFrom: 'Última compra a partir de', lastTo: 'Última compra até' })[key]}</Label><Input type="date" id={key} value={filters[key]} onChange={event => update(key, event.target.value)} /></div>)}</div>{Object.entries(filters).some(([key, value]) => key !== 'sort' && key !== 'page' && value) && <Button variant="ghost" size="sm" onClick={() => { setFilters(initial); setSearch(''); }}>Limpar filtros</Button>}</div>
    {query.isError ? <p className="text-destructive" role="alert">Não foi possível carregar os clientes. <Button variant="link" onClick={() => query.refetch()}>Tentar novamente</Button></p> : query.isLoading ? <p>Carregando clientes...</p> : query.data?.length ? <Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Cadastro</TableHead><TableHead>Último pedido</TableHead><TableHead className="text-right">Compras</TableHead><TableHead className="text-right">Total gasto</TableHead></TableRow></TableHeader><TableBody>{query.data.map(customer => <TableRow key={customer.id}><TableCell><Button variant="link" className="h-auto p-0 text-left" onClick={() => setProfile(customer)}>{customer.name}</Button><p className="text-xs text-muted-foreground mt-1">{customer.phone}</p></TableCell><TableCell>{dateLabel(customer.created_at)}</TableCell><TableCell>{dateLabel(customer.last_order)}</TableCell><TableCell className="text-right">{customer.purchases}</TableCell><TableCell className="text-right font-medium">{money(customer.total_spent)}</TableCell></TableRow>)}</TableBody></Table> : <div className="py-16 text-center text-muted-foreground"><Users className="mx-auto h-10 w-10 mb-3" /><p>Nenhum cliente encontrado.</p></div>}
    <div className="flex justify-end items-center gap-3"><Button variant="outline" size="sm" disabled={filters.page === 0} onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}>Anterior</Button><span className="text-sm">Página {filters.page + 1}</span><Button variant="outline" size="sm" disabled={(filters.page + 1) * 25 >= total} onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}>Próxima</Button></div>
    <CustomerProfile customer={profile} restaurantId={restaurant.id} onClose={() => setProfile(null)} onEdit={customer => { setEditing(customer); setDialog(true); }} /><CustomerDialog open={dialog} onOpenChange={setDialog} restaurantId={restaurant.id} customer={editing} onSaved={saved} />
  </div></AppShell>;
}