import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiUrl } from "@/integrations/supabase/host";
import httpClient from "@/api/htppClient";

interface UpdateSchoolBodyRequest {
  name: string;
  email: string;
  telephone: string;
  siteWeb: string;
  adresse: string;
}

export const useSchoolData = () => {
  const { authUser } = useAuth();

  const useGetSchool = () => {
    return useQuery({
      queryKey: ["schools", authUser?.schoolId],
      queryFn: async () => {
        if (!authUser?.schoolId) {
          throw new Error("Utilisateur non connecté ou école non définie");
        }

        const accessToken = localStorage.getItem("accessToken");

        const response = await httpClient.get(`/api/schools/${authUser.schoolId}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const res = response.data;
        if (Math.floor(response.status / 100) !== 2) {
          throw new Error(res.message || "Erreur lors de la récupération de l'école");
        }

        return res;
      },
      enabled: !!authUser?.schoolId, // avoids running if not logged in
    });
  };

  const useUpdateSchool = () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (schoolData: UpdateSchoolBodyRequest) => {
        if (!authUser?.schoolId) {
          throw new Error("Utilisateur non connecté ou école non définie");
        }

        const updateSchool = {
          name: schoolData.name,
          email: schoolData.email,
          telephone: schoolData.telephone,
          siteWeb: schoolData.siteWeb,
          adresse: schoolData.adresse,
        };
        try {
          const accessToken = localStorage.getItem("accessToken");
          const response = await httpClient.put(
            `/api/schools/${authUser.schoolId}`,
            updateSchool,
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );
          return Math.floor(response.status / 100) === 2;
        } catch (error) {
          // Extract error message if available
          const message =
            error.response?.data?.message ||
            error.message ||
            `Erreur lors de la mise à jour de l'école ${schoolData.name}`;
          throw new Error(message);
        }
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["schools", authUser?.schoolId] });
      },
      onError: (error) => {
        console.error(`Erreur lors de la mise à jour de l'école`, error);
        return false;
      },
    });
  };

  return {
    useUpdateSchool,
    useGetSchool,
  };
};

export const useUpdateSchoolReportCounter = () => {
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;

  return useMutation({
    mutationFn: async () => {
      if (!schoolId) {
        throw new Error("School ID is not available.");
      }

      const { data } = await httpClient.put(
        `/api/schools/${schoolId}/counters/schoolReport`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        }
      );
      return data;
    },
    onSuccess: () => { },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.reason || "Error while updating the counter.";
      console.log("error", errorMessage);
    },
  });
};

export const useUpdateStudentReportCounter = () => {
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;

  return useMutation({
    mutationFn: async () => {
      if (!schoolId) {
        throw new Error("School ID is not available.");
      }

      const { data } = await httpClient.put(
        `/api/schools/${schoolId}/counters/studentReport`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        }
      );
      return data;
    },
    onSuccess: () => { },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.reason || "Error while updating the counter.";
      console.log("error", errorMessage);
    },
  });
};
