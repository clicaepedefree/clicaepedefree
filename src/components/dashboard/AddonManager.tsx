import { Card, CardContent } from "@/components/ui/card";

interface AddonManagerProps {
  restaurant: any;
}

export function AddonManager({ restaurant }: AddonManagerProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Adicionais</h2>
        <p className="text-muted-foreground">Configure grupos de adicionais para seus produtos</p>
      </div>
      
      <Card>
        <CardContent className="text-center p-8">
          <p className="text-muted-foreground">
            Em breve: Gerenciamento de adicionais
          </p>
        </CardContent>
      </Card>
    </div>
  );
}