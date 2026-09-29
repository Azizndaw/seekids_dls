import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "./useAuth";
import cleanhttpClient from "@/api/cleanhttpClient";
import httpClient from "@/api/htppClient";

export interface Subject {
  id: string;
  name: string;
  ecole_id: string;
  created_at?: string;
}

export const useSubjects = () => {
  const { authUser } = useAuth();

  return useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      // Pour l'instant, utilisons des matières par défaut
      // Quand la table sera créée dans Supabase, on pourra récupérer les vraies données
      try {
        const accessToken = localStorage.getItem("accessToken");

        const response = await cleanhttpClient.get(
          `/api/schools/${authUser.schoolId}/disciplines`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        // Axios only resolves on 2xx status codes, so response is OK here
        return response.data;
      } catch (error) {
        console.error(error);
      }
    },
    enabled: !!authUser,
  });
};

export const useAssignSubjectToTeacher = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;

  return useMutation({
    mutationFn: async ({
      teacherId,
      disciplineIds,
    }: {
      teacherId: string;
      disciplineIds: string[];
    }) => {
      if (!schoolId) throw new Error("No school ID");
      const accessToken = localStorage.getItem("accessToken");

      const response = await httpClient.put(
        `/api/schools/${schoolId}/assign-disciplines`,
        {
          teacherId,
          disciplineIds,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return response.data;
    },

    onSuccess: () => {
      toast({
        title: "Matière assignée",
        description: "La matière a été assignée au professeur avec succès.",
      });
      queryClient.invalidateQueries({ queryKey: ["teacher-subjects"] });
    },

    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible d'assigner la matière au professeur.",
        variant: "destructive",
      });
      console.error("Error assigning subject to teacher:", error);
    },
  });
};
