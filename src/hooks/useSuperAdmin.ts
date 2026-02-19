import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useSuperAdmin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [session, setSession] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthentication();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, authSession) => {
      if (authSession) {
        verifySuperAdmin(authSession.user.id, authSession.user.email || '');
      } else {
        setIsAuthenticated(false);
        setSession(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuthentication = async () => {
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (authSession) {
        await verifySuperAdmin(authSession.user.id, authSession.user.email || '');
      } else {
        setIsAuthenticated(false);
        setSession(null);
      }
    } catch (error) {
      console.error('Error checking super admin authentication:', error);
      setIsAuthenticated(false);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  const verifySuperAdmin = async (userId: string, email: string) => {
    try {
      const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', { check_user_id: userId });
      if (isSuperAdmin) {
        setSession({ id: userId, email });
        setIsAuthenticated(true);
      } else {
        setSession(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error verifying super admin:', error);
      setSession(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    // Clean up old localStorage session if it exists
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
