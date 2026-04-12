import { useEffect } from "react";

const Index = () => {
  useEffect(() => {
    window.location.href = "https://clicapede.com.br";
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-4"></div>
        <p className="text-sm text-muted-foreground">Redirecionando...</p>
      </div>
    </div>
  );
};

export default Index;
