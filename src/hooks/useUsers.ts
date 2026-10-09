import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import httpClient from "@/api/htppClient";

export interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  telephone?: string;
  schoolId: string;
  created_at?: string;
  password?: string;
  disciplineIds: string[];
  disciplines?: any[];
}

export interface Student {
  id: string;
  nom: string;
  prenom: string;
  classeId: string;
  dateOfBirth?: string;
  lieu_naissance?: string;
  parentId?: string;
  schoolId: string;
  created_at?: string;
  abscence?: string;
  retards?: string;
  moyenne?: string;
}

export interface Class {
  id: string;
  nom: string;
  niveau: string;
  schoolId: string;
  created_at?: string;
  students: any[];
}

export interface TeacherClassAssignment {
  id: string;
  professeur_id: string;
  classe_id: string;
  schoolId: string;
  created_at?: string;
}

export const useUsers = () => {
  const { authUser } = useAuth();
  const academicYear = localStorage.getItem("academicYear") || "2025-2026";

  return useQuery({
    queryKey: ["users", academicYear],
    queryFn: async () => {
      console.log("Fetching users...");

      try {
        const accessToken = localStorage.getItem("accessToken");

        const response = await httpClient.get(`/api/schools/${authUser.schoolId}/teachers`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });

        return response.data;
      } catch (error) {
        console.error(error);
        return;
      }
    },
    enabled: !!authUser?.schoolId,
  });
};

export const useStudents = () => {
  const { authUser } = useAuth();
  const academicYear = localStorage.getItem("academicYear") || "2025-2026";

  return useQuery({
    queryKey: ["students", academicYear],
    queryFn: async () => {
      console.log("Fetching students...");

      try {
        const accessToken = localStorage.getItem("accessToken");

        const response = await httpClient.get(`/api/schools/${authUser.schoolId}/students`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });
        return response.data;
      } catch (error) {
        console.error(error);
        return;
      }
    },
    enabled: !!authUser?.schoolId,
  });
};

export const useClasses = () => {
  const { authUser } = useAuth();
  const academicYear = localStorage.getItem("academicYear") || "2025-2026";

  return useQuery({
    queryKey: ["classes", academicYear],
    queryFn: async () => {
      console.log("Fetching classes...");

      try {
        const accessToken = localStorage.getItem("accessToken");

        const response = await httpClient.get(`/api/schools/${authUser.schoolId}/classes`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });
        return response.data;
      } catch (error) {
        console.error(error);
        return;
      }
    },
    enabled: !!authUser?.schoolId,
  });
};

export const useTeacherClassAssignments = () => {
  const { authUser } = useAuth();

  return useQuery({
    queryKey: ["teacher-class-assignments"],
    queryFn: async () => {
      if (!authUser?.schoolId) {
        throw new Error("Utilisateur non connecté ou école non définie");
      }

      // const { data, error } = await supabase
      //   .from("professeurs_classes")
      //   .select(
      //     `
      //     *,
      //     utilisateurs(nom, prenom),
      //     classes(nom, niveau)
      //   `
      //   )
      //   .eq("ecole_id", authUser.schoolId)
      //   .order("created_at", { ascending: false });

      // if (error) throw error;
      return [] as (TeacherClassAssignment & {
        utilisateurs?: { nom: string; prenom: string } | null;
        classes?: { nom: string; niveau: string } | null;
      })[];
    },
    enabled: !!authUser?.schoolId,
  });
};

export const useCreateUser = () => {
  const { toast } = useToast();
  const { authUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userData: Omit<User, "id" | "created_at"> & { password: string }) => {
      if (!authUser?.schoolId) {
        throw new Error("Utilisateur non connecté ou école non définie");
      }

      const user = {
        nom: userData.nom,
        prenom: userData.prenom,
        email: userData.email,
        telephone: userData.telephone,
        roles: [userData.role],
        password: userData.password ?? (userData.role === "TEACHER" ? "Seekids2027" : "Bonjour123"),
        schoolId: authUser?.schoolId,
        disciplineIds: userData.disciplineIds,
      };

      try {
        const response = await httpClient.post(`/api/auth/register`, user, {
          headers: {
            "Content-Type": "application/json",
          },
        });

        // Axios automatically throws on non-2xx responses, so if we're here, it's ok
        return response.data as User;
      } catch (error) {
        // Extract error message if available
        const message =
          error.response?.data?.message ||
          error.message ||
          "Erreur lors de la création de l'utilisateur";
        throw new Error(message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: "Succès",
        description: "Utilisateur créé avec succès",
      });
    },
    onError: (error) => {
      console.error("Erreur lors de la création de l'utilisateur:", error);
      toast({
        title: "Erreur",
        description: `Erreur lors de la création: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};
export const useUpdatePassword = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { authUser } = useAuth();

  return useMutation({
    mutationFn: async (credentialData: { oldPassword: string; newPassword: string }) => {
      if (!authUser?.schoolId) {
        throw new Error("Utilisateur non connecté ou école non définie");
      }

      const requestBody = {
        oldPassword: credentialData.oldPassword,
        newPassword: credentialData.newPassword,
        schoolId: authUser.schoolId,
        email: authUser.email,
      };
      const accessToken = localStorage.getItem("accessToken");

      try {
        const response = await httpClient.put(`/api/auth/reset-password`, requestBody, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });
        return response.data;
      } catch (error) {
        const message =
          error.response?.data?.message || "Erreur lors de la création de l'utilisateur";
        throw new Error(message);
      }
    },
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Votre mot de passe a été changé.",
      });
    },
    onError: (error) => {
      console.error("Erreur lors de la création de l'élève:", error);
      toast({
        title: "Erreur",
        description: `Erreur lors du changement de votre mot de passe.`,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateTeacherInfo = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { authUser } = useAuth(); // Assumed context for getting the authenticated user

  return useMutation({
    mutationFn: async (userInfo: {
      nom: string;
      prenom: string;
      email: string;
      telephone: string;
      bio: string;
    }) => {
      if (!authUser?.schoolId || !authUser?.id) {
        throw new Error("Utilisateur non connecté ou ID manquant");
      }

      const { nom, prenom, email, telephone, bio } = userInfo;

      const requestBody = {
        nom,
        prenom,
        email,
        telephone,
        biographie: bio,
        adresse: "",
      };

      const accessToken = localStorage.getItem("accessToken");

      try {
        const response = await httpClient.put(
          `/api/schools/${authUser?.schoolId}/teachers/${authUser.id}`,
          requestBody,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );
        return Math.floor(response.status / 100) == 2;
      } catch (error) {
        const message =
          error.response?.data?.message || "Erreur lors de la mise à jour des informations";
        throw new Error(message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: "Succès",
        description: "Informations mises à jour avec succès",
      });
    },
    onError: (error) => {
      console.error("Erreur lors de la mise à jour:", error);
      toast({
        title: "Erreur",
        description: `Erreur lors de la mise à jour: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useCreateStudent = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { authUser } = useAuth();

  return useMutation({
    mutationFn: async (studentData: Omit<Student, "id" | "created_at" | "ecole_id">) => {
      if (!authUser?.schoolId) {
        throw new Error("Utilisateur non connecté ou école non définie");
      }

      const student = {
        nom: studentData.nom,
        prenom: studentData.prenom,
        dateOfBirth: studentData.dateOfBirth,
        lieu_naissance: studentData.lieu_naissance || "Dakar",
        schoolId: authUser.schoolId,
        classe: studentData.classeId,
        parentId: studentData.parentId,
      };

      try {
        const response = await httpClient.post(
          `/api/schools/${authUser.schoolId}/students`,
          student,
          {
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        // Axios throws on non-2xx status, so this means success
        return response.data as Student;
      } catch (error) {
        const message =
          error.response?.data?.message || "Erreur lors de la création de l'utilisateur";
        throw new Error(message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students", "classes"] });
      toast({
        title: "Succès",
        description: "Élève créé avec succès",
      });
    },
    onError: (error) => {
      console.error("Erreur lors de la création de l'élève:", error);
      toast({
        title: "Erreur",
        description: `Erreur lors de la création: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useCreateClass = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { authUser } = useAuth();

  return useMutation({
    mutationFn: async (classData: Omit<Class, "id" | "created_at" | "students">) => {
      if (!authUser?.schoolId) {
        throw new Error("Utilisateur non connecté ou école non définie");
      }

      try {
        const accessToken = localStorage.getItem("accessToken");

        const response = await httpClient.post(
          `/api/schools/${authUser.schoolId}/classes`,
          {
            nom: classData.nom,
            niveau: classData.niveau,
          },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

        console.log("class response:", response.data);
        return response.data;
      } catch (error) {
        console.error(error);
        return;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast({
        title: "Succès",
        description: "Classe créée avec succès",
      });
    },
    onError: (error) => {
      console.error("Erreur lors de la création de la classe:", error);
      toast({
        title: "Erreur",
        description: `Erreur lors de la création: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useAssignTeacherToClass = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { authUser } = useAuth();

  return useMutation({
    mutationFn: async ({
      professeur_id,
      classe_id,
    }: {
      professeur_id: string;
      classe_id: string;
    }) => {
      if (!authUser?.schoolId) {
        throw new Error("Utilisateur non connecté ou école non définie");
      }
      try {
        const accessToken = localStorage.getItem("accessToken");

        const response = await httpClient.put(
          `/api/schools/${authUser.schoolId}/classes/${classe_id}/assignTeacher`,
          {
            professeurId: professeur_id,
          },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

        console.log("class response:", response.data);
        return response.data;
      } catch (error) {
        console.log("Error : ", error);
        return;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-class-assignments"] });
      toast({
        title: "Succès",
        description: "Professeur assigné à la classe avec succès",
      });
    },
    onError: (error) => {
      console.error("Erreur lors de l'assignation:", error);
      toast({
        title: "Erreur",
        description: `Erreur lors de l'assignation: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useRemoveTeacherFromClass = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { authUser } = useAuth();

  return useMutation({
    mutationFn: async ({
      professeur_id,
      classe_id,
    }: {
      professeur_id: string;
      classe_id: string;
    }) => {
      const accessToken = localStorage.getItem("accessToken");

      const response = await httpClient.put(
        `/api/schools/${authUser.schoolId}/classes/${classe_id}/revokeTeacher`,
        {
          professeurId: professeur_id,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      return Math.floor(response.status / 100) == 2;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-class-assignments"] });
      toast({
        title: "Succès",
        description: "Professeur retiré de la classe avec succès",
      });
    },
    onError: (error) => {
      console.error("Erreur lors du retrait:", error);
      toast({
        title: "Erreur",
        description: `Erreur lors du retrait: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useGetCurrentTeacher = (authUser) => {
  // authUser not ready? Skip the query entirely
  const teacherId = authUser?.id;
  const schoolId = authUser?.schoolId;

  const isEnabled = !!teacherId && !!schoolId;

  return useQuery({
    queryKey: ["currentTeacher", teacherId],
    queryFn: async () => {
      try {
        const accessToken = localStorage.getItem("accessToken");

        const response = await httpClient.get(`/api/auth/me/role/TEACHER`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });

        return response.data;
      } catch (error) {
        const message =
          error.response?.data?.reason || "Erreur lors de la récupération du professeur";
        throw new Error(message);
      }
    },
    enabled: isEnabled, //  only run when both IDs are ready
  });
};

export const useAllTeachers = (authUser) => {
  // authUser not ready? Skip the query entirely
  const schoolId = authUser?.schoolId;

  const isEnabled = !!schoolId;

  return useQuery({
    queryKey: ["teachers"],
    queryFn: async () => {
      try {
        const accessToken = localStorage.getItem("accessToken");

        const response = await httpClient.get(`/api/schools/${schoolId}/teachers`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const allUsers = response.data || [];
        return allUsers.filter((u: any) => {
          if (typeof u.role === "string") return u.role.includes("TEACHER");
          if (Array.isArray(u.roles)) return u.roles.includes("TEACHER");
          if (Array.isArray(u.role)) return u.role.includes("TEACHER");
          return false;
        });
      } catch (error) {
        const message =
          error.response?.data?.reason || "Erreur lors de la récupération du professeur";
        throw new Error(message);
      }
    },
    enabled: isEnabled, //  only run when both IDs are ready
  });
};

// Hook pour modifier une classe
export const useUpdateClass = (authUser) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      classe_id,
      nom,
      niveau,
    }: {
      classe_id: string;
      nom: string;
      niveau: string;
    }) => {
      const accessToken = localStorage.getItem("accessToken");

      const response = await httpClient.put(
        `/api/schools/${authUser.schoolId}/classes/${classe_id}`,
        {
          nom,
          niveau,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      return Math.floor(response.status / 100) == 2;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast({
        title: "Succès",
        description: "Classe modifiée avec succès",
      });
    },
    onError: (error: any) => {
      console.error("Erreur lors de la modification:", error);
      toast({
        title: "Erreur",
        description: `Erreur lors de la modification: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

// Hook pour supprimer une classe
export const useDeleteClass = (authUser) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (classe_id: string) => {
      const accessToken = localStorage.getItem("accessToken");

      const response = await httpClient.delete(
        `/api/schools/${authUser.schoolId}/classes/${classe_id}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      return Math.floor(response.status / 100) == 2;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast({
        title: "Succès",
        description: "Classe supprimée avec succès",
      });
    },
    onError: (error: any) => {
      console.error("Erreur lors de la suppression:", error);
      toast({
        title: "Erreur",
        description: `Erreur lors de la suppression: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateSelfParent = () => {
  const { authUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      prenom,
      nom,
      email,
      telephone,
      profession,
    }: {
      prenom: string;
      nom: string;
      email: string;
      telephone: string;
      profession: string;
    }) => {
      const accessToken = localStorage.getItem("accessToken");

      const response = await httpClient.put(
        `/api/schools/${authUser.schoolId}/parents/${authUser.id}`,
        {
          prenom,
          nom,
          email,
          telephone,
          profession,
          adresse: "",
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      return Math.floor(response.status / 100) == 2;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast({
        title: "Succès",
        description: "Informations modifiée avec succès",
      });
    },
    onError: (error) => {
      console.error("Erreur lors de la modification:", error);
      toast({
        title: "Erreur",
        description: `Erreur lors de la modification: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

// Hooks pour récupérer les admins
export const useAllAdmins = (authUser) => {
  // authUser not ready? Skip the query entirely
  const schoolId = authUser?.schoolId;

  const isEnabled = !!schoolId;

  return useQuery({
    queryKey: ["teachers"],
    queryFn: async () => {
      try {
        const accessToken = localStorage.getItem("accessToken");
        // A revoir
        const response = await httpClient.get(`/api/schools/${schoolId}/teachers`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const allUsers = response.data || [];
        return allUsers.filter((u: any) => {
          if (typeof u.role === "string") return u.role.includes("ADMIN");
          if (Array.isArray(u.roles)) return u.roles.includes("ADMIN");
          if (Array.isArray(u.role)) return u.role.includes("ADMIN");
          return false;
        });
      } catch (error) {
        const message =
          error.response?.data?.reason || "Erreur lors de la récupération du professeur";
        throw new Error(message);
      }
    },
    enabled: isEnabled, //  only run when both IDs are ready
  });
};
export const useGetSchool = () => {
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;

  return useQuery({
    queryKey: ["school", schoolId],
    queryFn: async () => {
      if (!schoolId) return null;
      try {
        const accessToken = localStorage.getItem("accessToken");
        const response = await httpClient.get(`/api/schools/${schoolId}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });
        return response.data;
      } catch (error) {
        console.error("Error fetching school:", error);
        return null;
      }
    },
    enabled: !!schoolId,
  });
};
