import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, DollarSign, Settings, ChefHat } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CurrencyInput, currencyToNumber, numberToCurrency } from "@/components/ui/currency-input";

interface AddonManagerProps {
  restaurant: any;
}

interface AddonGroup {
  id: string;
  name: string;
  selection_type: string;
  is_required: boolean;
  min_selections: number;
  max_selections: number | null;
  created_at: string;
  updated_at: string;
}

interface AddonOption {
  id: string;
  addon_group_id: string;
  name: string;
  price: number;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
}

export function AddonManager({ restaurant }: AddonManagerProps) {
  const [addonGroups, setAddonGroups] = useState<AddonGroup[]>([]);
  const [addonOptions, setAddonOptions] = useState<AddonOption[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [optionDialogOpen, setOptionDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AddonGroup | null>(null);
  const [editingOption, setEditingOption] = useState<AddonOption | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [groupFormData, setGroupFormData] = useState({
    name: "",
    selection_type: "single",
    is_required: false,
    min_selections: "0",
    max_selections: ""
  });
  const [optionFormData, setOptionFormData] = useState({
    name: "",
    price: "",
    addon_group_id: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    if (restaurant?.id) {
      fetchData();
    }
  }, [restaurant?.id]);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchAddonGroups(),
        fetchAddonOptions(),
        fetchProducts()
      ]);
    } catch (error) {
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados dos addons",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAddonGroups = async () => {
    const { data, error } = await supabase
      .from('addon_groups')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    setAddonGroups(data || []);
  };

  const fetchAddonOptions = async () => {
    const { data, error } = await supabase
      .from('addon_options')
      .select(`
        *,
        addon_group:addon_groups!inner(restaurant_id)
      `)
      .eq('addon_group.restaurant_id', restaurant.id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    setAddonOptions(data || []);
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('id, name')
      .eq('restaurant_id', restaurant.id)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;
    setProducts(data || []);
  };

  const resetGroupForm = () => {
    setGroupFormData({
      name: "",
      selection_type: "single",
      is_required: false,
      min_selections: "0",
      max_selections: ""
    });
    setEditingGroup(null);
  };

  const resetOptionForm = () => {
    setOptionFormData({
      name: "",
      price: "",
      addon_group_id: selectedGroupId
    });
    setEditingOption(null);
  };

  const openEditGroupDialog = (group: AddonGroup) => {
    setEditingGroup(group);
    setGroupFormData({
      name: group.name,
      selection_type: group.selection_type,
      is_required: group.is_required,
      min_selections: group.min_selections.toString(),
      max_selections: group.max_selections?.toString() || ""
    });
    setDialogOpen(true);
  };

  const openEditOptionDialog = (option: AddonOption) => {
    setEditingOption(option);
    setOptionFormData({
      name: option.name,
      price: numberToCurrency(option.price),
      addon_group_id: option.addon_group_id
    });
    setOptionDialogOpen(true);
  };

  const handleGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!groupFormData.name.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Preencha o nome do grupo",
        variant: "destructive"
      });
      return;
    }

    try {
      const groupData = {
        name: groupFormData.name,
        selection_type: groupFormData.selection_type,
        is_required: groupFormData.is_required,
        min_selections: parseInt(groupFormData.min_selections) || 0,
        max_selections: groupFormData.max_selections ? parseInt(groupFormData.max_selections) : null,
        restaurant_id: restaurant.id
      };

      if (editingGroup) {
        const { error } = await supabase
          .from('addon_groups')
          .update(groupData)
          .eq('id', editingGroup.id);

        if (error) throw error;
        
        toast({
          title: "Grupo atualizado",
          description: "Grupo de addon atualizado com sucesso"
        });
      } else {
        const { error } = await supabase
          .from('addon_groups')
          .insert([groupData]);

        if (error) throw error;
        
        toast({
          title: "Grupo criado",
          description: "Grupo de addon criado com sucesso"
        });
      }

      fetchAddonGroups();
      setDialogOpen(false);
      resetGroupForm();
    } catch (error) {
      toast({
        title: "Erro ao salvar grupo",
        description: "Não foi possível salvar o grupo de addon",
        variant: "destructive"
      });
    }
  };

  const handleOptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!optionFormData.name.trim() || !optionFormData.addon_group_id) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome da opção e selecione um grupo",
        variant: "destructive"
      });
      return;
    }

    try {
      const optionData = {
        name: optionFormData.name,
        price: currencyToNumber(optionFormData.price),
        addon_group_id: optionFormData.addon_group_id
      };

      if (editingOption) {
        const { error } = await supabase
          .from('addon_options')
          .update(optionData)
          .eq('id', editingOption.id);

        if (error) throw error;
        
        toast({
          title: "Opção atualizada",
          description: "Opção de addon atualizada com sucesso"
        });
      } else {
        const { error } = await supabase
          .from('addon_options')
          .insert([optionData]);

        if (error) throw error;
        
        toast({
          title: "Opção criada",
          description: "Opção de addon criada com sucesso"
        });
      }

      fetchAddonOptions();
      setOptionDialogOpen(false);
      resetOptionForm();
    } catch (error) {
      toast({
        title: "Erro ao salvar opção",
        description: "Não foi possível salvar a opção de addon",
        variant: "destructive"
      });
    }
  };

  const deleteGroup = async (groupId: string) => {
    if (!confirm("Tem certeza que deseja excluir este grupo? Todas as opções serão removidas.")) return;

    try {
      const { error } = await supabase
        .from('addon_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;
      
      toast({
        title: "Grupo excluído",
        description: "Grupo de addon removido com sucesso"
      });
      
      fetchData();
    } catch (error) {
      toast({
        title: "Erro ao excluir grupo",
        description: "Não foi possível excluir o grupo de addon",
        variant: "destructive"
      });
    }
  };

  const deleteOption = async (optionId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta opção?")) return;

    try {
      const { error } = await supabase
        .from('addon_options')
        .delete()
        .eq('id', optionId);

      if (error) throw error;
      
      toast({
        title: "Opção excluída",
        description: "Opção de addon removida com sucesso"
      });
      
      fetchAddonOptions();
    } catch (error) {
      toast({
        title: "Erro ao excluir opção",
        description: "Não foi possível excluir a opção de addon",
        variant: "destructive"
      });
    }
  };

  const getOptionsForGroup = (groupId: string) => {
    return addonOptions.filter(option => option.addon_group_id === groupId);
  };

  const getGroupName = (groupId: string) => {
    const group = addonGroups.find(g => g.id === groupId);
    return group?.name || "Grupo não encontrado";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Adicionais</h2>
          <p className="text-muted-foreground">Carregando adicionais...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Adicionais</h2>
        <p className="text-muted-foreground">Configure grupos de adicionais para seus produtos</p>
      </div>

      <Tabs defaultValue="groups" className="space-y-6">
        <TabsList>
          <TabsTrigger value="groups" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Grupos de Addon
          </TabsTrigger>
          <TabsTrigger value="options" className="flex items-center gap-2">
            <ChefHat className="h-4 w-4" />
            Opções
          </TabsTrigger>
        </TabsList>

        {/* Grupos de Addon */}
        <TabsContent value="groups" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Grupos de Addon</h3>
              <p className="text-sm text-muted-foreground">Ex: Tamanho, Sabores, Extras</p>
            </div>
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetGroupForm(); setDialogOpen(true); }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Grupo
                </Button>
              </DialogTrigger>
              
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingGroup ? "Editar Grupo" : "Novo Grupo"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingGroup ? "Edite as informações do grupo" : "Crie um novo grupo de addon"}
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleGroupSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="group-name">Nome do Grupo *</Label>
                    <Input
                      id="group-name"
                      value={groupFormData.name}
                      onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                      placeholder="Ex: Tamanho, Sabores, Extras"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="selection-type">Tipo de Seleção</Label>
                    <Select
                      value={groupFormData.selection_type}
                      onValueChange={(value) => {
                        setGroupFormData({ 
                          ...groupFormData, 
                          selection_type: value,
                          min_selections: value === 'single' ? "1" : "0",
                          max_selections: value === 'single' ? "1" : ""
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Seleção única</SelectItem>
                        <SelectItem value="multiple">Múltipla seleção</SelectItem>
                        <SelectItem value="fractional_highest">Fracionado (maior valor)</SelectItem>
                        <SelectItem value="fractional_average">Fracionado (média)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(groupFormData.selection_type === 'multiple' || groupFormData.selection_type === 'fractional_highest' || groupFormData.selection_type === 'fractional_average') && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="min-selections">Mínimo de Seleções</Label>
                          <Input
                            id="min-selections"
                            type="number"
                            min="0"
                            value={groupFormData.min_selections}
                            onChange={(e) => setGroupFormData({ ...groupFormData, min_selections: e.target.value })}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label htmlFor="max-selections">Máximo de Seleções</Label>
                          <Input
                            id="max-selections"
                            type="number"
                            min="1"
                            value={groupFormData.max_selections}
                            onChange={(e) => setGroupFormData({ ...groupFormData, max_selections: e.target.value })}
                            placeholder="Ilimitado"
                          />
                        </div>
                      </div>
                    </>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is-required"
                      checked={groupFormData.is_required}
                      onCheckedChange={(checked) => setGroupFormData({ ...groupFormData, is_required: checked })}
                    />
                    <Label htmlFor="is-required">Seleção obrigatória</Label>
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
                      {editingGroup ? "Atualizar" : "Criar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {addonGroups.length === 0 ? (
            <Card>
              <CardContent className="text-center p-8">
                <p className="text-muted-foreground">
                  Nenhum grupo de addon criado. Clique em "Novo Grupo" para começar.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {addonGroups.map((group) => (
                <Card key={group.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{group.name}</CardTitle>
                        <div className="flex gap-2 mt-2">
                          <Badge variant={group.selection_type === 'single' ? 'default' : 'secondary'}>
                            {group.selection_type === 'single' ? 'Seleção única' : 'Múltipla seleção'}
                          </Badge>
                          {group.is_required && (
                            <Badge variant="outline">Obrigatório</Badge>
                          )}
                          {group.selection_type === 'multiple' && (
                            <Badge variant="outline">
                              {group.min_selections}-{group.max_selections || '∞'} seleções
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditGroupDialog(group)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteGroup(group.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Opções ({getOptionsForGroup(group.id).length}):</h4>
                      {getOptionsForGroup(group.id).length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhuma opção adicionada</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {getOptionsForGroup(group.id).map((option) => (
                            <Badge key={option.id} variant="secondary">
                              {option.name} {option.price > 0 && `(+R$ ${option.price.toFixed(2)})`}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Opções de Addon */}
        <TabsContent value="options" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Opções de Addon</h3>
              <p className="text-sm text-muted-foreground">Ex: Pequeno, Médio, Grande</p>
            </div>
            
            <Dialog open={optionDialogOpen} onOpenChange={setOptionDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => { resetOptionForm(); setOptionDialogOpen(true); }}
                  disabled={addonGroups.length === 0}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Opção
                </Button>
              </DialogTrigger>
              
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingOption ? "Editar Opção" : "Nova Opção"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingOption ? "Edite as informações da opção" : "Crie uma nova opção de addon"}
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleOptionSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="option-group">Grupo de Addon *</Label>
                    <Select
                      value={optionFormData.addon_group_id}
                      onValueChange={(value) => setOptionFormData({ ...optionFormData, addon_group_id: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um grupo" />
                      </SelectTrigger>
                      <SelectContent>
                        {addonGroups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="option-name">Nome da Opção *</Label>
                    <Input
                      id="option-name"
                      value={optionFormData.name}
                      onChange={(e) => setOptionFormData({ ...optionFormData, name: e.target.value })}
                      placeholder="Ex: Pequeno, Queijo extra, Molho"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="option-price">Preço Adicional</Label>
                    <CurrencyInput
                      id="option-price"
                      value={optionFormData.price}
                      onChange={(value) => setOptionFormData({ ...optionFormData, price: value })}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setOptionDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingOption ? "Atualizar" : "Criar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {addonGroups.length === 0 ? (
            <Card>
              <CardContent className="text-center p-8">
                <p className="text-muted-foreground">
                  Você precisa criar grupos de addon antes de adicionar opções.
                </p>
              </CardContent>
            </Card>
          ) : addonOptions.length === 0 ? (
            <Card>
              <CardContent className="text-center p-8">
                <p className="text-muted-foreground">
                  Nenhuma opção criada. Clique em "Nova Opção" para começar.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Opções Cadastradas ({addonOptions.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Grupo</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {addonOptions.map((option) => (
                      <TableRow key={option.id}>
                        <TableCell className="font-medium">{option.name}</TableCell>
                        <TableCell>{getGroupName(option.addon_group_id)}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {option.price > 0 ? (
                              <>
                                +R$ {numberToCurrency(option.price)}
                              </>
                            ) : (
                              "Gratuito"
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditOptionDialog(option)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteOption(option.id)}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}