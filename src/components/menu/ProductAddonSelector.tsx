import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { DollarSign, Plus } from "lucide-react";
import { numberToCurrency } from "@/components/ui/currency-input";

interface AddonGroup {
  id: string;
  name: string;
  selection_type: string;
  is_required: boolean;
  min_selections: number;
  max_selections: number | null;
}

interface AddonOption {
  id: string;
  addon_group_id: string;
  name: string;
  price: number;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
}

interface ProductAddonSelectorProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToCart: (product: Product, selectedAddons: any[], totalPrice: number) => void;
}

export function ProductAddonSelector({ product, open, onOpenChange, onAddToCart }: ProductAddonSelectorProps) {
  const [addonGroups, setAddonGroups] = useState<AddonGroup[]>([]);
  const [addonOptions, setAddonOptions] = useState<AddonOption[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<{ [groupId: string]: string[] }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && product) {
      fetchProductAddons();
    }
  }, [open, product]);

  const fetchProductAddons = async () => {
    try {
      setLoading(true);
      
      // Buscar grupos de addon associados ao produto
      const { data: productAddonGroups, error: groupsError } = await supabase
        .from('product_addon_groups')
        .select(`
          addon_group_id,
          addon_groups!inner(
            id,
            name,
            selection_type,
            is_required,
            min_selections,
            max_selections
          )
        `)
        .eq('product_id', product.id);

      if (groupsError) throw groupsError;

      const groups = productAddonGroups?.map(pag => pag.addon_groups).flat() || [];
      setAddonGroups(groups);

      if (groups.length > 0) {
        // Buscar opções para esses grupos
        const groupIds = groups.map(g => g.id);
        const { data: options, error: optionsError } = await supabase
          .from('addon_options')
          .select('*')
          .in('addon_group_id', groupIds)
          .order('name', { ascending: true });

        if (optionsError) throw optionsError;
        setAddonOptions(options || []);
      }

      // Inicializar seleções
      const initialSelections: { [groupId: string]: string[] } = {};
      groups.forEach(group => {
        initialSelections[group.id] = [];
      });
      setSelectedAddons(initialSelections);

    } catch (error) {
      console.error("Erro ao carregar addons:", error);
    } finally {
      setLoading(false);
    }
  };

  const getOptionsForGroup = (groupId: string) => {
    return addonOptions.filter(option => option.addon_group_id === groupId);
  };

  const handleOptionChange = (groupId: string, optionId: string, group: AddonGroup) => {
    setSelectedAddons(prev => {
      const newSelections = { ...prev };
      
      if (group.selection_type === 'single') {
        // Seleção única - substitui a seleção anterior
        newSelections[groupId] = [optionId];
      } else {
        // Múltipla seleção - adiciona ou remove com validação de max
        const currentSelections = newSelections[groupId] || [];
        if (currentSelections.includes(optionId)) {
          newSelections[groupId] = currentSelections.filter(id => id !== optionId);
        } else {
          // Verificar se já atingiu o máximo
          if (group.max_selections && currentSelections.length >= group.max_selections) {
            return prev; // Não adiciona se já atingiu o máximo
          }
          newSelections[groupId] = [...currentSelections, optionId];
        }
      }
      
      return newSelections;
    });
  };

  const calculateTotalPrice = () => {
    let total = product.price;
    
    Object.values(selectedAddons).flat().forEach(optionId => {
      const option = addonOptions.find(o => o.id === optionId);
      if (option) {
        total += option.price;
      }
    });
    
    return total;
  };

  const isValidSelection = () => {
    // Verificar se todos os grupos obrigatórios têm seleção adequada
    return addonGroups.every(group => {
      const selections = selectedAddons[group.id] || [];
      
      if (group.is_required && selections.length < group.min_selections) {
        return false;
      }
      
      if (group.max_selections && selections.length > group.max_selections) {
        return false;
      }
      
      return true;
    });
  };

  const handleAddToCart = () => {
    if (!isValidSelection()) return;

    const selectedAddonItems = Object.entries(selectedAddons)
      .flatMap(([groupId, optionIds]) => 
        optionIds.map(optionId => {
          const option = addonOptions.find(o => o.id === optionId);
          const group = addonGroups.find(g => g.id === groupId);
          return { option, group };
        })
      )
      .filter(item => item.option && item.group);

    onAddToCart(product, selectedAddonItems, calculateTotalPrice());
    onOpenChange(false);
  };

  const getSelectedOptionNames = (groupId: string) => {
    const selectedIds = selectedAddons[groupId] || [];
    return selectedIds.map(id => {
      const option = addonOptions.find(o => o.id === id);
      return option?.name;
    }).filter(Boolean);
  };

  if (addonGroups.length === 0) {
    // Se não há addons, adicionar diretamente
    if (open) {
      onAddToCart(product, [], product.price);
      onOpenChange(false);
    }
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{product.name}</DialogTitle>
          <DialogDescription>
            Personalize seu produto escolhendo os adicionais
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Carregando opções...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Preço base */}
            <Card>
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Preço base:</span>
                  <div className="flex items-center">
                    <span className="font-bold">R$ {numberToCurrency(product.price)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Grupos de addon */}
            {addonGroups.map((group) => (
              <div key={group.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{group.name}</h4>
                  <div className="flex gap-1">
                    {group.is_required && (
                      <Badge variant="destructive" className="text-xs">Obrigatório</Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {group.selection_type === 'single' 
                        ? 'Escolha 1' 
                        : `${group.min_selections}-${group.max_selections || '∞'} escolhas`
                      }
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  {group.selection_type === 'single' ? (
                    <RadioGroup
                      value={selectedAddons[group.id]?.[0] || ""}
                      onValueChange={(value) => handleOptionChange(group.id, value, group)}
                    >
                      {getOptionsForGroup(group.id).map((option) => (
                        <div key={option.id} className="flex items-center justify-between p-2 border rounded-lg">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value={option.id} id={option.id} />
                            <Label htmlFor={option.id} className="font-normal cursor-pointer">
                              {option.name}
                            </Label>
                          </div>
                          {option.price > 0 && (
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Plus className="h-3 w-3 mr-1" />
                              R$ {numberToCurrency(option.price)}
                            </div>
                          )}
                        </div>
                      ))}
                    </RadioGroup>
                  ) : (
                    <div className="space-y-2">
                      {getOptionsForGroup(group.id).map((option) => (
                        <div key={option.id} className="flex items-center justify-between p-2 border rounded-lg">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={option.id}
                              checked={selectedAddons[group.id]?.includes(option.id) || false}
                              onCheckedChange={() => handleOptionChange(group.id, option.id, group)}
                              disabled={
                                !selectedAddons[group.id]?.includes(option.id) &&
                                group.max_selections &&
                                (selectedAddons[group.id]?.length || 0) >= group.max_selections
                              }
                            />
                            <Label htmlFor={option.id} className="font-normal cursor-pointer">
                              {option.name}
                            </Label>
                          </div>
                          {option.price > 0 && (
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Plus className="h-3 w-3 mr-1" />
                              R$ {numberToCurrency(option.price)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Total e botão */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-medium">Total:</span>
                <div className="flex items-center text-lg font-bold">
                  R$ {calculateTotalPrice().toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </div>
              </div>
              
              <Button 
                onClick={handleAddToCart}
                disabled={!isValidSelection()}
                className="w-full"
              >
                Adicionar ao Carrinho
              </Button>
              
              {!isValidSelection() && (
                <p className="text-sm text-destructive text-center mt-2">
                  Verifique as seleções obrigatórias e limites de cada grupo
                </p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}