import { Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";

export default function Orders() {
  const { user, restaurant, loading, updateRestaurant, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/criar-conta" replace />;
  }

  if (!restaurant) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <DashboardLayout
      restaurant={restaurant}
      user={user}
      onLogout={handleLogout}
      onRestaurantUpdate={updateRestaurant}
      activeSection="orders"
      onSectionChange={() => {}}
    />
  );
}
