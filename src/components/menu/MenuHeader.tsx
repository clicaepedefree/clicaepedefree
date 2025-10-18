interface MenuHeaderProps {
  restaurantName: string;
  logoUrl?: string;
  bannerUrl?: string;
}

export function MenuHeader({ restaurantName, logoUrl, bannerUrl }: MenuHeaderProps) {
  return (
    <div className="bg-background">
      {bannerUrl && (
        <div className="w-full h-32 md:h-48 overflow-hidden">
          <img 
            src={bannerUrl} 
            alt="Banner do restaurante" 
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <div className="container mx-auto px-4 py-6 flex flex-col items-center">
        {logoUrl && (
          <div className="mb-4">
            <img 
              src={logoUrl} 
              alt="Logo do restaurante" 
              className="w-24 h-24 md:w-32 md:h-32 object-cover rounded-full border-4 border-border shadow-lg"
            />
          </div>
        )}
        
        <h1 className="text-2xl md:text-3xl font-bold text-center" style={{ color: '#000000' }}>
          {restaurantName}
        </h1>
      </div>
    </div>
  );
}