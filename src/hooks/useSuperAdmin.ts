import { useState, useEffect } from "react";

interface SuperAdminSession {
  id: string;
  email: string;
  loginTime: number;
}

export const useSuperAdmin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [session, setSession] = useState<SuperAdminSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = () => {
    try {
      const storedSession = localStorage.getItem('superAdminSession');
      if (storedSession) {
        const parsedSession: SuperAdminSession = JSON.parse(storedSession);
        
        // Check if session is not older than 24 hours
        const twentyFourHours = 24 * 60 * 60 * 1000;
        const sessionAge = Date.now() - parsedSession.loginTime;
        
        if (sessionAge < twentyFourHours) {
          setSession(parsedSession);
          setIsAuthenticated(true);
        } else {
          logout();
        }
      }
    } catch (error) {
      console.error('Error checking super admin authentication:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('superAdminSession');
    setSession(null);
    setIsAuthenticated(false);
  };

  return {
    isAuthenticated,
    session,
    loading,
    logout,
    checkAuthentication
  };
};