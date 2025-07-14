export function MenuNotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-muted-foreground mb-4">Restaurante não encontrado</h1>
        <p className="text-muted-foreground">Verifique se o link está correto.</p>
      </div>
    </div>
  );
}