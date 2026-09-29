import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface AuthUser {
  userId: string;
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: "administration" | "professeur" | "parent";
  telephone?: string;
  schoolId: string;
  est_approuve: boolean;
  created_at?: string;
}

export const useUniversalAuth = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const logout = () => {
    localStorage.removeItem("utilisateur_connecte");
    toast({
      title: "Déconnexion réussie",
      description: "À bientôt !",
    });
  };

  const getCurrentUser = (): AuthUser | null => {
    const stored = localStorage.getItem("utilisateur_connecte");
    return stored ? JSON.parse(stored) : null;
  };

  return {
    loading,
    logout,
    getCurrentUser,
  };
};
