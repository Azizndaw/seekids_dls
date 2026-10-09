import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiUrl } from "@/integrations/supabase/host";
import httpClient from "@/api/htppClient";

export interface Parent {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  ecole_id: string;
  created_at?: string;
}

export const useParents = () => {
  const { authUser } = useAuth();

  return useQuery({
    queryKey: ["parents"],
    queryFn: async () => {
      console.log("Fetching parents...");
      const accessToken = localStorage.getItem("accessToken");

      const response = await httpClient.get(`/api/schools/${authUser.schoolId}/parents`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const parents = response.data;

      if (Math.floor(response.status) / 100 !== 2) {
        return;
      }

      return parents;
    },
    enabled: !!authUser?.schoolId,
  });
};

export const useCreateParent = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { authUser } = useAuth();

  return useMutation({
    mutationFn: async (parentData: {
      nom: string;
      prenom: string;
      email: string;
      telephone?: string;
      password: string;
      students: any[];
    }) => {
      if (!authUser?.schoolId) {
        throw new Error("Utilisateur non connecté ou école non définie");
      }

      console.log("1. Début de création du parent:", parentData.email);

      try {
        const response = await httpClient.post(
          `/api/auth/register`,
          {
            nom: parentData.nom,
            prenom: parentData.prenom,
            email: parentData.email,
            telephone: parentData.telephone,
            password: parentData.password,
            schoolId: authUser?.schoolId,
            students: parentData.students,
            roles: ["PARENT"],
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const createdParent = response.data;
        if (response.status > 204) {
          console.log("What's happening bro", response.status > 204);
          let errorMessage = "Erreur lors de la création";

          if (typeof createdParent.message === "string") {
            if (createdParent.message.includes("already exists")) {
              errorMessage = "Un compte avec cet email existe déjà";
            } else if (createdParent.message.includes("Password")) {
              errorMessage = "Le mot de passe ne respecte pas les critères requis";
            } else if (createdParent.message.includes("duplicate key")) {
              errorMessage = "Ce parent existe déjà dans le système";
            }
          }

          throw new Error(errorMessage);
        }
        console.log("2. Parent enregistré avec succès:", createdParent);
        return createdParent as Parent;
      } catch (err) {
        throw new Error(err);
      }
    },
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Parent créé avec succès",
      });
      queryClient.invalidateQueries({ queryKey: ["parents"] });
    },

    onError: (error) => {
      console.error("Erreur lors de la création du parent:", error);

      let errorMessage = "Erreur lors de la création";

      if (typeof error.message === "string") {
        if (error.message.includes("already exists")) {
          errorMessage += "Un compte avec cet email existe déjà";
        } else if (error.message.includes("Password")) {
          errorMessage += "Le mot de passe ne respecte pas les critères requis";
        } else if (error.message.includes("duplicate key")) {
          errorMessage += "Ce parent existe déjà dans le système";
        }
      }

      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
};

export const useGetCurrentParent = () => {
  const { authUser } = useAuth();

  return useQuery({
    queryKey: ["parent"],
    queryFn: async () => {
      console.log("Fetching current parents...");

      if (!authUser?.id) {
        throw new Error("Utilisateur non connecté ou école non définie");
      }

      const accessToken = localStorage.getItem("accessToken");

      const response = await httpClient.get(`/api/auth/me/role/PARENT`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (Math.floor(response.status) / 100 !== 2) {
        return;
      }
      const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        });
      };

      if (response.data.children && Array.isArray(response.data.children)) {
        response.data.children.forEach((child) => {
          if (!child.attendances && child.school_attendances) {
            child.attendances = child.school_attendances;
          }
          if (child.attendances) {
            child.attendances = child.attendances.map((attendance) => ({
              ...attendance,
              date: formatDate(attendance.date), // Format the date here
            }));
          }
        });
      }

      return response.data;
    },
    enabled: !!authUser?.schoolId,
  });
};
