import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MenuImporter } from "./MenuImporter";

interface Category {
  id: string;
  name: string;
  display_order: number;
}

interface CategoryManagerProps {
  restaurant: any;
}

export function CategoryManager({ restaurant }: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCategories();
  }, [restaurant]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar categorias",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;

    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update({ name })
          .eq('id', editingCategory.id);
        
        if (error) throw error;
        toast({ title: "Categoria atualizada com sucesso!" });
      } else {
        const { error } = await supabase
          .from('categories')
          .insert({
            restaurant_id: restaurant.id,
            name,
            display_order: categories.length
          });
        
        if (error) throw error;
        toast({ title: "Categoria criada com sucesso!" });
      }

      setDialogOpen(false);
      setEditingCategory(null);
      fetchCategories();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar categoria",
        description: error.message,
      });
    }
  };

  const handleDelete = async (categoryId: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;
      toast({ title: "Categoria excluída com sucesso!" });
      fetchCategories();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir categoria",
        description: error.message,
      });
    }
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Categorias</h2>
          <p className="text-muted-foreground">Organize seus produtos em categorias</p>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <MenuImporter
            restaurantId={restaurant.id}
            onImportComplete={fetchCategories}
            hasExistingData={categories.length > 0}
          />
        
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingCategory(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Editar Categoria" : "Nova Categoria"}
              </DialogTitle>
              <DialogDescription>
                {editingCategory ? "Edite as informações da categoria" : "Crie uma nova categoria para seus produtos"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Categoria</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Ex: Lanches, Bebidas, Sobremesas"
                  defaultValue={editingCategory?.name || ""}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                {editingCategory ? "Atualizar" : "Criar"} Categoria
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid gap-4">
        {categories.map((category) => (
          <Card key={category.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <h3 className="font-medium">{category.name}</h3>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingCategory(category);
                    setDialogOpen(true);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(category.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {categories.length === 0 && (
          <Card>
            <CardContent className="text-center p-8">
              <p className="text-muted-foreground">
                Nenhuma categoria criada ainda. Comece criando sua primeira categoria!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}