import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Bell,
  Calendar,
  BookOpen,
  MessageCircle,
  User,
  Home,
  TrendingUp,
  ChevronDown,
  UserCog,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ChildInfo from "@/components/parent/ChildInfo";
import DashboardOverview from "@/components/parent/DashboardOverview";
import GradesTab from "@/components/parent/GradesTab";
import ScheduleTab from "@/components/parent/ScheduleTab";
import ChatTab from "@/components/parent/ChatTab";
import LogoutButton from "@/components/LogoutButton";
import ThemeToggle from "@/components/ThemeToggle";
import { useGetCurrentParent } from "@/hooks/useParents";
import { getNextClass, transformCoursesToParents, useGetCoursByClasse } from "@/hooks/useCours";
import { EvaluationType, useEvaluationsByClasse } from "@/hooks/use-evaluation";
import { useSchoolLogo } from "@/hooks/useSchoolLogo";
import { useSocket } from "@/socket/SocketContext";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useGetNotesByStudentId } from "@/hooks/useNotes";

type GradeEntry = {
  subject: string;
  grade: number;
  coefficient: number;
  date: string;
  rawDate: string;
  appreciation?: string;
  devoir?: boolean;
  semester?: string;
};

const ParentDashboard = () => {
  const navigate = useNavigate();
  const { authUser } = useAuth();
  const { data: currentParrent, isLoading, error } = useGetCurrentParent();
  const [activeTab, setActiveTab] = useState("dashboard");
  const schoolLogo = useSchoolLogo();

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Simuler les rôles multiples - en réalité cela viendrait de la base de données
  const hasTeacherRole = authUser?.role.includes("TEACHER"); // Simuler que ce parent est aussi professeur
  const hasAdminRole = authUser?.role.includes("ADMIN"); // Simuler que ce parent est aussi admin

  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [grades, setGrades] = useState<GradeEntry[]>([]);

  const { data: schedule } = useGetCoursByClasse(selectedChild?.classeId);
  const { data: nextEvaluation } = useEvaluationsByClasse(selectedChild?.classeId);
  const { data: selectedChildGrades } = useGetNotesByStudentId(selectedChild?.id);

  const socket = useSocket();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleNotificationClick = (notificationId: number) => {
    setActiveTab("notifications");
  };

  useEffect(() => {
    if (currentParrent?.children?.length > 0) {
      setSelectedChild(currentParrent.children[0]);
    }
  }, [currentParrent]);

  useEffect(() => {
    const cleaned = selectedChildGrades?.map((note: any) => ({
      subject: note.discipline?.name || note.disciplineName || "Matière inconnue",
      grade: note.note,
      coefficient: note.coefficient,
      date: formatDate(note.date),
      rawDate: note.date,
      appreciation: note.appreciation || undefined,
      devoir: note.devoir, // Map the devoir field
      semester: note.semester,
    }));

    setGrades(cleaned || []);
  }, [selectedChild, selectedChildGrades]);

  // Socket.IO listener for real-time notifications
  useEffect(() => {
    if (!socket || !selectedChild) return;

    // Join the class room to receive broadcasts
    if (selectedChild.classeId) {
      console.log("Joining room:", selectedChild.classeId);
      socket.emit("join", selectedChild.classeId);
    }

    const handleNotification = (newNotification: any) => {
      console.log("Notification reçue:", newNotification);

      // Handle homework notifications
      if (
        newNotification.type === "homework" &&
        newNotification.classeId === selectedChild.classeId
      ) {
        toast({
          title: "📚 Nouvel exercice !",
          description: `${newNotification.title} - ${newNotification.subject}`,
        });
        queryClient.invalidateQueries({ queryKey: ["evaluations"] });
      }

      // Add to general notifications list
      setNotifications((prev) => [newNotification, ...prev]);
    };

    socket.on("receive_notification", handleNotification);
    socket.on("notification", handleNotification);
    socket.on("new-homework", handleNotification); // Keep legacy event if needed

    return () => {
      socket.off("receive_notification", handleNotification);
      socket.off("notification", handleNotification);
      socket.off("new-homework", handleNotification);
    };
  }, [socket, selectedChild, toast, queryClient]);

  if (isLoading || !currentParrent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-red-500">
        Une erreur est survenue lors du chargement des données.
      </div>
    );
  }

  if (!selectedChild) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">
        Aucun enfant associé à ce compte.
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const weeklySchedule = transformCoursesToParents(schedule);
  const weekDays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

  const now = new Date();
  const coursesOfToday = weeklySchedule[weekDays[now.getDay() - 1]];
  const nextClass = getNextClass(coursesOfToday);

  const latestGrades = grades
    ?.slice()
    .sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime())
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center py-3 sm:py-4 gap-2">
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
              <img src={schoolLogo} alt="Logo" className="h-8 w-8 sm:h-10 sm:w-10 object-contain" />
              <div className="min-w-0 flex-1">
                <h1 className="text-sm sm:text-lg lg:text-2xl font-bold text-gray-900 dark:text-white truncate">
                  Espace Parent
                </h1>
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 hidden sm:inline">
                    Suivi de
                  </span>
                  {currentParrent.children.length > 1 ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2 h-6 px-2 text-xs">
                          <span>{selectedChild?.prenom}</span>
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        className="w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        {currentParrent.children.map((child) => (
                          <DropdownMenuItem
                            key={child.id}
                            onClick={() => setSelectedChild(child)}
                            className={`flex items-center gap-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${selectedChild?.id === child.id ? "bg-blue-50 dark:bg-blue-900/20" : ""
                              }`}>
                            <User className="w-4 h-4" />
                            <div>
                              <div className="font-medium">{child.prenom}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {child.class}
                              </div>
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">
                      {selectedChild?.prenom}
                    </span>
                  )}
                </div>
              </div>

              {/* Dropdown pour changer de rôle */}
              {(hasTeacherRole || hasAdminRole) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm flex-shrink-0">
                      <User className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden md:inline">Changer de vue</span>
                      <span className="md:hidden">Rôle</span>
                      <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <DropdownMenuItem
                      onClick={() => navigate("/parent-dashboard")}
                      className="flex items-center gap-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                      <User className="w-4 h-4" />
                      Vue Parent (actuelle)
                    </DropdownMenuItem>
                    {hasTeacherRole && (
                      <DropdownMenuItem
                        onClick={() => navigate("/teacher-dashboard")}
                        className="flex items-center gap-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                        <UserCog className="w-4 h-4" />
                        Portail Professeur
                      </DropdownMenuItem>
                    )}
                    {hasAdminRole && (
                      <DropdownMenuItem
                        onClick={() => navigate("/admin-dashboard")}
                        className="flex items-center gap-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                        <UserCog className="w-4 h-4" />
                        Portail Administration
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="relative p-1 sm:p-2 h-7 w-7 sm:h-8 sm:w-8">
                    <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" />
                    {notifications.length > 0 && (
                      <Badge className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs px-1 min-w-[0.875rem] h-3.5 flex items-center justify-center rounded-full">
                        {notifications.filter((n) => n.urgent).length}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[350px] sm:w-[400px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <SheetHeader>
                    <SheetTitle className="text-gray-900 dark:text-white">
                      Notifications récentes
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-3">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 rounded-lg border-l-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${notification.urgent
                            ? "bg-red-50 dark:bg-red-900/20 border-red-500"
                            : "bg-blue-50 dark:bg-blue-900/20 border-blue-500"
                          }`}
                        onClick={() => handleNotificationClick(notification.id)}>
                        <div className="flex items-start justify-between">
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            {notification.message}
                          </p>
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                            {notification.time}
                          </span>
                        </div>
                        {notification.urgent && (
                          <Badge className="mt-2 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs">
                            Urgent
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>
              <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 hidden sm:block"></div>
              <ThemeToggle />
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-7">
        {selectedChild && <ChildInfo childInfo={selectedChild} />}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 gap-0.5 sm:gap-1 p-0">
            <TabsTrigger
              value="dashboard"
              className={`flex flex-col sm:flex-row items-center justify-center sm:space-y-0 sm:space-x-1 lg:space-x-2 text-xs sm:text-sm py-2 px-1 sm:px-2 transition-all ${activeTab === "dashboard"
                  ? "bg-blue-500 text-white shadow-md"
                  : "hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 text-gray-700 dark:text-gray-300"
                }`}>
              <Home className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">Accueil</span>
            </TabsTrigger>
            <TabsTrigger
              value="grades"
              className={`flex flex-col sm:flex-row items-center justify-center sm:space-y-0 sm:space-x-1 lg:space-x-2 text-xs sm:text-sm py-2 px-1 sm:px-2 transition-all ${activeTab === "grades"
                  ? "bg-green-500 text-white shadow-md"
                  : "hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 text-gray-700 dark:text-gray-300"
                }`}>
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">Notes</span>
            </TabsTrigger>
            <TabsTrigger
              value="schedule"
              className={`flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-1 lg:space-x-2 text-xs sm:text-sm py-2 px-1 sm:px-2 transition-all ${activeTab === "schedule"
                  ? "bg-purple-500 text-white shadow-md"
                  : "hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 text-gray-700 dark:text-gray-300"
                }`}>
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">Planning</span>
            </TabsTrigger>
            <TabsTrigger
              value="chat"
              className={`flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-1 lg:space-x-2 text-xs sm:text-sm py-2 px-1 sm:px-2 transition-all ${activeTab === "chat"
                  ? "bg-teal-500 text-white shadow-md"
                  : "hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:text-teal-600 dark:hover:text-teal-400 text-gray-700 dark:text-gray-300"
                }`}>
              <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">Chat</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <DashboardOverview
              nextCourse={nextClass}
              latestGrades={latestGrades}
              nextEvaluation={nextEvaluation || []}
              upcomingExercises={[]} // We pass everything in nextEvaluation now
            />
          </TabsContent>

          <TabsContent value="grades" className="space-y-6">
            <GradesTab
              grades={grades}
              classeId={selectedChild?.classeId}
              studentId={selectedChild?.id}
            />
          </TabsContent>

          <TabsContent value="schedule" className="space-y-6">
            <ScheduleTab weekSchedule={weeklySchedule} />
          </TabsContent>

          <TabsContent value="chat" className="space-y-6">
            <ChatTab
              children={currentParrent.children}
              selectedChild={selectedChild}
              onSelectChild={setSelectedChild}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ParentDashboard;
