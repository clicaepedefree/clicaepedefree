import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, DollarSign, Settings2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { CurrencyInput, currencyToNumber, numberToCurrency } from "@/components/ui/currency-input";
import { ImageUpload } from "./ImageUpload";

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
  const [addonDialogOpen, setAddonDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedAddonGroups, setSelectedAddonGroups] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category_id: "",
    image_url: "",
    is_active: true,
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
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
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
      display_order: ""
    });
    setEditingProduct(null);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      price: numberToCurrency(product.price),
      category_id: product.category_id,
      image_url: product.image_url || "",
      is_active: product.is_active,
      display_order: product.display_order.toString()
    });
    setDialogOpen(true);
  };

  const openAddonDialog = async (product: Product) => {
    setSelectedProduct(product);
    
    // Buscar grupos já associados ao produto
    try {
      const { data, error } = await supabase
        .from('product_addon_groups')
        .select('addon_group_id')
        .eq('product_id', product.id);

      if (error) throw error;
      
      const associatedGroups = data?.map(item => item.addon_group_id) || [];
      setSelectedAddonGroups(associatedGroups);
    } catch (error) {
      console.error("Erro ao carregar grupos associados:", error);
      setSelectedAddonGroups([]);
    }
    
    setAddonDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price || !formData.category_id) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome, preço e categoria",
        variant: "destructive"
      });
      return;
    }

    try {
      const productData = {
        name: formData.name,
        description: formData.description || null,
        price: currencyToNumber(formData.price),
        category_id: formData.category_id,
        image_url: formData.image_url || null,
        is_active: formData.is_active,
        display_order: formData.display_order ? parseInt(formData.display_order) : 0,
        restaurant_id: restaurant.id
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        
        toast({
          title: "Produto atualizado",
          description: "Produto atualizado com sucesso"
        });
      } else {
        const { error } = await supabase
          .from('products')
          .insert([productData]);

        if (error) throw error;
        
        toast({
          title: "Produto criado",
          description: "Produto adicionado com sucesso"
        });
      }

      fetchProducts();
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: "Erro ao salvar produto",
        description: "Não foi possível salvar o produto",
        variant: "destructive"
      });
    }
  };

  const handleAddonSubmit = async () => {
    if (!selectedProduct) return;

    try {
      // Primeiro, remover todas as associações existentes
      await supabase
        .from('product_addon_groups')
        .delete()
        .eq('product_id', selectedProduct.id);

      // Depois, adicionar as novas associações
      if (selectedAddonGroups.length > 0) {
        const associations = selectedAddonGroups.map(groupId => ({
          product_id: selectedProduct.id,
          addon_group_id: groupId
        }));

        const { error } = await supabase
          .from('product_addon_groups')
          .insert(associations);

        if (error) throw error;
      }

      toast({
        title: "Addons atualizados",
        description: "Grupos de addon associados ao produto com sucesso"
      });

      setAddonDialogOpen(false);
      setSelectedProduct(null);
      setSelectedAddonGroups([]);
    } catch (error) {
      toast({
        title: "Erro ao associar addons",
        description: "Não foi possível associar os grupos de addon",
        variant: "destructive"
      });
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
      
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

  const toggleProductStatus = async (productId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !currentStatus })
        .eq('id', productId);

      if (error) throw error;
      
      fetchProducts();
      toast({
        title: "Status atualizado",
        description: `Produto ${!currentStatus ? 'ativado' : 'desativado'} com sucesso`
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar status",
        description: "Não foi possível atualizar o status do produto",
        variant: "destructive"
      });
    }
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || "Categoria não encontrada";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Produtos</h2>
          <p className="text-muted-foreground">Carregando produtos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Produtos</h2>
          <p className="text-muted-foreground">Gerencie os produtos do seu cardápio</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Produto
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Editar Produto" : "Novo Produto"}
              </DialogTitle>
              <DialogDescription>
                {editingProduct ? "Edite as informações do produto" : "Adicione um novo produto ao seu cardápio"}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome do produto"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição do produto"
                  rows={3}
                />
              </div>
              
                  <div>
                    <Label htmlFor="price">Preço *</Label>
                    <CurrencyInput
                      id="price"
                      value={formData.price}
                      onChange={(value) => setFormData({ ...formData, price: value })}
                      required
                    />
                  </div>
              
              <div>
                <Label htmlFor="category">Categoria *</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Imagem do Produto</Label>
                <ImageUpload
                  currentUrl={formData.image_url}
                  onImageUploaded={(url) => setFormData({ ...formData, image_url: url })}
                  type="banner"
                  restaurantId={restaurant.id}
                />
              </div>
              
              <div>
                <Label htmlFor="display_order">Ordem de Exibição</Label>
                <Input
                  id="display_order"
                  type="number"
                  min="0"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                  placeholder="0"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Produto ativo</Label>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingProduct ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Dialog para gerenciar addons do produto */}
      <Dialog open={addonDialogOpen} onOpenChange={setAddonDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerenciar Addons</DialogTitle>
            <DialogDescription>
              Selecione os grupos de addon para: {selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {addonGroups.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nenhum grupo de addon disponível. Crie grupos na aba "Adicionais" primeiro.
              </p>
            ) : (
              <div className="space-y-3">
                {addonGroups.map((group) => (
                  <div key={group.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={group.id}
                      checked={selectedAddonGroups.includes(group.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedAddonGroups([...selectedAddonGroups, group.id]);
                        } else {
                          setSelectedAddonGroups(selectedAddonGroups.filter(id => id !== group.id));
                        }
                      }}
                    />
                    <Label htmlFor={group.id} className="flex-1 cursor-pointer">
                      <div>
                        <span className="font-medium">{group.name}</span>
                        <div className="flex gap-1 mt-1">
                          <Badge variant={group.selection_type === 'single' ? 'default' : 'secondary'} className="text-xs">
                            {group.selection_type === 'single' ? 'Único' : 'Múltiplo'}
                          </Badge>
                          {group.is_required && (
                            <Badge variant="outline" className="text-xs">Obrigatório</Badge>
                          )}
                        </div>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddonDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleAddonSubmit}>
              Salvar Addons
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="text-center p-8">
            <p className="text-muted-foreground">
              Você precisa criar categorias antes de adicionar produtos.
            </p>
          </CardContent>
        </Card>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="text-center p-8">
            <p className="text-muted-foreground">
              Nenhum produto cadastrado. Clique em "Novo Produto" para começar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Produtos Cadastrados ({products.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        {product.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {product.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getCategoryName(product.category_id)}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        R$ {numberToCurrency(product.price)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.is_active ? "default" : "secondary"}>
                        {product.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAddonDialog(product)}
                          title="Gerenciar Addons"
                        >
                          <Settings2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleProductStatus(product.id, product.is_active)}
                        >
                          {product.is_active ? "Desativar" : "Ativar"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteProduct(product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}