import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  const [quantity, setQuantity] = useState(1);
  const [observations, setObservations] = useState("");

  useEffect(() => {
    if (open && product) {
      fetchProductAddons();
      setQuantity(1);
      setObservations("");
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
      } else if (group.selection_type === 'fractional_highest' || group.selection_type === 'fractional_average') {
        // Fracionado - múltipla seleção com lógica de preço especial
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
    
    // Calcular preço para cada grupo considerando o tipo de seleção
    Object.entries(selectedAddons).forEach(([groupId, optionIds]) => {
      if (optionIds.length === 0) return;
      
      const group = addonGroups.find(g => g.id === groupId);
      if (!group) return;
      
      const selectedOptions = optionIds.map(id => addonOptions.find(o => o.id === id)).filter(Boolean);
      
      if (group.selection_type === 'fractional_highest') {
        // Fracionado - cobra pelo maior valor
        const highestPrice = Math.max(...selectedOptions.map(o => o.price));
        total += highestPrice;
      } else if (group.selection_type === 'fractional_average') {
        // Fracionado - cobra pela média
        const averagePrice = selectedOptions.reduce((sum, o) => sum + o.price, 0) / selectedOptions.length;
        total += averagePrice;
      } else {
        // Múltipla seleção ou única - soma todos os preços
        selectedOptions.forEach(option => {
          total += option.price;
        });
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

    const unitPrice = calculateTotalPrice();
    
    // Add to cart multiple times based on quantity
    for (let i = 0; i < quantity; i++) {
      onAddToCart(product, selectedAddonItems, unitPrice);
    }
    
    setQuantity(1);
    setObservations("");
    onOpenChange(false);
  };

  const getSelectedOptionNames = (groupId: string) => {
    const selectedIds = selectedAddons[groupId] || [];
    return selectedIds.map(id => {
      const option = addonOptions.find(o => o.id === id);
      return option?.name;
    }).filter(Boolean);
  };

  if (addonGroups.length === 0 && !loading) {
    // Se não há addons, adicionar diretamente
    if (open) {
      onAddToCart(product, [], product.price);
      onOpenChange(false);
    }
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <div className="overflow-y-auto flex-1 p-6">
              <DialogHeader className="text-center mb-4">
                <DialogTitle className="text-sm font-normal text-muted-foreground uppercase">
                  DETALHES DO ITEM
                </DialogTitle>
              </DialogHeader>

              {product.image_url && (
                <div className="w-full mb-4">
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                </div>
              )}

              <h2 className="text-2xl font-bold mb-2">{product.name}</h2>
              <p className="text-xl font-bold text-primary mb-4">
                R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>

              {product.description && (
                <p className="text-sm text-muted-foreground mb-6">
                  {product.description}
                </p>
              )}

              <div className="space-y-6">
                {addonGroups.map((group) => {
                  const options = getOptionsForGroup(group.id);
                  if (options.length === 0) return null;

                  return (
                    <div key={group.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">
                          {group.name}
                          {group.is_required && (
                            <span className="text-destructive ml-1">*</span>
                          )}
                        </h3>
                        {(group.selection_type === 'multiple' || group.selection_type === 'fractional_highest' || group.selection_type === 'fractional_average') && (
                          <span className="text-xs text-muted-foreground">
                            {group.min_selections && group.max_selections
                              ? `Selecione entre ${group.min_selections} e ${group.max_selections}`
                              : group.min_selections
                              ? `Selecione no mínimo ${group.min_selections}`
                              : group.max_selections
                              ? `Selecione no máximo ${group.max_selections}`
                              : 'Múltipla escolha'}
                          </span>
                        )}
                      </div>

                      {group.selection_type === 'single' ? (
                        <RadioGroup
                          value={selectedAddons[group.id]?.[0] || ''}
                          onValueChange={(value) => handleOptionChange(group.id, value, group)}
                        >
                          {options.map((option) => (
                            <div key={option.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent">
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value={option.id} id={option.id} />
                                <Label htmlFor={option.id} className="cursor-pointer">
                                  {option.name}
                                </Label>
                              </div>
                              {option.price > 0 && (
                                <span className="text-sm font-medium">
                                  + R$ {option.price.toFixed(2)}
                                </span>
                              )}
                            </div>
                          ))}
                        </RadioGroup>
                      ) : (
                        <div className="space-y-2">
                          {options.map((option) => (
                            <div key={option.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent">
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
                                <Label htmlFor={option.id} className="cursor-pointer">
                                  {option.name}
                                </Label>
                              </div>
                              {option.price > 0 && (
                                <span className="text-sm font-medium">
                                  + R$ {option.price.toFixed(2)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-6">
                <Label htmlFor="observations" className="font-semibold mb-2 block">
                  Observações
                </Label>
                <Textarea
                  id="observations"
                  placeholder="Adicione sua observação aqui"
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  className="min-h-[100px] resize-none"
                />
              </div>
            </div>

            <div className="border-t bg-background p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="h-10 w-10"
                >
                  -
                </Button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity(quantity + 1)}
                  className="h-10 w-10"
                >
                  +
                </Button>
              </div>

              <Button
                onClick={handleAddToCart}
                disabled={!isValidSelection()}
                className="flex-1 h-12 text-base font-semibold bg-[#4BA3C3] hover:bg-[#3d8aa8] text-white"
              >
                Adicionar R$ {(calculateTotalPrice() * quantity).toLocaleString('pt-BR', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}