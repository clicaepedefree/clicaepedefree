import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface ProductManagerProps {
  restaurant: any;
}

export function ProductManager({ restaurant }: ProductManagerProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Produtos</h2>
        <p className="text-muted-foreground">Gerencie os produtos do seu cardápio</p>
      </div>
      
      <Card>
        <CardContent className="text-center p-8">
          <p className="text-muted-foreground">
            Em breve: Gerenciamento de produtos
          </p>
        </CardContent>
      </Card>
    </div>
  );
}