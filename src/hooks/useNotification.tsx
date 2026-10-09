import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import httpClient from "@/api/htppClient";
import { apiUrl } from "@/integrations/supabase/host";

export interface AppNotification {
  id: string;
  senderId: string;
  receiverId: string;
  receiverType: string;
  opened: boolean;
  type: string;
  time: string; // ISO timestamp
  urgent: boolean;
  content: string;
  schoolId?: string;
}
/**
 * Fetches all notifications for a specific user within a school.
 * @returns A query object containing the list of notifications.
 */
export const useGetNotifications = () => {
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;
  const userId = authUser?.id;

  return useQuery<AppNotification[]>({
    queryKey: ["notifications", schoolId, userId],
    queryFn: async () => {
      const { data } = await httpClient.get(
        `/api/schools/${schoolId}/notifications/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );
      return data ?? [];
    },
    enabled: !!schoolId && !!userId,
  });
};

export const useUpdateNotificationStatus = () => {
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      if (!schoolId) throw new Error("School ID is missing");

      const { data } = await httpClient.put(
        `/api/schools/${schoolId}/notifications/${notificationId}/read`,
        {}, // No body required
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      return data;
    },
    onSuccess: (_, notificationId) => {
      // Optional: Update the cached notifications in React Query
      queryClient.setQueryData(["notifications", schoolId, authUser?.id], (oldData: any) =>
        oldData?.map((n: any) => (n.id === notificationId ? { ...n, opened: true } : n))
      );
    },
  });
};
