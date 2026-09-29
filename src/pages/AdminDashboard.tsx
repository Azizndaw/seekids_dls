import React, { useContext, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  BookOpen,
  FileText,
  Calendar,
  UserCheck,
  MessageCircle,
  ChevronDown,
  User,
  UserCog,
  Loader2,
  Bell,
  AlertTriangle,
  MessageSquare,
  Shield,
  Settings,
} from "lucide-react";
import AdminAttendanceHistory from "@/components/AdminAttendanceHistory";
import AdminTeacherAttendance from "@/components/AdminTeacherAttendance";
import AdminEvaluationScheduler from "@/components/AdminEvaluationScheduler";
import { JustificationRequestsModal } from "@/components/admin/JustificationRequestsModal";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import LogoutButton from "@/components/LogoutButton";
import ThemeToggle from "@/components/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useSchoolLogo } from "@/hooks/useSchoolLogo";
import { SocketContext } from "@/socket/SocketContext";
import { useGetNotifications, useUpdateNotificationStatus } from "@/hooks/useNotification";

/* =================== Types de notifications (admin) =================== */
type NotificationKind = "absence" | "grades" | "homework";
export interface AppNotification {
  id: string;
  senderId: string;
  receiverId: string;
  receiverType: string;
  opened: boolean;
  type: NotificationKind;
  time: string; // ISO timestamp
  urgent: boolean;
  content: string;
  schoolId?: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { authUser, loading, isAuthenticated } = useAuth();

  const { useGetSchool } = useSchoolData();
  const { data: school, isLoading, error } = useGetSchool();
  const { data: notifications, refetch } = useGetNotifications();
  const markReadMutation = useUpdateNotificationStatus();
  const { t } = useLanguage();
  const schoolLogo = useSchoolLogo();
  const { socket } = useContext(SocketContext);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 15000);

    return () => clearInterval(interval); // Cleanup on unmount
  }, [refetch]);
  // Listen for real-time notifications
  useEffect(() => {
    if (!socket) return;

    const handleNotification = (newNotification: any) => {
      console.log("Notification reçue:", newNotification);
      refetch(); // Immediately refresh the list
    };

    socket.on("receive_notification", handleNotification);
    socket.on("notification", handleNotification); // Écouter les deux formats au cas où

    return () => {
      socket.off("receive_notification", handleNotification);
      socket.off("notification", handleNotification);
    };
  }, [socket, refetch]);

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Erreur: {(error as Error).message}</p>;
  const newId = () =>
    (typeof crypto !== "undefined" && (crypto as any).randomUUID?.()) ||
    Math.random().toString(36).slice(2) + Date.now().toString(36);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || notifications == null || notifications == undefined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (isLoading)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  if (error) return <p>Erreur: {(error as Error).message}</p>;

  const hasParentRole = authUser?.role.includes("PARENT"); // Simuler que cet admin est aussi parent
  const hasTeacherRole = authUser?.role.includes("TEACHER"); // Simuler si l'utilisateur est aussi professeur

  const stats = [
    {
      title: t("total.students"),
      value: school?._count.students,
      icon: Users,
      color: "bg-blue-500 dark:bg-blue-600",
    },
    {
      title: t("total.teachers"),
      value: school?._count.teachers,
      icon: UserCheck,
      color: "bg-green-500 dark:bg-green-600",
    },
    {
      title: t("active.classes"),
      value: school?._count.classes,
      icon: BookOpen,
      color: "bg-purple-500 dark:bg-purple-600",
    },
    {
      title: t("generated.reports"),
      value: school?.schoolreportGenerated,
      icon: FileText,
      color: "bg-orange-500 dark:bg-orange-600",
    },
  ];

  const quickActions = [
    {
      title: t("user.management"),
      description: t("user.management.desc"),
      icon: Users,
      action: () => navigate("/admin-user-management"),
    },
    {
      title: t("communication") || "Communication",
      description: t("communication.desc") || "Messagerie avec les parents/profs",
      icon: MessageCircle,
      action: () => navigate("/admin-communication"),
    },
    {
      title: "Émargement",
      description: "Consulter les présences",
      icon: UserCheck,
      action: () => navigate("/admin-attendance"),
    },
    {
      title: "Rapports Scolaires",
      description: "Consulter les statistiques",
      icon: FileText,
      action: () => navigate("/admin-school-reports"),
    },
    {
      title: "Planning Général",
      description: "Gérer les emplois du temps",
      icon: Calendar,
      action: () => navigate("/admin-general-schedule"),
    },
  ];

  /* =================== NotificationsTab (local, admin) =================== */

  const unreadCount = notifications.filter((n) => !n.opened).length;
  const markAsRead = async (id: string) => await markReadMutation.mutateAsync(id);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const isSameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    const yest = new Date(now);
    yest.setDate(now.getDate() - 1);
    const isYesterday =
      d.getFullYear() === yest.getFullYear() &&
      d.getMonth() === yest.getMonth() &&
      d.getDate() === yest.getDate();

    if (isSameDay) {
      const hh = d.getHours().toString().padStart(2, "0");
      const mm = d.getMinutes().toString().padStart(2, "0");
      return `${hh}:${mm}`;
    }
    if (isYesterday) return "hier";
    return d.toLocaleDateString();
  };

  // Rendu d’une carte “comme ta capture”
  const renderNotifCard = (n: AppNotification) => {
    const isAbsence = n.type === "absence";
    const isGrades = n.type === "grades";
    const isHomework = n.type === "homework";

    // couleurs de bordure à gauche (arrondie)
    const leftColor = isAbsence ? "bg-red-500" : isGrades ? "bg-blue-500" : "bg-gray-400";

    // fond doux selon type
    const softBg = isAbsence
      ? "bg-red-50 dark:bg-red-950/30"
      : isGrades
        ? "bg-blue-50 dark:bg-blue-950/30"
        : "bg-gray-50 dark:bg-gray-800";

    // contenu

    return (
      <button
        key={n.id}
        onClick={() => markAsRead(n.id)}
        className={`w-full text-left p-3 sm:p-4 rounded-xl border border-gray-100 dark:border-gray-700 ${softBg} hover:brightness-95 transition relative`}>
        {/* bordure gauche style "ruban" */}
        <span className={`absolute left-0 top-0 h-full w-1.5 rounded-l-xl ${leftColor}`} />
        <div className="flex items-start gap-3 pr-10">
          <div className="min-w-0 flex-1">
            <div className="text-[15px] sm:text-base font-semibold text-gray-900 dark:text-white">
              {n.content}
            </div>
            {/* Badge Urgent si absence ou marqué urgent */}
            {(n.urgent || isAbsence) && (
              <span className="inline-flex items-center px-2.5 py-1 mt-2 rounded-full text-[11px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                Urgent
              </span>
            )}
          </div>
          <div className="text-xs text-gray-400 select-none">
            {" "}
            {new Date(n.time).toLocaleString()}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-3 sm:p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <img
                  src={schoolLogo}
                  alt="Logo"
                  className="h-8 w-8 sm:h-10 sm:w-10 object-contain"
                />
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {t("admin.dashboard")}
                </h1>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                {`${t("welcome.admin")} ${authUser.prenom} ${authUser.nom}`}
              </p>
            </div>

            {/* Dropdown pour changer de rôle */}
            {(hasParentRole || hasTeacherRole) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">{t("change.view")}</span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <DropdownMenuItem
                    onClick={() => navigate("/admin-dashboard")}
                    className="flex items-center gap-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                    <UserCog className="w-4 h-4" />
                    {t("admin.view")}
                  </DropdownMenuItem>
                  {hasParentRole && (
                    <DropdownMenuItem
                      onClick={() => navigate("/parent-dashboard")}
                      className="flex items-center gap-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                      <User className="w-4 h-4" />
                      {t("parent.portal")}
                    </DropdownMenuItem>
                  )}
                  {hasTeacherRole && (
                    <DropdownMenuItem
                      onClick={() => navigate("/teacher-dashboard")}
                      className="flex items-center gap-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                      <UserCog className="w-4 h-4" />
                      {t("teacher.portal")}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* =============== Cloche -> NotificationsTab (panneau) =============== */}
            <Sheet>
              <SheetTrigger asChild>
                <button
                  className="relative inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  aria-label="Notifications">
                  <Bell className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-gray-800">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>
              </SheetTrigger>

              <SheetContent side="right" className="w-[92vw] sm:w-[420px] p-0">
                <div className="p-4 sm:p-5">
                  <SheetHeader className="mb-2">
                    <SheetTitle className="text-xl font-semibold">
                      Notifications récentes
                    </SheetTitle>
                  </SheetHeader>

                  <div className="max-h-[70vh] overflow-y-auto pr-1 flex flex-col gap-3 sm:gap-4">
                    {notifications.length === 0 ? (
                      <div className="text-sm text-gray-500 dark:text-gray-400 px-1 py-8">
                        Aucune notification
                      </div>
                    ) : (
                      notifications.map(renderNotifCard)
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-4"></div>
                </div>
              </SheetContent>
            </Sheet>
            {/* ================================================================ */}

            <ThemeToggle />
            <LogoutButton className="text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3" />
          </div>
        </div>

        {/* Notification Sheet */}
        <Sheet open={showNotifications} onOpenChange={setShowNotifications}>
          <SheetContent className="w-full sm:w-96">
            <SheetHeader>
              <SheetTitle>Notifications récentes</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-3 overflow-y-auto max-h-[calc(100vh-120px)]">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border ${notification.urgent
                      ? "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950"
                      : "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
                      }`}>
                    <div className="flex items-start gap-2">
                      {notification.type === "absence" ? (
                        <span className="text-orange-600 dark:text-orange-400 text-lg">⚠️</span>
                      ) : (
                        <span className="text-green-600 dark:text-green-400 text-lg">✅</span>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {notification.content}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {notification.time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  Aucune notification
                </p>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((stat, index) => (
            <Card
              key={index}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-gray-800/20">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
                      {stat.title}
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-2 sm:p-3 rounded-full ${stat.color}`}>
                    <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-gray-800/20">
          <CardHeader className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
            <CardTitle className="text-lg sm:text-xl text-gray-900 dark:text-white">
              {t("quick.actions")}
            </CardTitle>
            <CardDescription className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
              {t("quick.actions.desc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {quickActions.map((action, index) => {
                // Skip the Émargement action since we'll render it separately
                if (action.title === "Émargement") {
                  return null;
                }
                return (
                  <Button
                    key={index}
                    variant="outline"
                    onClick={action.action}
                    className="h-auto p-4 flex flex-col items-center space-y-2 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white transition-all duration-200">
                    <action.icon className="w-8 h-8 text-gray-700 dark:text-gray-300" />
                    <div className="text-center">
                      <div className="font-medium text-sm text-gray-900 dark:text-white">
                        {action.title}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                        {action.description}
                      </div>
                    </div>
                  </Button>
                );
              })}
              <AdminTeacherAttendance />
              <AdminEvaluationScheduler />
              <AdminAttendanceHistory />
              <JustificationRequestsModal />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
