interface MenuHeaderProps {
  restaurantName: string;
}

export function MenuHeader({ restaurantName }: MenuHeaderProps) {
  return (
    <div className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">{restaurantName}</h1>
        <p className="text-primary-foreground/80">Cardápio Digital</p>
      </div>
    </div>
  );
}