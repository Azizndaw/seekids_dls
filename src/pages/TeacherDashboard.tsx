import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Users,
  Calendar,
  UserCheck,
  FileText,
  MessageSquare,
  ChevronDown,
  User,
  UserCog,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import TeacherAttendanceSheet from "@/components/TeacherAttendanceSheet";
import TeacherAttendanceHistory from "@/components/TeacherAttendanceHistory";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import LogoutButton from "@/components/LogoutButton";
import ThemeToggle from "@/components/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGetCurrentTeacher } from "@/hooks/useUsers";
import { transformToRecentClasses, useGetCoursByProfesseur } from "@/hooks/useCours";
import { useSchoolLogo } from "@/hooks/useSchoolLogo";
import ExerciceModal from "@/components/teacher/ExerciceModal";

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { authUser } = useAuth();
  const { data: currentCourses } = useGetCoursByProfesseur();

  const { data: currentTeacher, isLoading, error } = useGetCurrentTeacher(authUser);
  const schoolLogo = useSchoolLogo();

  if (!(currentCourses && currentTeacher && authUser) || isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }
  const recentClasses = transformToRecentClasses(currentCourses);

  // Simuler les rôles multiples - en réalité cela viendrait de la base de données
  const role: any = authUser.role;
  const hasParentRole = role.includes("PARENT");
  const hasAdminRole = role.includes("ADMIN");

  const stats = [
    {
      title: "Mes Classes",
      value: currentTeacher.classes.length,
      icon: Users,
      color: "bg-blue-500 dark:bg-blue-600",
    },
    {
      title: "Élèves Total",
      value: currentTeacher.totalStudents,
      icon: UserCheck,
      color: "bg-green-500 dark:bg-green-600",
    },
    {
      title: "Cours Aujourd'hui",
      value: recentClasses.length,
      icon: BookOpen,
      color: "bg-purple-500 dark:bg-purple-600",
    },
  ];
  const quickActions = [
    {
      title: "Présences",
      description: "Gérer les absences et retards",
      icon: Users,
      action: () => navigate("/teacher-attendance"),
    },
    {
      title: "Notes et Évaluations",
      description: "Saisir et consulter les notes",
      icon: FileText,
      action: () => navigate("/teacher-grades"),
    },
    {
      title: "Messagerie",
      description: "Communication avec parents/admin",
      icon: MessageSquare,
      action: () => navigate("/teacher-messages"),
    },
    {
      title: "Emploi du temps",
      description: "Consulter planning et cours",
      icon: Calendar,
      action: () => navigate("/teacher-schedule"),
    },
    {
      title: "Emploi du temps",
      description: "Consulter planning et cours",
      icon: Calendar,
      action: () => navigate("/teacher-schedule"),
    },
  ];

  // Flatten students list for the modal
  const classes = currentTeacher?.classes?.map((cls) => cls.classe) ?? [];
  const allStudents = classes.flatMap((cls) => cls.students || []);
  // Prepare classes list for the modal
  const classesList = classes.map((cls) => ({ id: cls.id, nom: `${cls.niveau} ${cls.nom}` }));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-3 sm:p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2 sm:gap-4 bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 mb-1">
                <img
                  src={schoolLogo}
                  alt="Logo"
                  className="h-8 w-8 sm:h-10 sm:w-10 object-contain"
                />
                <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white truncate">
                  Tableau de Bord Professeur
                </h1>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                Bienvenue, {currentTeacher.prenom} {currentTeacher.nom}
              </p>
            </div>

            {/* Dropdown pour changer de rôle */}
            {(hasParentRole || hasAdminRole) && (
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
                    onClick={() => navigate("/teacher-dashboard")}
                    className="flex items-center gap-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                    <UserCog className="w-4 h-4" />
                    Vue Professeur (actuelle)
                  </DropdownMenuItem>
                  {hasParentRole && (
                    <DropdownMenuItem
                      onClick={() => navigate("/parent-dashboard")}
                      className="flex items-center gap-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                      <User className="w-4 h-4" />
                      Portail Parent
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
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <ThemeToggle />
            <LogoutButton className="text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3" />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
              Actions Rapides
            </CardTitle>
            <CardDescription className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
              Accédez rapidement aux fonctionnalités principales
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-800">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="h-auto p-2 sm:p-3 lg:p-4 flex flex-col items-center space-y-1 sm:space-y-2 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white transition-all duration-200"
                  onClick={action.action as () => void}>
                  <action.icon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-gray-700 dark:text-gray-300" />
                  <div className="text-center">
                    <div className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white">
                      {action.title}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                      {action.description}
                    </div>
                  </div>
                </Button>
              ))}
              <TeacherAttendanceHistory classes={classes} subjects={currentTeacher?.disciplines} />
              <ExerciceModal classes={classes} subjects={currentTeacher?.disciplines || []} />
              <TeacherAttendanceSheet classes={classes} subjects={currentTeacher?.disciplines} />
            </div>
          </CardContent>
        </Card>

        {/* Recent Classes */}
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-gray-800/20">
          <CardHeader className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
            <CardTitle className="text-lg sm:text-xl text-gray-900 dark:text-white">
              Mes Cours Aujourd'hui
            </CardTitle>
            <CardDescription className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
              Aperçu de vos cours du jour
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-800">
            <div className="space-y-3 sm:space-y-4">
              {recentClasses.map((classe, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border border-gray-200 dark:border-gray-600 rounded-lg gap-3 sm:gap-0 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200">
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-300" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm sm:text-base text-gray-900 dark:text-white">
                        {classe.name} - {classe.subject}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        {classe.time} • {classe.students} élèves
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={classe.status === "En cours" ? "default" : "secondary"}
                    className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700">
                    {classe.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeacherDashboard;
