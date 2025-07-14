interface MenuHeaderProps {
  restaurantName: string;
  logoUrl?: string;
  bannerUrl?: string;
}

export function MenuHeader({ restaurantName, logoUrl, bannerUrl }: MenuHeaderProps) {
  return (
    <div className="bg-primary text-primary-foreground">
      {bannerUrl && (
        <div className="w-full h-32 md:h-48 overflow-hidden">
          <img 
            src={bannerUrl} 
            alt="Banner do restaurante" 
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center gap-4 md:gap-6">
          {logoUrl && (
            <div className="flex-shrink-0">
              <img 
                src={logoUrl} 
                alt="Logo do restaurante" 
                className="w-16 h-16 md:w-20 md:h-20 object-cover rounded-lg border-2 border-primary-foreground/20"
              />
            </div>
          )}
          
          <div className="text-center md:text-left">
            <h1 className="text-2xl md:text-4xl font-bold mb-2">{restaurantName}</h1>
            <p className="text-primary-foreground/80">Cardápio Digital</p>
          </div>
        </div>
      </div>
    </div>
  );
}