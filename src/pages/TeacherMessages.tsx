import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Bell, ArrowLeft, Send, User, Users, Shield, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MessageRecipientSelector from "@/components/MessageRecipientSelector";
import {
  buildConversations,
  fetchMessagesFromAPI,
  groupMessagesByConversation,
  useMessages,
  useSetMessageStatus,
} from "@/hooks/use-message";
import { useGetCoursByProfesseur } from "@/hooks/useCours";
import { useClasses } from "@/hooks/useUsers";
import { SocketContext } from "@/socket/SocketContext";
import { useAuth } from "@/hooks/useAuth";

const TeacherMessages = () => {
  const { socket } = useContext(SocketContext);
  const { authUser } = useAuth();
  const userId = authUser?.id;
  const schoolId = authUser?.schoolId;

  const navigate = useNavigate();
  const [newMessage, setNewMessage] = useState("");
  const [showNewMessageForm, setShowNewMessageForm] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [messageType, setMessageType] = useState<"parents" | "administration">("parents");

  const { data: teacherCourses } = useGetCoursByProfesseur();
  const { data: allClasses } = useClasses();

  // Extract unique classes for the teacher
  const teacherClasses = useMemo(() => {
    const uniqueClasses = new Map();

    // Add classes from courses
    if (teacherCourses) {
      teacherCourses.forEach(course => {
        if (course.classe && !uniqueClasses.has((course.classe?.id || course.classeId))) {
          uniqueClasses.set((course.classe?.id || course.classeId), {
            id: (course.classe?.id || course.classeId),
            nom: (course.classe?.nom || course.classeName || course.className),
            niveau: (course.classe?.niveau || course.classeNiveau || course.classNiveau)
          });
        }
      });
    }

    // Add classes from direct assignments
    if (allClasses) {
      const assignedClasses = allClasses.filter((c: any) => c.professeurs?.some((p: any) => p.professeurId === userId));
      assignedClasses.forEach((cls: any) => {
        if (cls && !uniqueClasses.has(cls.id)) {
          uniqueClasses.set(cls.id, {
            id: cls.id,
            nom: cls.nom,
            niveau: cls.niveau
          });
        }
      });
    }

    return Array.from(uniqueClasses.values());
  }, [teacherCourses, allClasses, userId]);

  const updateMessageReadStatus = useSetMessageStatus();

  const [groupedConversations, setGroupedConversations] = useState<Record<string, any[]>>({});
  const { data: dbConversation } = useMessages();
  // ... (rest of the file remains similar until the return statement)

  // inside return statement
  <MessageRecipientSelector
    userRole="teacher"
    messageType={messageType}
    onRecipientsChange={setSelectedRecipients}
    availableClasses={teacherClasses}
  />

  const refetchConversations = async () => {
    const freshData = await fetchMessagesFromAPI(schoolId, userId); // Or socket or Prisma endpoint
    const grouped = groupMessagesByConversation(freshData);
    setGroupedConversations(grouped); // your own state for convos
  };
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState(null);

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

  // Auto-scroll to bottom when conversation changes or new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConversation?.messages]);

  // Listen for incoming messages - optimized
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (newMessage: any) => {
      // Update conversations immediately without full refetch
      setGroupedConversations((prev) => {
        const key = [newMessage.senderId, newMessage.receiverId].sort().join("_");
        const existingConvo = prev[key] || [];
        return {
          ...prev,
          [key]: [...existingConvo, newMessage],
        };
      });
    };

    socket.on("receive_message", handleReceiveMessage);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
    };
  }, [socket]);

  const getIcon = (type: string[]) => {
    if (type.includes("ADMIN")) {
      return <Shield className="w-4 h-4" />;
    }
    if (type.includes("PARENT")) {
      return <Users className="w-4 h-4" />;
    }
    if (type.includes("TEACHER")) {
      return <User className="w-4 h-4" />;
    }
  };
  console.log("ggg", conversations);

  const handleReplyMessage = async () => {
    if (newMessage.trim() && selectedConversation != null) {
      const messagePayload = {
        receiverId: selectedConversation.fromId,
        text: newMessage,
      };
      socket.emit("send_message", messagePayload);

      // Clear immediately for better UX
      setNewMessage("");
    }
  };

  const handleSendNewMessage = () => {
    console.log("msg", newMessage);
    console.log("recip", selectedConversation);
    if (newMessage.trim() && selectedRecipients.length > 0) {
      for (const recipient of selectedRecipients) {
        const messagePayload = {
          receiverId: recipient.id,
          text: newMessage,
        };

        socket.emit("send_message", messagePayload);
      }

      // Réinitialiser le formulaire
      setNewMessage("");
      setSelectedRecipients([]);
      setShowNewMessageForm(false);

      // Ici, vous ajouteriez la logique pour envoyer le message
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/teacher-dashboard")}
            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Messagerie
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
              Communication avec parents et administration
            </p>
          </div>
          <Button onClick={() => setShowNewMessageForm(!showNewMessageForm)}>
            <Plus className="w-4 h-4 mr-2" />
            Nouveau Message
          </Button>
        </div>

        {/* Formulaire nouveau message */}
        {showNewMessageForm && (
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Nouveau Message</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                Composer un message pour les parents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block text-gray-900 dark:text-white">
                    Type de destinataire
                  </label>
                  <select
                    className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={messageType}
                    onChange={(e) => {
                      const newMessageType = e.target.value as "parents" | "administration";
                      setMessageType(newMessageType);
                      setSelectedRecipients([]);
                    }}>
                    <option value="parents">Parents d'élèves</option>
                    <option value="administration">Administration</option>
                  </select>
                </div>

                <MessageRecipientSelector
                  userRole="teacher"
                  messageType={messageType}
                  onRecipientsChange={setSelectedRecipients}
                  availableClasses={teacherClasses}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block text-gray-900 dark:text-white">
                  Message
                </label>
                <Textarea
                  placeholder="Tapez votre message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="resize-none min-h-32 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowNewMessageForm(false)}
                  className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600">
                  Annuler
                </Button>
                <Button
                  onClick={handleSendNewMessage}
                  disabled={!newMessage.trim() || selectedRecipients.length === 0}>
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversations List */}
          <Card className="lg:col-span-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                <Bell className="w-5 h-5" />
                Conversations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    className={`p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${conv.unread
                      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700"
                      : "bg-white dark:bg-gray-800"
                      }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getIcon(conv.fromType)}
                        <div>
                          <h4 className="font-medium text-sm text-gray-900 dark:text-white">
                            {conv.from}
                          </h4>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {conv.date}
                        </span>
                        {conv.unread && (
                          <Badge variant="default" className="ml-2 h-2 w-2 p-0 rounded-full" />
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
                      {conv.lastMessage}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Chat Area */}
          {selectedConversation && (
            <Card className="lg:col-span-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">
                  {selectedConversation.from}
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-300">
                  Conversation avec un Admin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 h-96 overflow-y-auto mb-4">
                  {selectedConversation.messages?.map((msg, index) => (
                    <React.Fragment key={index}>
                      {/* Message from teacher (right aligned) */}
                      {msg.from == "Moi" && (
                        <div className="flex justify-end">
                          <div className="bg-blue-500 text-white p-3 rounded-lg max-w-xs">
                            <p className="text-sm">{msg.content}</p>
                            <span className="text-xs opacity-75 mt-1 block">{msg.date}</span>
                          </div>
                        </div>
                      )}

                      {/* Message from parent (left aligned) */}
                      {msg.from !== "Moi" && (
                        <div className="flex justify-start">
                          <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg max-w-xs">
                            <p className="text-sm text-gray-900 dark:text-white">{msg.content}</p>
                            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">
                              {msg.date?.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Tapez votre message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="resize-none bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    rows={3}
                  />
                  <Button size="sm" className="self-end" onClick={handleReplyMessage}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
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

export default TeacherMessages;
