import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { CurrencyInput, currencyToNumber, numberToCurrency } from "@/components/ui/currency-input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";

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
  description?: string;
  created_at: string;
}

export function AddonManager({ restaurant }: AddonManagerProps) {
  const [addonGroups, setAddonGroups] = useState<AddonGroup[]>([]);
  const [addonOptions, setAddonOptions] = useState<AddonOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [optionDialogOpen, setOptionDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AddonGroup | null>(null);
  const [editingOption, setEditingOption] = useState<AddonOption | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
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
    description: "",
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
        fetchAddonOptions()
      ]);
    } catch (error) {
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados dos grupos de opções",
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
      description: "",
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
      description: option.description || "",
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
          description: "Grupo de opções atualizado com sucesso"
        });
      } else {
        const { error } = await supabase
          .from('addon_groups')
          .insert([groupData]);

        if (error) throw error;
        
        toast({
          title: "Grupo criado",
          description: "Grupo de opções criado com sucesso"
        });
      }

      fetchAddonGroups();
      setDialogOpen(false);
      resetGroupForm();
    } catch (error) {
      toast({
        title: "Erro ao salvar grupo",
        description: "Não foi possível salvar o grupo de opções",
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
        description: optionFormData.description || null,
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
          description: "Opção atualizada com sucesso"
        });
      } else {
        const { error } = await supabase
          .from('addon_options')
          .insert([optionData]);

        if (error) throw error;
        
        toast({
          title: "Opção criada",
          description: "Opção criada com sucesso"
        });
      }

      fetchAddonOptions();
      setOptionDialogOpen(false);
      resetOptionForm();
    } catch (error) {
      toast({
        title: "Erro ao salvar opção",
        description: "Não foi possível salvar a opção",
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
        description: "Grupo de opções removido com sucesso"
      });
      
      fetchData();
    } catch (error) {
      toast({
        title: "Erro ao excluir grupo",
        description: "Não foi possível excluir o grupo de opções",
        variant: "destructive"
      });
    }
  };

  const duplicateGroup = async (groupId: string) => {
    try {
      const groupToDuplicate = addonGroups.find(g => g.id === groupId);
      if (!groupToDuplicate) return;

      const { data: newGroup, error: groupError } = await supabase
        .from('addon_groups')
        .insert([{
          name: `${groupToDuplicate.name} (cópia)`,
          selection_type: groupToDuplicate.selection_type,
          is_required: groupToDuplicate.is_required,
          min_selections: groupToDuplicate.min_selections,
          max_selections: groupToDuplicate.max_selections,
          restaurant_id: restaurant.id
        }])
        .select()
        .single();

      if (groupError) throw groupError;

      const optionsToDuplicate = getOptionsForGroup(groupId);
      if (optionsToDuplicate.length > 0) {
        const { error: optionsError } = await supabase
          .from('addon_options')
          .insert(
            optionsToDuplicate.map(opt => ({
              name: opt.name,
              price: opt.price,
              description: opt.description,
              addon_group_id: newGroup.id
            }))
          );

        if (optionsError) throw optionsError;
      }

      toast({
        title: "Grupo duplicado",
        description: "Grupo de opções duplicado com sucesso"
      });

      fetchData();
    } catch (error) {
      toast({
        title: "Erro ao duplicar grupo",
        description: "Não foi possível duplicar o grupo de opções",
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
        description: "Opção removida com sucesso"
      });
      
      fetchAddonOptions();
    } catch (error) {
      toast({
        title: "Erro ao excluir opção",
        description: "Não foi possível excluir a opção",
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
          <h2 className="text-2xl font-bold">Grupos de Opções</h2>
          <p className="text-muted-foreground">Carregando grupos de opções...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Grupos de Opções</h2>
          <p className="text-muted-foreground">Configure grupos de opções para seus produtos</p>
        </div>
        <Button onClick={() => { resetGroupForm(); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Grupo
        </Button>
      </div>

      {/* Dialog para criar/editar grupo */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGroup ? "Editar Grupo" : "Novo Grupo"}</DialogTitle>
            <DialogDescription>
              {editingGroup ? "Edite as informações do grupo" : "Crie um novo grupo de opções"}
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

            {(groupFormData.selection_type === 'multiple' || groupFormData.selection_type.startsWith('fractional')) && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="min-selections">Mínimo</Label>
                  <Input
                    id="min-selections"
                    type="number"
                    min="0"
                    value={groupFormData.min_selections}
                    onChange={(e) => setGroupFormData({ ...groupFormData, min_selections: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="max-selections">Máximo</Label>
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
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">{editingGroup ? "Atualizar" : "Criar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para criar/editar opção */}
      <Dialog open={optionDialogOpen} onOpenChange={setOptionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingOption ? "Editar Opção" : "Nova Opção"}</DialogTitle>
            <DialogDescription>
              {editingOption ? "Edite as informações da opção" : "Crie uma nova opção"}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleOptionSubmit} className="space-y-4">
            <div>
              <Label htmlFor="option-name">Nome da Opção *</Label>
              <Input
                id="option-name"
                value={optionFormData.name}
                onChange={(e) => setOptionFormData({ ...optionFormData, name: e.target.value })}
                placeholder="Ex: Pequeno, Queijo extra"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="option-description">Descrição</Label>
              <Textarea
                id="option-description"
                value={optionFormData.description}
                onChange={(e) => setOptionFormData({ ...optionFormData, description: e.target.value })}
                placeholder="Descrição opcional da opção"
                rows={2}
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
              <Button type="button" variant="outline" onClick={() => setOptionDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">{editingOption ? "Atualizar" : "Criar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lista de grupos com collapsibles */}
      {addonGroups.length === 0 ? (
        <Card>
          <CardContent className="text-center p-8">
            <p className="text-muted-foreground">
              Nenhum grupo de opções criado. Clique em "Novo Grupo" para começar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {addonGroups.map((group) => (
            <Card key={group.id}>
              <Collapsible
                open={openGroups[group.id]}
                onOpenChange={(isOpen) => setOpenGroups({ ...openGroups, [group.id]: isOpen })}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="p-0 h-auto">
                            {openGroups[group.id] ? (
                              <ChevronUp className="h-5 w-5" />
                            ) : (
                              <ChevronDown className="h-5 w-5" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <div>
                          <h3 className="font-semibold text-lg">{group.name}</h3>
                          <div className="flex gap-2 mt-1">
                            <Badge variant={group.selection_type === 'single' ? 'default' : 'secondary'} className="text-xs">
                              {group.selection_type === 'single' ? 'Única' : 'Múltipla'}
                            </Badge>
                            {group.is_required && (
                              <Badge variant="outline" className="text-xs">Obrigatório</Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {getOptionsForGroup(group.id).length} {getOptionsForGroup(group.id).length === 1 ? 'opção' : 'opções'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedGroupId(group.id);
                          resetOptionForm();
                          setOptionFormData({ ...optionFormData, addon_group_id: group.id });
                          setOptionDialogOpen(true);
                        }}
                        title="Adicionar opção"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => duplicateGroup(group.id)}
                        title="Duplicar grupo"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditGroupDialog(group)}
                        title="Editar grupo"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteGroup(group.id)}
                        title="Excluir grupo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                <CollapsibleContent>
                  <div className="px-4 pb-4 pt-2 border-t">
                    {getOptionsForGroup(group.id).length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">
                        Nenhuma opção adicionada. Clique no botão + acima para adicionar.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {getOptionsForGroup(group.id).map((option) => (
                          <div
                            key={option.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{option.name}</span>
                                {option.price > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +R$ {option.price.toFixed(2)}
                                  </Badge>
                                )}
                              </div>
                              {option.description && (
                                <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditOptionDialog(option)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteOption(option.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}