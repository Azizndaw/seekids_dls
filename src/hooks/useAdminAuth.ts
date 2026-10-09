import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import cleanhttpClient from "@/api/cleanhttpClient";

interface AdminUser {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  telephone?: string;
  schoolId: string;
  est_approuve: boolean;
  created_at?: string;
}

interface AdminAuthResult {
  success: boolean;
  user?: AdminUser;
  error?: string;
}

export const useAdminAuth = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // 🔐 Connexion
  const loginAdmin = async (
    email: string,
    password: string,
    userRole: string
  ): Promise<AdminAuthResult> => {
    setLoading(true);
    try {
      // Hardcoded school for Dakar Leaders School
      const clientName = "dakar-leaders-school";
      console.log("====== DEBUG PAYLOAD ======");
      console.log("Phone/Email Payload =>", `"${email}"`);
      console.log("Password Payload =>", `"${password}"`);
      console.log("Role =>", `"${userRole}"`);
      console.log("===========================");

      const response = await fetch(`https://seekids-api.serigneabdouazizndaw.workers.dev/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-School-Name": clientName,
          "X-Academic-Year": localStorage.getItem("academicYear") || "2026-2027"
        },
        body: JSON.stringify({ email: email.trim(), password: password.trim(), schoolName: clientName, role: userRole })
      });

      let data;
      try {
        data = await response.json();
      } catch (e) {
        throw new Error(`Server returned no JSON data. Status: ${response.status}`);
      }

      if (!response.ok) {
        throw { response: { status: response.status, data } };
      }

      console.log("Login response data:", data);

      if (data?.token == null) {
        console.error("Login failed: No token received");
        return { success: false, error: data?.error || "Erreur lors de la connexion" };
      }
      localStorage.setItem("accessToken", data.token);
      const decodedPayload = decodeJWTPayload(data.token);
      console.log("Decoded payload:", decodedPayload);

      if (!decodedPayload.role.includes(userRole)) {
        console.warn(`Role mismatch: expected ${userRole}, got ${decodedPayload.role}`);
        toast({
          title: "Connexion échouée",
          description: `Aucun compte ne correspond à ces identifiants.`,
        });
        return { success: false, error: "Role mismatch" };
      }

      localStorage.setItem("utilisateur_connecte", JSON.stringify(decodedPayload));
      toast({
        title: "Connexion réussie",
        description: `Bienvenue ${decodedPayload.prenom} ${decodedPayload.nom}`,
      });

      return { success: true, user: data.token };
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.response) {
        console.error("Error response:", error.response.data);
        console.error("Error status:", error.response.status);
      }
      return { success: false, error: error.message || "Unknown error" };
    } finally {
      setLoading(false);
    }
  };
  return {
    loading,
    loginAdmin,
  };
};

function decodeJWTPayload(token: string) {
  const [, payload] = token.split(".");

  // Fix padding and convert from base64url to base64
  const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");

  const jsonPayload = decodeURIComponent(
    atob(padded)
      .split("")
      .map((c) => `%${("00" + c.charCodeAt(0).toString(16)).slice(-2)}`)
      .join("")
  );

  return JSON.parse(jsonPayload);
}
