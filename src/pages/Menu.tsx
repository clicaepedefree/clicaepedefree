import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Phone, DollarSign, ExternalLink } from "lucide-react";

interface Restaurant {
  id: string;
  name: string;
  whatsapp: string;
  slug: string;
}

interface Category {
  id: string;
  name: string;
  display_order: number;
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
}

export default function Menu() {
  const { slug } = useParams<{ slug: string }>();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    if (slug) {
      fetchMenuData();
    }
  }, [slug]);

  const fetchMenuData = async () => {
    try {
      // Buscar restaurante
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('slug', slug)
        .single();

      if (restaurantError) throw restaurantError;
      if (!restaurantData) {
        setLoading(false);
        return;
      }

      setRestaurant(restaurantData);

      // Buscar categorias
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurantData.id)
        .order('display_order', { ascending: true });

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Buscar produtos ativos
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('restaurant_id', restaurantData.id)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (productsError) throw productsError;
      setProducts(productsData || []);
    } catch (error) {
      console.error("Erro ao carregar cardápio:", error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (productId: string) => {
    setCart(prev => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[productId] > 1) {
        newCart[productId]--;
      } else {
        delete newCart[productId];
      }
      return newCart;
    });
  };

  const getCartTotal = () => {
    return Object.entries(cart).reduce((total, [productId, quantity]) => {
      const product = products.find(p => p.id === productId);
      return total + (product ? product.price * quantity : 0);
    }, 0);
  };

  const generateWhatsAppMessage = () => {
    if (Object.keys(cart).length === 0) return "";

    let message = `*Pedido - ${restaurant?.name}*\n\n`;
    
    Object.entries(cart).forEach(([productId, quantity]) => {
      const product = products.find(p => p.id === productId);
      if (product) {
        message += `${quantity}x ${product.name} - R$ ${(product.price * quantity).toFixed(2)}\n`;
      }
    });

    message += `\n*Total: R$ ${getCartTotal().toFixed(2)}*`;
    return encodeURIComponent(message);
  };

  const sendWhatsAppOrder = () => {
    if (!restaurant?.whatsapp || Object.keys(cart).length === 0) return;
    
    const message = generateWhatsAppMessage();
    const whatsappUrl = `https://wa.me/${restaurant.whatsapp.replace(/\D/g, '')}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const getProductsByCategory = (categoryId: string) => {
    return products.filter(product => product.category_id === categoryId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando cardápio...</p>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-muted-foreground mb-4">Restaurante não encontrado</h1>
          <p className="text-muted-foreground">Verifique se o link está correto.</p>
        </div>
      </div>
    );
  }

  const cartItemsCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{restaurant.name}</h1>
          <p className="text-primary-foreground/80">Cardápio Digital</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {categories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              Cardápio em breve! Estamos preparando nossos deliciosos pratos para você.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {categories.map((category) => {
              const categoryProducts = getProductsByCategory(category.id);
              
              if (categoryProducts.length === 0) return null;

              return (
                <div key={category.id} className="space-y-4">
                  <h2 className="text-2xl font-bold border-b pb-2">{category.name}</h2>
                  
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {categoryProducts.map((product) => (
                      <Card key={product.id} className="overflow-hidden">
                        {product.image_url && (
                          <div className="aspect-video overflow-hidden">
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <h3 className="font-semibold text-lg">{product.name}</h3>
                            {product.description && (
                              <p className="text-muted-foreground text-sm">{product.description}</p>
                            )}
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <DollarSign className="h-4 w-4 mr-1" />
                                <span className="text-lg font-bold">
                                  {product.price.toFixed(2)}
                                </span>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                {cart[product.id] ? (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => removeFromCart(product.id)}
                                    >
                                      -
                                    </Button>
                                    <Badge variant="secondary">{cart[product.id]}</Badge>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => addToCart(product.id)}
                                    >
                                      +
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addToCart(product.id)}
                                  >
                                    <ShoppingCart className="h-4 w-4 mr-1" />
                                    Adicionar
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Carrinho fixo */}
      {cartItemsCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t p-4 shadow-lg">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {cartItemsCount} {cartItemsCount === 1 ? 'item' : 'itens'}
              </Badge>
              <div className="text-lg font-bold">
                Total: R$ {getCartTotal().toFixed(2)}
              </div>
            </div>
            
            <Button onClick={sendWhatsAppOrder} className="flex items-center space-x-2">
              <Phone className="h-4 w-4" />
              <span>Enviar Pedido</span>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Padding para o carrinho fixo */}
      {cartItemsCount > 0 && <div className="h-20"></div>}
    </div>
  );
}