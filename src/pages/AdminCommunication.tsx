import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Users, Bell, Send, MessageCircle, ArrowLeft, Inbox, Reply, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MessageRecipientSelector from "@/components/MessageRecipientSelector";
import { SocketContext } from "@/socket/SocketContext";
import {
  buildConversations,
  fetchMessagesFromAPI,
  groupMessagesByConversation,
  useMessages,
  useSetMessageStatus,
} from "@/hooks/use-message";
import { useAuth } from "@/hooks/useAuth";
import { useGetAllCours } from "@/hooks/useCours";

const AdminCommunication = () => {
  const { socket } = useContext(SocketContext);
  const { authUser } = useAuth();
  const userId = authUser?.id;
  const schoolId = authUser?.schoolId;

  const navigate = useNavigate();
  const [messageContent, setMessageContent] = useState("");
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [messageType, setMessageType] = useState<"parents" | "teachers">("parents");
  const [activeTab, setActiveTab] = useState<"nouveau" | "conversations">("nouveau");
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [groupedConversations, setGroupedConversations] = useState<Record<string, any[]>>({});
  const { data: dbConversation } = useMessages();
  const { data: allCourses } = useGetAllCours();

  // Extract all unique classes in the school
  const allClasses = useMemo(() => {
    if (!allCourses) return [];

    const uniqueClasses = new Map();
    allCourses.forEach(course => {
      if (course.classe && !uniqueClasses.has((course.classe?.id || course.classeId))) {
        uniqueClasses.set((course.classe?.id || course.classeId), {
          id: (course.classe?.id || course.classeId),
          nom: (course.classe?.nom || course.classeName || course.className),
          niveau: (course.classe?.niveau || course.classeNiveau || course.classNiveau)
        });
      }
    });
    return Array.from(uniqueClasses.values());
  }, [allCourses]);

  const updateMessageReadStatus = useSetMessageStatus();

  const selectConversation = async (conversation) => {
    setSelectedConversation(conversation);

    // Destructure messages from the conversation (safely, in case messages is undefined)
    const messages = conversation?.messages || [];

    // Early return if there are no messages
    if (messages.length === 0) return;

    // Get the last message
    const [lastMessage] = messages.slice(-1); // Safer way to get last item
    if (!lastMessage) return;

    // Check if the last sender is "Moi"
    const lastSenderIsMe = lastMessage.from === "Moi";
    if (lastSenderIsMe) return; // Early return if the sender is "Moi"

    // Extract the last message's ID
    const lastMessageId = lastMessage.id;
    if (lastMessageId) {
      // Call the mutation to update message read status
      await updateMessageReadStatus.mutateAsync(lastMessageId);
    }
  };
  const refetchConversations = async () => {
    const freshData = await fetchMessagesFromAPI(schoolId, userId); // Or socket or Prisma endpoint
    const grouped = groupMessagesByConversation(freshData);
    setGroupedConversations(grouped);
  };

  // Group conversations whenever dbConversation changes
  useEffect(() => {
    const groupedConvos = groupMessagesByConversation(dbConversation ?? []);
    setGroupedConversations(groupedConvos);
  }, [dbConversation]);

  const conversations = useMemo(() => {
    return buildConversations(groupedConversations, userId);
  }, [groupedConversations, userId]);

  useEffect(() => {
    if (!selectedConversation) return;

    const updatedConversation = conversations.find((conv) => conv.id === selectedConversation.id);
    if (updatedConversation) {
      selectConversation(updatedConversation);
    }
  }, [conversations]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when conversation changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConversation?.messages]);

  const handleReplyMessage = async () => {
    if (replyMessage.trim() && selectedConversation != null) {
      // Optimistic Update
      const optimMessage = {
        id: "temp_" + Date.now(),
        from: "Moi",
        content: replyMessage,
        date: new Date().toISOString(),
        senderId: userId,
        isAdmin: true, // Tag as admin message
      };

      // Emit Socket Event
      const messagePayload = {
        receiverId: selectedConversation.fromId,
        text: replyMessage,
      };

      socket.emit("send_message", messagePayload);

      // Update Local State Immediately
      setGroupedConversations((prev) => {
        const key = selectedConversation.id;
        const existingConvo = prev[key] || [];
        return {
          ...prev,
          [key]: [...existingConvo, { ...optimMessage, ...messagePayload, senderId: userId }],
        };
      });

      setReplyMessage("");
    }
  };

  const [text, setText] = useState("");

  // Socket.IO listener - optimized
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (newMessage: any) => {
      // Avoid duplicating the optimist message if the ID matches or if it's the one we just sent
      // But usually socket returns a real DB ID.
      // For now, we trust the socket event.
      setGroupedConversations((prev) => {
        const key = [newMessage.senderId, newMessage.receiverId].sort().join("_");
        const existingConvo = prev[key] || [];

        // Check if we already have this message (deduplication)
        const exists = existingConvo.some(m => m.id === newMessage.id);
        if (exists) return prev;

        return {
          ...prev,
          [key]: [...existingConvo, newMessage],
        };
      });
    };

    socket.on("receive_message", handleReceiveMessage);
    return () => socket.off("receive_message", handleReceiveMessage);
  }, [socket]);

  const sendMessage = async () => {
    if (messageContent.trim() && selectedRecipients.length > 0) {
      for (const recipient of selectedRecipients) {

        // Optimistic Update for each recipient
        // Note: This is trickier for new conversations, but we try best effort
        const messagePayload = {
          receiverId: recipient.id,
          text: messageContent,
        };

        socket.emit("send_message", messagePayload);
      }

      // We trigger a refetch here because creating NEW conversations via optimistic UI is complex
      // regarding the conversation ID key generation without all recipient data.
      setTimeout(() => refetchConversations(), 500);

      setMessageContent("");
      setText("");
    }
  };

  if (!socket) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark:bg-background p-3 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate("/admin-dashboard")}
            className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Communication</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Envoyer des messages aux parents et professeurs
            </p>
          </div>
        </div>

        {/* Main Communication Section */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "nouveau" | "conversations")}
          className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="nouveau" className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              Nouveau Message
            </TabsTrigger>
            <TabsTrigger value="conversations" className="flex items-center gap-2">
              <Inbox className="w-4 h-4" />
              Conversations ({conversations.filter((c) => c.unread).length})
            </TabsTrigger>
          </TabsList>

          {/* Nouveau Message Tab */}
          <TabsContent value="nouveau">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Nouveau Message
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Sélectionnez les destinataires et rédigez votre message
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 sm:p-6 border-t">
                <div className="space-y-6">
                  <Tabs
                    value={messageType}
                    onValueChange={(value) => {
                      setMessageType(value as "parents" | "teachers");
                      setSelectedRecipients([]);
                    }}
                    className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="parents" className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Parents
                      </TabsTrigger>
                      <TabsTrigger value="teachers" className="flex items-center gap-2">
                        <Bell className="w-4 h-4" />
                        Professeurs
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="parents" className="space-y-4">
                      <MessageRecipientSelector
                        userRole="admin"
                        messageType="parents"
                        onRecipientsChange={setSelectedRecipients}
                        availableClasses={allClasses}
                      />
                    </TabsContent>

                    <TabsContent value="teachers" className="space-y-4">
                      <MessageRecipientSelector
                        userRole="admin"
                        messageType="teachers"
                        onRecipientsChange={setSelectedRecipients}
                      />
                    </TabsContent>
                  </Tabs>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Contenu du message</label>
                    <Textarea
                      placeholder="Tapez votre message..."
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      className="resize-none min-h-40"
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => navigate("/admin-dashboard")}>
                      Annuler
                    </Button>
                    <Button
                      onClick={sendMessage}
                      disabled={!messageContent.trim() || selectedRecipients.length === 0}>
                      <Send className="w-4 h-4 mr-2" />
                      Envoyer le Message
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Conversations Tab */}
          <TabsContent value="conversations">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Liste des conversations */}
              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Inbox className="w-5 h-5" />
                    Messages reçus
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-96">
                    <div className="space-y-2 p-4">
                      {conversations.map((conversation) => (
                        <div
                          key={conversation.id}
                          className={`p-3 border rounded-lg cursor-pointer hover:bg-muted transition-colors ${selectedConversation?.id === conversation.id
                            ? "bg-accent border-primary"
                            : ""
                            }`}
                          onClick={() => selectConversation(conversation)}>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{conversation.from}</span>
                              <Badge
                                variant={
                                  conversation.fromType === "parent" ? "default" : "secondary"
                                }
                                className="text-xs">
                                {conversation.fromType === "parent" ? "Parent" : "Professeur"}
                              </Badge>
                              {conversation.unread && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(conversation.date).toLocaleDateString("fr-FR")}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {conversation.lastMessage}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Détail de la conversation */}
              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="text-lg">
                    {selectedConversation
                      ? `Conversation avec ${selectedConversation?.from}`
                      : `Conversation avec ${selectedConversation?.from}`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {selectedConversation ? (
                    <>
                      <ScrollArea className="h-64 mb-4">
                        <div className="space-y-3">
                          {selectedConversation.messages.map((message: any) => (
                            <div
                              key={message.id}
                              className={`p-3 rounded-lg ${message.isAdmin ? "bg-primary/10 ml-4" : "bg-muted mr-4"
                                }`}>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-medium">{message.from}</span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(message.date).toLocaleString("fr-FR")}
                                </span>
                              </div>
                              <p className="text-sm">{message.content}</p>
                            </div>
                          ))}
                          <div ref={messagesEndRef} />
                        </div>
                      </ScrollArea>

                      <div className="space-y-3">
                        <Textarea
                          placeholder="Tapez votre réponse..."
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          className="resize-none min-h-20"
                        />
                        <Button
                          onClick={handleReplyMessage}
                          disabled={!replyMessage.trim()}
                          className="w-full">
                          <Reply className="w-4 h-4 mr-2" />
                          Répondre
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      Sélectionnez une conversation pour voir les détails
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );

  // return (
  //   <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-center px-4">
  //     <div className="max-w-md">
  //       <div className="text-yellow-500 text-6xl mb-4">🚧</div>
  //       <h1 className="text-3xl font-bold mb-2 text-gray-800">Page en construction</h1>
  //       <p className="text-gray-600 mb-6">
  //         Cette page est en cours de développement. Revenez bientôt pour découvrir les nouveautés !
  //       </p>
  //       <button
  //         onClick={() => window.history.back()}
  //         className="px-6 py-2 rounded-md bg-yellow-500 text-white hover:bg-yellow-600 transition">
  //         Retour
  //       </button>
  //     </div>
  //   </div>
  // );
};

export default AdminCommunication;
