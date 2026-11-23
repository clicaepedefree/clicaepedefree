import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  description?: string;
  price: number;
}

export interface AddonSelection {
  option: AddonOption;
  group: AddonGroup;
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
  onAddToCart: (product: Product, selectedAddons: AddonSelection[], totalPrice: number, observations?: string) => void;
  pointOfSale?: boolean;
}

export function ProductAddonSelector({ product, open, onOpenChange, onAddToCart, pointOfSale = false }: ProductAddonSelectorProps) {
  const [selectedAddons, setSelectedAddons] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [observations, setObservations] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) {
      setSelectedAddons({});
      setQuantity(1);
      setObservations("");
      setSearch("");
    }
  }, [open, product.id]);

  const addons = useQuery({
    queryKey: ['product-addon-selector', product.id],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.from('product_addon_groups')
        .select('addon_groups!inner(id,name,selection_type,is_required,min_selections,max_selections,created_at)')
        .eq('product_id', product.id);
      if (error) throw error;
      const groups = (data?.flatMap(row => row.addon_groups) ?? [])
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
      if (groups.length === 0) return { groups, options: [] };
      const { data: options, error: optionsError } = await supabase.from('addon_options')
        .select('*').in('addon_group_id', groups.map(group => group.id)).order('name');
      if (optionsError) throw optionsError;
      return { groups, options: options ?? [] };
    },
  });
  const addonGroups = addons.data?.groups ?? [];
  const addonOptions = addons.data?.options ?? [];
  const normalizeSearch = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR');
  const searchedText = normalizeSearch(search.trim());
  const visibleOptions = addonOptions.filter(option => normalizeSearch(option.name).includes(searchedText));

  const handleOptionChange = (groupId: string, optionId: string, group: AddonGroup) => {
    setSelectedAddons(previous => {
      if (group.selection_type === 'single') return { ...previous, [groupId]: [optionId] };
      const selected = previous[groupId] ?? [];
      if (selected.includes(optionId)) {
        return { ...previous, [groupId]: selected.filter(id => id !== optionId) };
      }
      if (group.max_selections && selected.length >= group.max_selections) return previous;
      return { ...previous, [groupId]: [...selected, optionId] };
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
    
    return pointOfSale ? Math.round(total * 100) / 100 : total;
  };

  const isValidSelection = () => {
    // Verificar se todos os grupos obrigatórios têm seleção adequada
    return addonGroups.every(group => {
      const selections = selectedAddons[group.id] || [];
      
      const minimum = pointOfSale ? Math.max(1, group.min_selections) : group.min_selections;
      if (group.is_required && selections.length < minimum) {
        return false;
      }
      
      if (group.max_selections && selections.length > group.max_selections) {
        return false;
      }
      
      return true;
    });
  };

  const handleAddToCart = () => {
    if (!addons.isSuccess || !isValidSelection()) return;

    const selectedAddonItems = Object.entries(selectedAddons).flatMap(([groupId, optionIds]) => {
      const group = addonGroups.find(item => item.id === groupId);
      if (!group) return [];
      return optionIds.flatMap(optionId => {
        const option = addonOptions.find(item => item.id === optionId);
        return option ? [{ option, group }] : [];
      });
    });

    const unitPrice = calculateTotalPrice();
    
    // Add to cart multiple times based on quantity, passing observations
    for (let i = 0; i < quantity; i++) {
      onAddToCart(product, selectedAddonItems, unitPrice, observations);
    }
    
    setQuantity(1);
    setObservations("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-3 text-left pr-12">
          <DialogTitle>{pointOfSale ? 'Adicionais do produto' : 'Detalhes do item'}</DialogTitle>
          <DialogDescription>{product.name} · R$ {numberToCurrency(product.price)}</DialogDescription>
        </DialogHeader>
        {addons.isError ? (
          <div className="space-y-3 px-6 pb-6">
            <p role="alert" className="text-sm text-destructive">Não foi possível carregar os adicionais.</p>
            <Button variant="outline" onClick={() => void addons.refetch()}>Tentar novamente</Button>
          </div>
        ) : addons.isPending ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <div className="overflow-y-auto flex-1 p-6">
              {!pointOfSale && product.image_url && (
                <div className="w-full mb-4">
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                </div>
              )}

              {!pointOfSale && product.description && (
                <p className="text-sm text-muted-foreground mb-6">
                  {product.description}
                </p>
              )}

              {pointOfSale && addonOptions.length > 0 && (
                <div className="mb-4 space-y-1">
                  <Label htmlFor="addon-search">Buscar adicional</Label>
                  <Input id="addon-search" placeholder="Nome do adicional" value={search}
                    onChange={event => setSearch(event.target.value)} />
                </div>
              )}
              {searchedText && visibleOptions.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum adicional encontrado.</p>
              )}
              <div className="space-y-6">
                {addonGroups.map((group) => {
                  const options = visibleOptions.filter(option => option.addon_group_id === group.id);
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

                      {pointOfSale && group.selection_type === 'single' && !group.is_required && selectedAddons[group.id]?.length > 0 && (
                        <Button type="button" size="sm" variant="ghost"
                          onClick={() => setSelectedAddons(previous => ({ ...previous, [group.id]: [] }))}>
                          Limpar seleção de {group.name}
                        </Button>
                      )}
                      {group.selection_type === 'single' ? (
                        <RadioGroup
                          value={selectedAddons[group.id]?.[0] || ''}
                          onValueChange={(value) => handleOptionChange(group.id, value, group)}
                        >
                          {options.map((option) => (
                            <div key={option.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent">
                              <div className="flex items-center space-x-2 flex-1">
                                <RadioGroupItem value={option.id} id={option.id} />
                                <div className="flex-1">
                                  <Label htmlFor={option.id} className="cursor-pointer">
                                    {option.name}
                                  </Label>
                                  {option.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {option.description}
                                    </p>
                                  )}
                                </div>
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
                              <div className="flex items-center space-x-2 flex-1">
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
                                <div className="flex-1">
                                  <Label htmlFor={option.id} className="cursor-pointer">
                                    {option.name}
                                  </Label>
                                  {option.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {option.description}
                                    </p>
                                  )}
                                </div>
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
                  maxLength={500}
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
                  aria-label="Diminuir quantidade do produto"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="h-10 w-10"
                >
                  -
                </Button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Aumentar quantidade do produto"
                  disabled={pointOfSale && quantity >= 100}
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