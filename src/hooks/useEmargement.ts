import httpClient from "@/api/htppClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import { apiUrl } from "@/integrations/supabase/host";

export interface IEmargement {
  classeId: string;
  disciplineId: string;
  professeurId: string;
  debut: string;
  fin: string;
  seanceCounter: number;
  content: string;
  additionalInfo: string;
}

// Hook for fetching all emargements for a school
export const useEmargements = () => {
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;
  return useQuery<any[], Error>({
    queryKey: ["emargements", schoolId],
    queryFn: async () => {
      const { data } = await httpClient.get(`/api/schools/${schoolId}/emargements`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });
      return data;
    },
    enabled: !!authUser && !!schoolId,
  });
};

// Hook for fetching a specific emargement by its ID
export const useEmargementById = (schoolId: string, emargementId: string) => {
  return useQuery<IEmargement, Error>({
    queryKey: ["emargement", schoolId, emargementId],
    queryFn: async () => {
      const { data } = await httpClient.get(
        `/api/schools/${schoolId}/emargements/${emargementId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );
      return data;
    },
    enabled: !!schoolId && !!emargementId,
  });
};

// Hook for fetching emargements for a specific professor
export const useEmargementsByProfessor = (schoolId: string, professeurId: string) => {
  return useQuery<any[], Error>({
    queryKey: ["emargementsByProfessor", schoolId, professeurId],
    queryFn: async () => {
      const { data } = await httpClient.get(
        `/api/schools/${schoolId}/emargements/user/${professeurId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );
      return data;
    },
    enabled: !!schoolId && !!professeurId,
  });
};

// Hook for creating a new emargement
export const useCreateEmargement = () => {
  const { toast } = useToast();
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;
  const queryClient = useQueryClient();

  return useMutation<IEmargement, Error, any>({
    mutationFn: async (newEmargement: IEmargement) => {
      if (!newEmargement.professeurId) {
        newEmargement.professeurId = authUser?.id;
      }
      if (!schoolId) {
        throw new Error("School ID is not available.");
      }

      const { data } = await httpClient.post(
        `/api/schools/${schoolId}/emargements`,
        newEmargement,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Emargement created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["emargementsByProfessor"] });
      queryClient.invalidateQueries({ queryKey: ["emargements", schoolId] });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.reason || "Error while creating the emargement.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
};

// Hook for deleting an emargement
export const useDeleteEmargement = () => {
  const { toast } = useToast();
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;
  const professeurId = authUser?.id;
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (emargementId: string) => {
      if (!schoolId) {
        throw new Error("School ID is not available.");
      }

      await httpClient.delete(`${apiUrl}/api/schools/${schoolId}/emargements/${emargementId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });
    },

    onSuccess: () => {
      toast({
        title: "Deleted",
        description: "Emargement deleted successfully.",
      });
      // Refresh queries
      queryClient.invalidateQueries({
        queryKey: ["emargementsByProfessor", schoolId, professeurId],
      });
      queryClient.invalidateQueries({ queryKey: ["emargements", schoolId] });
    },

    onError: (error: any) => {
      const errorMessage = error?.response?.data?.reason || "Error while deleting the emargement.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
};

// Hook for updating an existing emargement
export const useUpdateEmargement = () => {
  const { toast } = useToast();
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;
  const professeurId = authUser?.id;

  const queryClient = useQueryClient();

  return useMutation<IEmargement, Error, { id: string; updatedEmargement: Partial<IEmargement> }>({
    mutationFn: async ({ id, updatedEmargement }) => {
      if (!schoolId) {
        throw new Error("School ID is not available.");
      }

      const { data } = await httpClient.put(
        `${apiUrl}/api/schools/${schoolId}/emargements/${id}`,
        updatedEmargement,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );
      return data;
    },

    onSuccess: () => {
      toast({
        title: "Émargement modifié",
        description: "Vos modifications ont été enregistrées avec succès.",
      });
      // Refresh related queries
      queryClient.invalidateQueries({
        queryKey: ["emargementsByProfessor", schoolId, professeurId],
      });
      queryClient.invalidateQueries({ queryKey: ["emargements", schoolId] });
    },

    onError: (error: any) => {
      const errorMessage = error?.response?.data?.reason || "Error while updating the emargement.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
};
