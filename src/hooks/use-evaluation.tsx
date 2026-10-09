import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import httpClient from "@/api/htppClient";

export enum EvaluationType {
  EVALUATION = "EVALUATION",
  EXERCICE = "EXERCICE",
}
// ✅ Types
export interface Evaluation {
  id: string;
  title: string;
  description: string;
  date: string;
  classeId: string;
  professeurId: string;
  disciplineId: string;
  schoolId: string;
  type?: EvaluationType;

  professeur: any;
  discipline: any;
  classe: any;
}

export interface CreateEvaluationPayload {
  title: string;
  description: string;
  date: string;
  classeId: string;
  professeurId: string;
  disciplineId: string;
  schoolId: string;
  type?: "EVALUATION" | "EXERCICE";
}

export interface UpdateEvaluationPayload {
  id: string;
  title?: string;
  description?: string;
  date?: string;
}

// 🔹 Create
export const useCreateEvaluation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;

  return useMutation<Evaluation, Error, CreateEvaluationPayload>({
    mutationFn: async (newEvaluation) => {
      if (!schoolId) throw new Error("School ID is not available.");
      const { data } = await httpClient.post(
        `/api/schools/${schoolId}/evaluations`,
        newEvaluation,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        }
      );
      return data;
    },
    onSuccess: () => {
      toast({ title: "Succès", description: "Évaluation créée." });
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error?.response?.data?.reason || "Erreur lors de la création.",
        variant: "destructive",
      });
    },
  });
};

// 🔹 Get All
export const useEvaluations = () => {
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;

  return useQuery<Evaluation[]>({
    queryKey: ["evaluations"],
    queryFn: async () => {
      const { data } = await httpClient.get(`/api/schools/${schoolId}/evaluations`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      return data;
    },
    enabled: !!schoolId,
  });
};

// 🔹 Get by ID
export const useEvaluationById = (evaluationId: string) => {
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;

  return useQuery<Evaluation>({
    queryKey: ["evaluations", evaluationId],
    queryFn: async () => {
      const { data } = await httpClient.get(`/api/schools/${schoolId}/evaluations/${evaluationId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      return data;
    },
    enabled: !!schoolId && !!evaluationId,
  });
};

// 🔹 Get by Classe
export const useEvaluationsByClasse = (classeId: string) => {
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;

  return useQuery<Evaluation[]>({
    queryKey: ["evaluations", "classe", classeId],
    queryFn: async () => {
      const { data } = await httpClient.get(
        `/api/schools/${schoolId}/evaluations/classe/${classeId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        }
      );
      return data;
    },
    enabled: !!schoolId && !!classeId,
  });
};

// 🔹 Get by Teacher
export const useEvaluationsByTeacher = (teacherId: string) => {
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;

  return useQuery<Evaluation[]>({
    queryKey: ["evaluations", "teacher", teacherId],
    queryFn: async () => {
      const { data } = await httpClient.get(
        `/api/schools/${schoolId}/evaluations/professeur/${teacherId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        }
      );
      return data;
    },
    enabled: !!schoolId && !!teacherId,
  });
};

// 🔹 Update
export const useUpdateEvaluation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;

  return useMutation<Evaluation, Error, UpdateEvaluationPayload>({
    mutationFn: async (evaluation: UpdateEvaluationPayload) => {
      const { data } = await httpClient.put(
        `/api/schools/${schoolId}/evaluations/${evaluation.id}`,
        evaluation,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        }
      );
      return data;
    },
    onSuccess: () => {
      toast({ title: "Succès", description: "Évaluation mise à jour." });
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error?.response?.data?.reason || "Erreur lors de la mise à jour.",
        variant: "destructive",
      });
    },
  });
};

// 🔹 Delete
export const useDeleteEvaluation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;

  return useMutation<void, Error, { evaluationId: string }>({
    mutationFn: async ({ evaluationId }) => {
      await httpClient.delete(`/api/schools/${schoolId}/evaluations/${evaluationId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
    },
    onSuccess: () => {
      toast({ title: "Succès", description: "Évaluation supprimée." });
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error?.response?.data?.reason || "Erreur lors de la suppression.",
        variant: "destructive",
      });
    },
  });
};
