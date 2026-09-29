import { useState, useEffect } from "react";
import { useUniversalAuth } from "@/hooks/useUniversalAuth";

interface AuthUser {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: "administration" | "professeur" | "parent";
  telephone?: string;
  schoolId: string;
  biographie?: string;
  profession?: string;
  created_at?: string;
}

export const useAuth = () => {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { getCurrentUser, logout: universalLogout } = useUniversalAuth();

  useEffect(() => {
    // Vérifier si un utilisateur est connecté
    const currentUser = getCurrentUser();
    if (currentUser) {
      setAuthUser({
        id: currentUser.userId,
        nom: currentUser.nom,
        prenom: currentUser.prenom,
        email: currentUser.email,
        role: currentUser.role,
        telephone: currentUser.telephone,
        schoolId: currentUser.schoolId,
        created_at: currentUser.created_at,
      });
    }
    setLoading(false);
  }, []);

  const signOut = async () => {
    universalLogout();
    setAuthUser(null);
  };

  return {
    user: null, // Pas utilisé avec notre système custom
    session: null, // Pas utilisé avec notre système custom
    authUser,
    loading,
    signOut,
    isAuthenticated: !!authUser,
    isAdmin: authUser?.role === "administration",
  };
};
