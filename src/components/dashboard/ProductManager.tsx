import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Settings2, Search, LayoutGrid, List, ImageOff, RefreshCw, Check } from "lucide-react";
import { MenuImporter } from "./MenuImporter";
import { deleteStorageImage } from "@/lib/storage-utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { CurrencyInput, currencyToNumber, numberToCurrency } from "@/components/ui/currency-input";
import { ImageUpload } from "./ImageUpload";
import { Link } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface ProductManagerProps {
  restaurant: any;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category_id: string;
  image_url?: string;
  is_active: boolean;
  is_featured?: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface Category {
  id: string;
  name: string;
}

interface AddonGroup {
  id: string;
  name: string;
  selection_type: string;
  is_required: boolean;
}

export function ProductManager({ restaurant }: ProductManagerProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [addonGroups, setAddonGroups] = useState<AddonGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editorTab, setEditorTab] = useState("info");
  const [viewChoice, setView] = useState<"table" | "cards" | null>(null);
  const isMobile = useIsMobile();
  const view = viewChoice ?? (isMobile ? "cards" : "table");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");
  const [sort, setSort] = useState("display");
  const [page, setPage] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [savingProduct, setSavingProduct] = useState<string | null>(null);
  const [addonState, setAddonState] = useState<"loading" | "ready" | "error">("ready");
  const addonLoad = useRef(0);
  const [originalAddonGroups, setOriginalAddonGroups] = useState<string[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedAddonGroups, setSelectedAddonGroups] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category_id: "",
    image_url: "",
    is_active: true,
    is_featured: false,
    display_order: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    if (restaurant?.id) {
      fetchProducts();
      fetchCategories();
      fetchAddonGroups();
    }
  }, [restaurant?.id]);

  const fetchProducts = async () => {
    try {
      const catalog: Product[] = [];
      const chunkSize = 500;
      for (let offset = 0; ; offset += chunkSize) {
        const { data, error } = await supabase.from('products').select('*').eq('restaurant_id', restaurant.id)
          .order('display_order', { ascending: true }).order('id').range(offset, offset + chunkSize - 1);
        if (error) throw error;
        catalog.push(...data);
        if (data.length < chunkSize) break;
      }
      setProducts(catalog);
      setLoadFailed(false);
    } catch (error) {
      setLoadFailed(true);
      toast({
        title: "Erro ao carregar produtos",
        description: "Não foi possível carregar os produtos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAddonGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('addon_groups')
        .select('id, name, selection_type, is_required')
        .eq('restaurant_id', restaurant.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setAddonGroups(data || []);
    } catch (error) {
      console.error("Erro ao carregar grupos de addon:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('restaurant_id', restaurant.id)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      category_id: "",
      image_url: "",
      is_active: true,
      is_featured: false,
      display_order: ""
    });
    setEditingProduct(null);
  };

  const loadProductAddons = async (productId: string) => {
    const request = ++addonLoad.current;
    setAddonState("loading");
    const { data, error } = await supabase.from('product_addon_groups').select('addon_group_id')
      .eq('product_id', productId);
    if (request !== addonLoad.current) return;
    if (error) { setAddonState("error"); return; }
    const associated = data.map(item => item.addon_group_id);
    setOriginalAddonGroups(associated);
    setSelectedAddonGroups(associated);
    setAddonState("ready");
  };

  const openEditDialog = (product: Product, tab = "info") => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      price: numberToCurrency(product.price),
      category_id: product.category_id,
      image_url: product.image_url || "",
      is_active: Boolean(product.is_active),
      is_featured: Boolean(product.is_featured),
      display_order: String(product.display_order ?? 0),
    });
    setEditorTab(tab);
    setSelectedAddonGroups([]);
    setOriginalAddonGroups([]);
    setDialogOpen(true);
    void loadProductAddons(product.id);
  };

  const openNew = () => {
    addonLoad.current++;
    resetForm();
    setEditorTab("info");
    setOriginalAddonGroups([]);
    setSelectedAddonGroups([]);
    setAddonState("ready");
    setDialogOpen(true);
  };

  const saveAddons = async (productId: string) => {
    const additions = selectedAddonGroups.filter(id => !originalAddonGroups.includes(id));
    const removals = originalAddonGroups.filter(id => !selectedAddonGroups.includes(id));
    if (additions.length) {
      const { error } = await supabase.from('product_addon_groups').upsert(
        additions.map(addon_group_id => ({ product_id: productId, addon_group_id })),
        { onConflict: 'product_id,addon_group_id', ignoreDuplicates: true },
      );
      if (error) throw error;
      setOriginalAddonGroups(previous => [...previous, ...additions]);
    }
    if (removals.length) {
      const { error } = await supabase.from('product_addon_groups').delete()
        .eq('product_id', productId).in('addon_group_id', removals);
      if (error) throw error;
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    if (!formData.name.trim() || !formData.price || !formData.category_id) {
      setEditorTab("info");
      toast({ title: "Preencha nome, preço e categoria", variant: "destructive" });
      return;
    }
    const payload = {
      name: formData.name.trim(),
      description: formData.description || null,
      price: currencyToNumber(formData.price),
      category_id: formData.category_id,
      image_url: formData.image_url || null,
      is_active: formData.is_active,
      is_featured: formData.is_featured,
      display_order: Math.max(0, Number.parseInt(formData.display_order, 10) || 0),
      restaurant_id: restaurant.id,
    };
    setSaving(true);
    let productSaved = false;
    try {
      const result = editingProduct
        ? await supabase.from('products').update(payload).eq('id', editingProduct.id)
            .eq('restaurant_id', restaurant.id).select().single()
        : await supabase.from('products').insert(payload).select().single();
      if (result.error) throw result.error;
      const saved = result.data;
      productSaved = true;
      const oldImage = editingProduct?.image_url;
      setEditingProduct(saved);
      if (oldImage && oldImage !== saved.image_url) void deleteStorageImage(oldImage);
      if (addonState === "ready") await saveAddons(saved.id);
      setDialogOpen(false);
      toast({ title: editingProduct ? "Produto atualizado" : "Produto criado" });
    } catch {
      toast({
        title: productSaved ? "Produto salvo. Não foi possível salvar todos os complementos." : "Não foi possível salvar o produto.",
        variant: "destructive",
      });
    } finally {
      if (productSaved) void fetchProducts();
      setSaving(false);
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;

    try {
      // Find the product to get its image URL before deleting
      const productToDelete = products.find(p => p.id === productId);
      
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId).eq('restaurant_id', restaurant.id).select('id').single();

      if (error) throw error;

      // Delete image from storage after successful DB delete
      if (productToDelete?.image_url) {
        await deleteStorageImage(productToDelete.image_url);
      }
      
      toast({
        title: "Produto excluído",
        description: "Produto removido com sucesso"
      });
      
      fetchProducts();
    } catch (error) {
      toast({
        title: "Erro ao excluir produto",
        description: "Não foi possível excluir o produto",
        variant: "destructive"
      });
    }
  };

  const updateProductFlag = async (productId: string, flag: "is_active" | "is_featured", value: boolean) => {
    if (savingProduct) return;
    setSavingProduct(productId);
    try {
      const changes = flag === 'is_active' ? { is_active: value } : { is_featured: value };
      const { error } = await supabase.from('products').update(changes)
        .eq('id', productId).eq('restaurant_id', restaurant.id).select('id').single();
      if (error) throw error;
      setProducts(previous => previous.map(product => product.id === productId ? { ...product, [flag]: value } : product));
    } catch {
      toast({ title: "Não foi possível atualizar o produto", variant: "destructive" });
    } finally {
      setSavingProduct(null);
    }
  };

  const getCategoryName = (categoryId: string) => categories.find(category => category.id === categoryId)?.name ?? "Sem categoria";
  const normalized = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR");
  const searchTerm = normalized(search.trim());
  const filtered = products.filter(product => {
    const textMatches = normalized(`${product.name} ${product.description ?? ""}`).includes(searchTerm);
    return textMatches && (categoryFilter === "all" || product.category_id === categoryFilter)
      && (priceFilter === "all" || (priceFilter === "free" ? !product.price : product.price > 0));
  }).sort((a, b) => {
    if (sort === "price-asc") return a.price - b.price;
    if (sort === "price-desc") return b.price - a.price;
    if (sort === "name") return a.name.localeCompare(b.name, "pt-BR");
    return (a.display_order ?? 0) - (b.display_order ?? 0);
  });
  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleProducts = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const clearFilters = () => { setSearch(""); setCategoryFilter("all"); setPriceFilter("all"); setSort("display"); setPage(0); };

  const productImage = (product: Product, className: string) => (
    <span className={`grid shrink-0 place-items-center overflow-hidden rounded-lg bg-muted text-muted-foreground ${className}`}>
      {product.image_url ? <img src={product.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
        : <ImageOff className="size-5" aria-hidden="true" />}
    </span>
  );

  const productSwitch = (product: Product, flag: "is_active" | "is_featured") => (
    <Switch aria-label={flag === "is_active" ? `Produto ativo: ${product.name}` : `Destaque: ${product.name}`}
      checked={Boolean(product[flag])} disabled={savingProduct !== null}
      onCheckedChange={value => void updateProductFlag(product.id, flag, value)} />
  );

  const productActions = (product: Product) => (
    <div className="flex justify-end gap-1">
      <Button variant="outline" size="icon" className="size-9" aria-label={`Editar ${product.name}`} title="Editar produto" onClick={() => openEditDialog(product)}>
        <Edit className="size-4" aria-hidden="true" />
      </Button>
      <Button variant="outline" size="icon" className="size-9" aria-label={`Complementos de ${product.name}`} title="Gerenciar complementos" onClick={() => openEditDialog(product, "addons")}>
        <Settings2 className="size-4" aria-hidden="true" />
      </Button>
      <Button variant="ghost" size="icon" className="size-9 text-destructive" aria-label={`Excluir ${product.name}`} title="Excluir produto" onClick={() => void deleteProduct(product.id)}>
        <Trash2 className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );

  return (
    <Card className="overflow-hidden shadow-sm">
      <div className="space-y-4 p-4 sm:p-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Gerenciar produtos</h2>
            <p className="mt-1 text-sm text-muted-foreground">{products.length} {products.length === 1 ? "produto no catálogo" : "produtos no catálogo"}</p>
          </div>
          <div role="group" aria-label="Visualização dos produtos" className="flex gap-1 rounded-lg border bg-muted/50 p-1">
            <Button type="button" size="sm" variant={view === "cards" ? "default" : "ghost"} aria-pressed={view === "cards"} onClick={() => setView("cards")}>
              <LayoutGrid className="mr-1 size-4" aria-hidden="true" /> Cartões
            </Button>
            <Button type="button" size="sm" variant={view === "table" ? "default" : "ghost"} aria-pressed={view === "table"} onClick={() => setView("table")}>
              <List className="mr-1 size-4" aria-hidden="true" /> Tabela
            </Button>
          </div>
        </header>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={openNew}><Plus className="mr-2 size-4" aria-hidden="true" /> Novo produto</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline">Opções</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={clearFilters}>Limpar filtros</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void fetchProducts()}>Atualizar catálogo</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <MenuImporter restaurantId={restaurant.id} onImportComplete={() => { void fetchProducts(); void fetchCategories(); }}
            hasExistingData={products.length > 0 || categories.length > 0} />
        </div>
        <div className="grid gap-2 rounded-xl border bg-muted/30 p-3 sm:grid-cols-2 xl:grid-cols-[minmax(14rem,1.5fr)_repeat(3,minmax(0,1fr))]">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden="true" />
            <Input className="bg-background pl-9" aria-label="Pesquisar produtos" placeholder="Pesquisar por nome ou descrição"
              value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} />
          </div>
          <Select value={categoryFilter} onValueChange={value => { setCategoryFilter(value); setPage(0); }}>
            <SelectTrigger aria-label="Filtrar por categoria" className="bg-background"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map(category => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={priceFilter} onValueChange={value => { setPriceFilter(value); setPage(0); }}>
            <SelectTrigger aria-label="Filtrar por preço" className="bg-background"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos os preços</SelectItem><SelectItem value="paid">Com preço</SelectItem><SelectItem value="free">Preço zero</SelectItem></SelectContent>
          </Select>
          <Select value={sort} onValueChange={value => { setSort(value); setPage(0); }}>
            <SelectTrigger aria-label="Ordenar produtos" className="bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="display">Ordem de exibição</SelectItem><SelectItem value="name">Nome A–Z</SelectItem>
              <SelectItem value="price-asc">Menor preço</SelectItem><SelectItem value="price-desc">Maior preço</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? <p className="p-5 text-sm text-muted-foreground" role="status">Carregando produtos...</p>
        : loadFailed ? (
          <div className="space-y-2 border-t p-5">
            <p role="alert" className="text-sm text-destructive">Não foi possível carregar os produtos.</p>
            <Button variant="outline" onClick={() => void fetchProducts()}><RefreshCw className="mr-2 size-4" /> Tentar novamente</Button>
          </div>
        ) : !visibleProducts.length ? (
          <div className="space-y-2 border-t p-6 text-sm text-muted-foreground">
            <p>{products.length ? "Nenhum produto corresponde aos filtros." : "Nenhum produto cadastrado."}</p>
            {!categories.length && <Link className="font-medium text-primary underline" to="/admin/settings?tab=categories">Criar uma categoria</Link>}
          </div>
        ) : view === "table" ? (
          <Table className="min-w-[720px] border-t">
            <TableHeader className="bg-muted/40"><TableRow>
              <TableHead>Imagem</TableHead><TableHead>Produto</TableHead><TableHead>Categoria</TableHead><TableHead>Preço</TableHead>
              <TableHead>Ativo</TableHead><TableHead>Destaque</TableHead><TableHead className="text-right">Ações</TableHead>
            </TableRow></TableHeader>
            <TableBody>{visibleProducts.map(product => (
              <TableRow key={product.id}>
                <TableCell>{productImage(product, "size-12")}</TableCell>
                <TableCell><button type="button" className="text-left font-semibold hover:underline" onClick={() => openEditDialog(product)}>{product.name}</button></TableCell>
                <TableCell><Badge variant="secondary">{getCategoryName(product.category_id)}</Badge></TableCell>
                <TableCell className="whitespace-nowrap font-semibold tabular-nums">R$ {numberToCurrency(product.price)}</TableCell>
                <TableCell>{productSwitch(product, "is_active")}</TableCell><TableCell>{productSwitch(product, "is_featured")}</TableCell>
                <TableCell>{productActions(product)}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        ) : (
          <div className="grid gap-3 border-t p-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 sm:p-6">
            {visibleProducts.map(product => (
              <Card key={product.id} className="overflow-hidden">
                {productImage(product, "aspect-video w-full rounded-none")}
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap justify-between gap-2">
                    <button type="button" className="text-left font-semibold hover:underline" onClick={() => openEditDialog(product)}>{product.name}</button>
                    <span className="font-semibold text-primary">R$ {numberToCurrency(product.price)}</span>
                  </div>
                  <Badge variant="secondary">{getCategoryName(product.category_id)}</Badge>
                  <div className="flex flex-wrap justify-between gap-2 text-xs">
                    <span className="flex items-center gap-2">Ativo {productSwitch(product, "is_active")}</span>
                    <span className="flex items-center gap-2">Destaque {productSwitch(product, "is_featured")}</span>
                  </div>
                  {productActions(product)}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

      {filtered.length > 0 && (
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t p-4 text-sm text-muted-foreground">
          <span>{filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}</span>
          {pageCount > 1 && <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Anterior</Button>
            <span>Página {currentPage + 1} de {pageCount}</span>
            <Button size="sm" variant="outline" disabled={currentPage + 1 === pageCount} onClick={() => setPage(currentPage + 1)}>Próxima</Button>
          </div>}
        </footer>
      )}

      <Dialog open={dialogOpen} onOpenChange={open => { if (!saving) { if (!open) addonLoad.current++; setDialogOpen(open); } }}>
        <DialogContent className="flex max-h-[92dvh] w-[96vw] max-w-5xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b px-4 py-4 pr-10 sm:px-6">
            <DialogTitle>{editingProduct ? "Editar produto" : "Novo produto"}</DialogTitle>
            <DialogDescription>{editingProduct?.name || "Cadastre um item no catálogo."}</DialogDescription>
          </DialogHeader>
          <form noValidate onSubmit={handleSubmit} className="flex min-h-0 flex-col">
            <Tabs value={editorTab} onValueChange={setEditorTab} className="flex min-h-0 flex-col">
              <div className="overflow-x-auto border-b px-2 sm:px-4">
                <TabsList className="h-auto min-w-max gap-1 rounded-none bg-transparent p-1.5">
                  <TabsTrigger value="info">Informações</TabsTrigger>
                  <TabsTrigger value="addons">Complementos</TabsTrigger>
                  <TabsTrigger value="availability">Disponibilidade</TabsTrigger>
                </TabsList>
              </div>
              <div className="min-h-0 overflow-y-auto p-4 sm:p-6">
                <TabsContent value="info" className="mt-0 grid gap-5 sm:grid-cols-[minmax(11rem,1fr)_2fr]">
                  <div className="min-w-0 space-y-2">
                    <p className="text-sm font-semibold">Imagem principal</p>
                    <ImageUpload currentUrl={formData.image_url} onImageUploaded={image_url => setFormData(previous => ({ ...previous, image_url }))}
                      type="banner" restaurantId={restaurant.id} />
                  </div>
                  <fieldset disabled={saving} className="grid min-w-0 gap-4 sm:grid-cols-2">
                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor="product-name">Nome *</Label>
                      <Input id="product-name" value={formData.name} onChange={event => setFormData(previous => ({ ...previous, name: event.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="product-category">Categoria *</Label>
                      <Select value={formData.category_id} onValueChange={category_id => setFormData(previous => ({ ...previous, category_id }))}>
                        <SelectTrigger id="product-category"><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
                        <SelectContent>{categories.map(category => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="product-price">Preço *</Label>
                      <CurrencyInput id="product-price" value={formData.price} onChange={price => setFormData(previous => ({ ...previous, price }))} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="product-display-order">Ordem de exibição</Label>
                      <Input id="product-display-order" type="number" min="0" value={formData.display_order}
                        onChange={event => setFormData(previous => ({ ...previous, display_order: event.target.value }))} placeholder="0" />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor="product-description">Descrição</Label>
                      <Textarea id="product-description" rows={4} value={formData.description}
                        onChange={event => setFormData(previous => ({ ...previous, description: event.target.value }))} />
                    </div>
                  </fieldset>
                </TabsContent>
                <TabsContent value="addons" className="mt-0 space-y-3">
                  {addonState === "loading" ? <p role="status" className="text-sm">Carregando complementos...</p>
                    : addonState === "error" ? (
                      <div className="space-y-2"><p role="alert" className="text-sm text-destructive">Não foi possível carregar os complementos do produto.</p>
                        {editingProduct && <Button type="button" variant="outline" onClick={() => void loadProductAddons(editingProduct.id)}>Tentar novamente</Button>}
                      </div>
                    ) : !addonGroups.length ? <p className="text-sm text-muted-foreground">Cadastre um grupo na tela de Complementos para vinculá-lo ao produto.</p>
                    : addonGroups.map(group => (
                      <Label key={group.id} htmlFor={`product-addon-${group.id}`} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3">
                        <span>{group.name}{group.is_required && <Badge variant="outline" className="ml-2">Obrigatório</Badge>}</span>
                        <Checkbox id={`product-addon-${group.id}`} checked={selectedAddonGroups.includes(group.id)} disabled={saving}
                          onCheckedChange={checked => setSelectedAddonGroups(previous => checked === true ? [...previous, group.id] : previous.filter(id => id !== group.id))} />
                      </Label>
                    ))}
                </TabsContent>
                <TabsContent value="availability" className="mt-0 space-y-3">
                  <div className="flex items-center justify-between gap-3 rounded-lg border p-4">
                    <Label htmlFor="product-active">Produto ativo</Label>
                    <Switch id="product-active" checked={formData.is_active} disabled={saving}
                      onCheckedChange={is_active => setFormData(previous => ({ ...previous, is_active }))} />
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg border p-4">
                    <Label htmlFor="product-featured">Destaque no cardápio</Label>
                    <Switch id="product-featured" checked={formData.is_featured} disabled={saving}
                      onCheckedChange={is_featured => setFormData(previous => ({ ...previous, is_featured }))} />
                  </div>
                </TabsContent>
              </div>
            </Tabs>
            <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t p-4 sm:px-6">
              <Button type="button" variant="outline" disabled={saving} onClick={() => { addonLoad.current++; setDialogOpen(false); }}>Cancelar</Button>
              <Button type="submit" disabled={saving || addonState === "loading" || (editorTab === "addons" && addonState === "error")}>
                <Check className="mr-2 size-4" aria-hidden="true" /> {saving ? "Salvando..." : "Salvar produto"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
