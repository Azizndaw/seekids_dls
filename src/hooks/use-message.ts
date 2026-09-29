import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import httpClient from "@/api/htppClient";
import { apiUrl } from "@/integrations/supabase/host";
import { useToast } from "./use-toast";

// 🔹 Get All
export const useMessages = () => {
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;
  const userId = authUser?.id;

  return useQuery<any[]>({
    queryKey: ["messages"],
    queryFn: async () => {
      const { data } = await httpClient.get(
        `/api/schools/${schoolId}/messages/${userId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        }
      );
      return data;
    },
    enabled: !!schoolId && !!userId,
  });
};

export async function fetchMessagesFromAPI(schoolId: string, userId: string) {
  const { data } = await httpClient.get(`/api/schools/${schoolId}/messages/${userId}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
  });
  return data;
}

/**
 * Updates the status of a message.
 * @returns A mutation object with mutate, isLoading, and error status.
 */
export const useSetMessageStatus = () => {
  const { toast } = useToast();
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;

  return useMutation<boolean, Error, string>({
    mutationFn: async (messageId: string) => {
      if (!schoolId) {
        throw new Error("School ID is not available.");
      }

      const { data } = await httpClient.put(
        `/api/schools/${schoolId}/messages/updateStatus`,
        { messageId },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        }
      );
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Message opened.",
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.reason || "Error while opening the message.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
};

// --------------------
// DATA TRANSFORMATION
// --------------------
/**
 * Function to group messages by conversations
 */
export function groupMessagesByConversation(messages: any[]): Record<string, any[]> {
  const conversations: Record<string, any[]> = {};

  for (const message of messages) {
    const userPairKey = [message.senderId, message.receiverId].sort().join("_");

    if (!conversations[userPairKey]) {
      conversations[userPairKey] = [];
    }

    conversations[userPairKey].push(message);
  }

  return conversations;
}

export function buildConversations(groupedConvos: Record<string, any[]>, userId: string) {
  const conversations = Object.entries(groupedConvos).map(([key, messages]) => {
    // Sort messages by date (oldest to newest)
    const sortedMessages = messages.sort(
      (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
    );

    const lastMessage = sortedMessages[sortedMessages.length - 1];

    // Get the "other user" in this conversation (not the current user)
    const otherUser = lastMessage.senderId === userId ? lastMessage.receiver : lastMessage.sender;

    if (!otherUser) {
      // Fallback if user data is missing
      return {
        id: key,
        from: "Utilisateur Inconnu",
        fromId: "unknown",
        fromType: "unknown",
        lastMessage: lastMessage.content,
        date: new Date(lastMessage.sentAt).toISOString(),
        unread: !lastMessage.read,
        messages: sortedMessages.map((msg) => ({
          id: msg.id,
          from: msg.senderId === userId ? "Moi" : "Inconnu",
          content: msg.content,
          date: new Date(msg.sentAt).toISOString(),
        })),
      };
    }

    const from = `${otherUser.prenom} ${otherUser.nom}`;
    const fromType = otherUser.userRoles; // <- Define how you get user type (parent/teacher)
    const fromId = otherUser.id;

    // Check if there are unread messages for this user
    const unread = !lastMessage.read;

    return {
      id: key,
      from,
      fromId,
      fromType,
      lastMessage: lastMessage.content,
      date: new Date(lastMessage.sentAt).toISOString(),
      unread,
      messages: sortedMessages.map((msg, idx) => ({
        id: msg.id,
        from: msg.senderId === userId ? "Moi" : `${msg.sender.prenom} ${msg.sender.nom}`,
        content: msg.content,
        date: new Date(msg.sentAt).toISOString(),
      })),
    };
  });

  return conversations;
}
