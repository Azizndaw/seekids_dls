import React, { useContext, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, MessageCircle, User, Users, GraduationCap } from "lucide-react";
import ChildSelector from "./ChildSelector";
import { useAuth } from "@/hooks/useAuth";
import { SocketContext } from "@/socket/SocketContext";
import {
  buildConversations,
  fetchMessagesFromAPI,
  groupMessagesByConversation,
  useMessages,
  useSetMessageStatus,
} from "@/hooks/use-message";
import { useGetCoursByClasse } from "@/hooks/useCours";
import { useAllAdmins } from "@/hooks/useUsers";

interface Child {
  id: string;
  prenom: string;
  nom: string;
  classe: { id: string; nom: string; niveau: string };
  photo: string;
  average: number;
  absences: number;
  delays: number;
}

interface ChatTabProps {
  children: Child[];
  selectedChild: Child;
  onSelectChild: (child: Child) => void;
}

const ChatTab = ({ children, selectedChild, onSelectChild }: ChatTabProps) => {
  const { socket } = useContext(SocketContext);
  const { authUser } = useAuth();
  const userId = authUser?.id;
  const schoolId = authUser?.schoolId;
  const [groupedConversations, setGroupedConversations] = useState<Record<string, any[]>>({});
  const [selectedConversation, setSelectedConversation] = useState(null);

  const { data: admins } = useAllAdmins(authUser);
  const { data: dbConversation } = useMessages();
  const updateMessageReadStatus = useSetMessageStatus();

  // Fetch courses to identify teachers
  const { data: classCourses } = useGetCoursByClasse(selectedChild?.classe?.id || selectedChild?.classeId);
  const [teacherConversations, setTeacherConversations] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [selectedContactType, setSelectedContactType] = useState("teachers");

  useEffect(() => {
    if (classCourses) {
      // Extract unique teachers from courses
      const uniqueTeachersMap = new Map();

      classCourses.forEach(course => {
        if (course.professeur && !uniqueTeachersMap.has((course.professeur?.id || course.professeurId || course.teacherId))) {
          uniqueTeachersMap.set((course.professeur?.id || course.professeurId || course.teacherId), {
            id: (course.professeur?.id || course.professeurId || course.teacherId),
            teacher: `Prof. ${(course.professeur?.prenom || course.professeurPrenom || course.teacherPrenom)} ${(course.professeur?.nom || course.professeurNom || course.teacherNom)}`,
            subject: (course.discipline?.name || course.disciplineName),
            lastMessage: "Cliquez pour démarrer une conversation", // Placeholder
            time: "",
            unread: false,
            childId: selectedChild.id,
            fromId: (course.professeur?.id || course.professeurId || course.teacherId), // Important for linking to conversation
            from: `Prof. ${(course.professeur?.prenom || course.professeurPrenom || course.teacherPrenom)} ${(course.professeur?.nom || course.professeurNom || course.teacherNom)}`
          });
        }
      });

      setTeacherConversations(Array.from(uniqueTeachersMap.values()));
    }
  }, [classCourses, selectedChild]);

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

  // Merge existing conversations with potential teacher and admin contacts
  const conversations = useMemo(() => {
    const activeConversations = buildConversations(groupedConversations, userId);

    // Create a map of existing conversation partner IDs for quick lookup
    const existingPartners = new Set(activeConversations.map(c => c.fromId));

    // Add teachers from schedule who don't have an active conversation yet
    const potentialTeacherConversations = teacherConversations.filter(t => !existingPartners.has(t.id)).map(t => ({
      id: `new_${t.id}`,
      from: t.teacher,
      fromId: t.id,
      fromType: "teacher",
      lastMessage: "Cliquez pour démarrer une conversation",
      date: new Date().toISOString(),
      unread: false,
      messages: [],
      isPotential: true // Flag to identify these are not real conversations yet
    }));

    // Add admins who don't have an active conversation yet
    const potentialAdminConversations = (admins || []).filter(a => !existingPartners.has(a.id)).map(a => ({
      id: `new_${a.id}`,
      from: `Admin. ${(a.prenom || "")} ${(a.nom || "")}`.trim(),
      fromId: a.id,
      fromType: "ADMIN",
      lastMessage: "Cliquez pour démarrer une conversation",
      date: new Date().toISOString(),
      unread: false,
      messages: [],
      isPotential: true
    }));

    return [...activeConversations, ...potentialTeacherConversations, ...potentialAdminConversations];
  }, [groupedConversations, userId, teacherConversations, admins]);

  // Use the merged conversations list directly
  const currentConversations = useMemo(() => {
    return conversations.filter(conv => {
      if (selectedContactType === "teachers") {
        return conv.fromType === "teacher" || (Array.isArray(conv.fromType) && conv.fromType.includes("TEACHER"));
      } else {
        return conv.fromType === "ADMIN" || (Array.isArray(conv.fromType) && conv.fromType.includes("ADMIN"));
      }
    });
  }, [conversations, selectedContactType]);

  console.log("Curr", currentConversations);

  const [chat] = useState([
    {
      id: 1,
      sender: "Prof. Cheikh Diop",
      message: "Bonjour, j'aimerais vous parler des progrès de " + selectedChild.prenom + ".",
      time: "14:00",
      isTeacher: true,
    },
    {
      id: 2,
      sender: "Vous",
      message: "Bonjour Professeur, je vous écoute.",
      time: "14:05",
      isTeacher: false,
    },
    {
      id: 3,
      sender: "Prof. Cheikh Diop",
      message:
        selectedChild.prenom +
        " a fait d'excellents progrès cette semaine. Elle participe beaucoup plus en classe.",
      time: "14:30",
      isTeacher: true,
    },
  ]);

  const handleSendMessage = async () => {
    const textToSend = message.trim();
    if (!textToSend || !selectedConversation) return;

    // Optimistic Update
    const optimMessage = {
      id: "temp_" + Date.now(),
      from: "Moi",
      content: textToSend,
      date: new Date().toISOString(),
      senderId: userId,
    };

    // Update the selected conversation UI immediately
    setSelectedConversation((prev) => ({
      ...prev,
      messages: [...(prev?.messages || []), optimMessage],
      lastMessage: textToSend,
      date: new Date().toISOString()
    }));

    // Clear input immediately
    setMessage("");

    // Emit Socket Event
    const messagePayload = {
      receiverId: selectedConversation.fromId,
      text: textToSend,
    };

    console.log("Sending message to:", selectedConversation.fromId);
    socket.emit("send_message", messagePayload);

    // Background Refetch to sync real state
    setTimeout(() => {
      refetchConversations();
    }, 1000);
  };

  const handleContactTypeChange = (type: string) => {
    setSelectedContactType(type);

    // Filter conversations based on the selected type
    const newConversations = conversations.filter(conv => {
      if (type === "teachers") {
        return conv.fromType === "teacher" || (Array.isArray(conv.fromType) && conv.fromType.includes("TEACHER"));
      } else {
        return conv.fromType === "ADMIN" || (Array.isArray(conv.fromType) && conv.fromType.includes("ADMIN"));
      }
    });

    selectConversation(newConversations[0] || null);
  };

  return (
    <div className="space-y-4">
      <ChildSelector
        children={children}
        selectedChild={selectedChild}
        onSelectChild={onSelectChild}
      />

      <div className="flex items-center space-x-4 mb-4">
        <MessageCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <Select value={selectedContactType} onValueChange={handleContactTypeChange}>
          <SelectTrigger className="w-48 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
            <SelectValue placeholder="Type de contact" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <SelectItem
              value="teachers"
              className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">
              <div className="flex items-center space-x-2">
                <GraduationCap className="h-4 w-4" />
                <span>Professeurs</span>
              </div>
            </SelectItem>
            <SelectItem
              value="administration"
              className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Administration</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 h-[600px]">
        {/* Liste des conversations */}
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg text-gray-900 dark:text-white">
              <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
              <span>{selectedContactType === "teachers" ? "Professeurs" : "Administration"}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {currentConversations.length > 0 ? (
                currentConversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors border ${selectedConversation?.id === conv.id
                      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-600"
                      : "hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800"
                      }`}
                    onClick={() => selectConversation(conv)}>
                    <div className="flex items-start space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs">
                          {conv.from
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                            {conv.from}
                          </p>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {conv.date}
                          </span>
                        </div>
                        {selectedContactType === "administration" && (
                          <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">
                            {conv.from}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {conv.lastMessage}
                        </p>
                        {conv.unread && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    Aucune conversation pour {`${selectedChild.prenom} ${selectedChild.nom}`}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Zone de chat */}
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg lg:col-span-2">
          {selectedConversation ? (
            <>
              <CardHeader className="pb-3 border-b border-gray-200 dark:border-gray-700">
                <CardTitle className="text-base sm:text-lg text-gray-900 dark:text-white">
                  {selectedConversation.from}
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-300">
                  {selectedConversation.from}
                  {selectedChild.prenom} ({(selectedChild.classe?.niveau || selectedChild.classeNiveau || selectedChild.classNiveau)} {(selectedChild.classe?.nom || selectedChild.classeName || selectedChild.className)})
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 flex flex-col h-full">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-3 mb-4 max-h-96">
                  {selectedConversation.messages?.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex ${msg.from !== "Moi" ? "justify-start" : "justify-end"}`}>
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${msg.from !== "Moi"
                          ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                          : "bg-blue-500 text-white"
                          }`}>
                        <p className="text-sm">{msg.content}</p>
                        <p
                          className={`text-xs mt-1 ${msg.from !== "Moi"
                            ? "text-gray-500 dark:text-gray-400"
                            : "text-blue-100"
                            }`}>
                          {msg.date}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Zone de saisie */}
                <div className="flex space-x-2">
                  <Input
                    placeholder="Tapez votre message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    className="flex-1 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                  <Button onClick={handleSendMessage} size="sm">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Sélectionnez une conversation pour commencer</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ChatTab;
