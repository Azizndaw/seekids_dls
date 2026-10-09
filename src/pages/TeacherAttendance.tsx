import React, { useContext, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  ArrowLeft,
  Clock,
  UserCheck,
  UserX,
  CalendarIcon,
  Send,
  GraduationCap,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useGetCurrentTeacher, useClasses } from "@/hooks/useUsers";
import { useCreateStudentAttendance, useUpdateStudent } from "@/hooks/useStudents";
import { useGetCoursByProfesseur } from "@/hooks/useCours";
import { useAuth } from "@/hooks/useAuth";
import { SocketContext } from "@/socket/SocketContext";
import { generateAttendanceNotification } from "@/factories/notificationFactory";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const TeacherAttendance = () => {
  const { socket } = useContext(SocketContext);
  const navigate = useNavigate();
  const { toast } = useToast();
  const updateStudentMutation = useUpdateStudent();
  const createAttendanceMutation = useCreateStudentAttendance();

  const { authUser } = useAuth();
  const { data: currentTeacher, isLoading: teacherLoading, error } = useGetCurrentTeacher(authUser);
  const { data: currentCourses, isLoading: coursesLoading } = useGetCoursByProfesseur();
  const { data: allClasses, isLoading: classesLoading } = useClasses();
  const isLoading = teacherLoading || coursesLoading || classesLoading;

  const [selectedClassObject, setSelectedClassObject] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState<string>();
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [attendanceDate, setAttendanceDate] = useState<Date>(new Date());
  const [students, setStudents] = useState([
    {
      id: "xx",
      createdAt: "xx",
      nom: "xx",
      prenom: "xx",
      dateOfBirth: "xx",
      abscence: 1,
      retards: 1,
      moyenne: 19.7,
      status: null,
    },
  ]);
  const [lateReason, setLateReason] = useState<{ [key: number]: string }>({});
  const [courseContent, setCourseContent] = useState<string>("");

  /* === AJOUT: états du pop-up === */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastSummary, setLastSummary] = useState<{
    count: number;
    subject?: string;
    className?: string;
    date: string;
  }>({
    count: 0,
    subject: "",
    className: "",
    date: "",
  });
  const [disabledButton, setDisabledButton] = useState<boolean>(false);

  // Helper to compute schedule time & session count based on date, class, and subject
  const sessionInfo = React.useMemo(() => {
    const DAYS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    if (!attendanceDate || !selectedClass || !currentCourses) {
      return { timeStr: "08:00 - 10:00", numSessions: 2 };
    }

    const dayName = DAYS_FR[attendanceDate.getDay()];

    // Find course matching class, subject and day of week
    const courseMatch = currentCourses.find((c: any) => {
      const cClassId = c.classe?.id || c.classeId;
      const cSubjId = c.discipline?.id || c.disciplineId;
      const cDay = (c.jour || "").toLowerCase().trim();

      const matchesClass = cClassId === selectedClass;
      const matchesSubj = !selectedSubject || cSubjId === selectedSubject;
      const matchesDay = cDay === dayName.toLowerCase();

      return matchesClass && matchesSubj && matchesDay;
    }) || currentCourses.find((c: any) => {
      const cClassId = c.classe?.id || c.classeId;
      const cDay = (c.jour || "").toLowerCase().trim();
      return cClassId === selectedClass && cDay === dayName.toLowerCase();
    }) || currentCourses.find((c: any) => {
      const cClassId = c.classe?.id || c.classeId;
      return cClassId === selectedClass;
    });

    if (!courseMatch || !courseMatch.heure) {
      return { timeStr: "08:00 - 10:00", numSessions: 2 };
    }

    const rawHeure = courseMatch.heure;
    let timeStr = rawHeure;
    let numSessions = 2;

    if (rawHeure.includes("-")) {
      const parts = rawHeure.split("-").map((p: string) => p.trim());
      const getMinutes = (str: string) => {
        const hMatch = str.match(/(\d+)[h:](\d+)/i) || str.match(/(\d+)/);
        if (hMatch) {
          const h = parseInt(hMatch[1] || "0");
          const m = parseInt(hMatch[2] || "0");
          return h * 60 + m;
        }
        return 0;
      };

      const startMins = getMinutes(parts[0]);
      const endMins = getMinutes(parts[1]);
      if (endMins > startMins) {
        const diffHours = Math.max(1, Math.round((endMins - startMins) / 60));
        numSessions = diffHours;
      }
      timeStr = rawHeure;
    }

    return { timeStr, numSessions };
  }, [attendanceDate, selectedClass, selectedSubject, currentCourses]);

  const updateAttendance = (studentId: string, status: "present" | "absent" | "late") => {
    setStudents((prev) =>
      prev.map((student) => (student.id === studentId ? { ...student, status } : student))
    );
  };

  const updateLateReason = (studentId: string, reason: string) => {
    setLateReason((prev) => ({ ...prev, [studentId]: reason }));
  };

  const subjects = currentTeacher?.disciplines;
  const classes = React.useMemo(() => {
    if (!allClasses) return [];

    // Class IDs from scheduled courses
    const courseClassIds = currentCourses ? currentCourses.map((c: any) => c.classe?.id || c.classeId) : [];

    // Class IDs from direct teacher assignments
    const assignedClassIds = allClasses ? allClasses.filter((c: any) => c.professeurs?.some((p: any) => p.professeurId === authUser?.id)).map((c: any) => c.id) : [];

    const uniqueClassIds = Array.from(new Set([...courseClassIds, ...assignedClassIds].filter(Boolean)));
    return uniqueClassIds.map(id => {
      const cls = allClasses.find((c: any) => c.id === id);
      return cls ? { classeId: id, classe: cls } : null;
    }).filter(Boolean);
  }, [allClasses, currentCourses, currentTeacher]);

  // Auto-select initial class and subject
  useEffect(() => {
    if (subjects && subjects.length > 0 && !selectedSubject) {
      setSelectedSubject(subjects[0].id);
    }
  }, [subjects, selectedSubject]);

  useEffect(() => {
    if (classes && classes.length > 0 && !selectedClass) {
      const firstClass = classes[0] as any;
      setSelectedClass(firstClass.classeId);
      setSelectedClassObject(firstClass);
      if (firstClass.classe?.students) {
        setStudents(firstClass.classe.students);
      }
    }
  }, [classes, selectedClass]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }
  if (error) return <div>Error loading data</div>;
  if (!currentTeacher) return null;

  const validateAttendance = async () => {
    let absentStudents = students.filter((s) => s.status === "absent");
    let lateStudents = students.filter((s) => s.status === "late");
    const currentClass = classes.find((c) => c.classeId === selectedClass);
    console.log("vlll", classes);
    console.log("vlllId", selectedClass);
    console.log("currentClass", currentClass);
    const currentSubject = subjects?.find((s) => s.id === selectedSubject);
    setDisabledButton(true);

    if (!courseContent.trim()) {
      toast({
        title: "Contenu du cours obligatoire",
        description: "Veuillez remplir le contenu du cours (cahier de texte) avant de valider l'émargement.",
        variant: "destructive",
      });
      setDisabledButton(false);
      return;
    }

    const notificationCount = absentStudents.length + lateStudents.length;

    const summaryDate = format(attendanceDate, "dd/MM/yyyy", { locale: fr });
    setLastSummary({
      count: notificationCount,
      subject: currentSubject?.nom || currentSubject?.name,
      className: (currentClass as any)?.classe?.nom || (currentClass as any)?.name || "",
      date: summaryDate,
    });
    setConfirmOpen(true);

    if (notificationCount == 0) {
      const msg = generateAttendanceNotification({
        className: `${currentClass?.classe.niveau} ${currentClass?.classe.nom}`,
        subject: currentSubject?.name!,
        date: attendanceDate,
        type: "PRESENCE",
      });
      socket.emit("send_notification", { text: msg });

      toast({
        title: "Présences validées",
        description: `Aucune notification nécessaire - Tous les élèves de ${currentClass?.classe.niveau
          } ${currentClass?.classe.nom} sont présents en ${currentSubject?.name} le ${format(
            attendanceDate,
            "dd/MM/yyyy",
            {
              locale: fr,
            }
          )}`,
      });
      setDisabledButton(false);
      return;
    }

    // Envoyer notifications pour les absents
    absentStudents.forEach(async (student) => {
      const isUpdateSuccessful = await updateStudentMutation.mutateAsync({
        nom: student.nom || "Inconnu",
        prenom: student.prenom || "Inconnu",
        abscence: (student.abscence ?? 0) + 1,
        moyenne: student.moyenne || 0,
        dateOfBirth: student.dateOfBirth || new Date().toISOString(),
        retards: student.retards || 0,
        id: student.id,
      });
      const msg = generateAttendanceNotification({
        className: `${currentClass?.classe.niveau} ${currentClass?.classe.nom}`,
        studentName: student.nom + " " + student.prenom,
        subject: currentSubject?.name!,
        date: attendanceDate,
        type: "ABSCENCE",
        urgent: true,
      });
      socket.emit("send_notification", { text: msg });

      const createAttendance = await createAttendanceMutation.mutateAsync({
        type: "ABSCENCE",
        studentId: student.id,
        date: attendanceDate,
        disciplineId: selectedSubject,
      });

      if (!isUpdateSuccessful || !createAttendance) {
        toast({
          title: "Erreur",
          description: `Erreur lors de la mise à jour de l'élève : ${student.prenom} ${student.nom}`,
          variant: "destructive",
        });
      }

      console.log(
        `Notification envoyée aux parents de ${student.prenom} ${student.nom} pour absence en ${currentSubject?.name
        } le ${format(attendanceDate, "dd/MM/yyyy", { locale: fr })}`
      );
    });

    // Envoyer notifications pour les retards
    lateStudents.forEach(async (student) => {
      const reason = lateReason[student.id] || "Aucun motif spécifié";
      const isUpdateSuccessful = await updateStudentMutation.mutateAsync({
        nom: student.nom || "Inconnu",
        prenom: student.prenom || "Inconnu",
        abscence: student.abscence ?? 0,
        moyenne: student.moyenne || 0,
        dateOfBirth: student.dateOfBirth || new Date().toISOString(),
        retards: (student.retards ?? 0) + 1,
        id: student.id,
      });
      const msg = generateAttendanceNotification({
        className: `${currentClass?.classe.niveau} ${currentClass?.classe.nom}`,
        studentName: student.nom + " " + student.prenom,
        subject: currentSubject?.name!,
        date: attendanceDate,
        type: "RETARD",
        reason: lateReason[student.id],
      });
      socket.emit("send_notification", { text: msg });

      const createAttendance = await createAttendanceMutation.mutateAsync({
        type: "RETARD",
        studentId: student.id,
        date: attendanceDate,
        disciplineId: selectedSubject,
      });
      if (!isUpdateSuccessful || !createAttendance) {
        toast({
          title: "Erreur",
          description: `Erreur lors de la mise à jour de l'élève : ${student.prenom} ${student.nom}`,
          variant: "destructive",
        });
      }
      console.log(
        `Notification envoyée aux parents de ${student.prenom} ${student.nom} pour retard en ${currentSubject?.name
        } le ${format(attendanceDate, "dd/MM/yyyy", { locale: fr })} - Motif: ${reason}`
      );
    });
    toast({
      title: "Présences validées",
      description: `${notificationCount} notification(s) envoyée(s) aux parents pour ${currentSubject?.name
        } - ${currentClass?.classe.niveau} ${currentClass?.classe.nom} du ${format(
          attendanceDate,
          "dd/MM/yyyy",
          {
            locale: fr,
          }
        )}`,
    });
    lateStudents = [];
    absentStudents = [];
    setLateReason({});
    setDisabledButton(false);
    return;
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "present":
        return "bg-green-500";
      case "absent":
        return "bg-red-500";
      case "late":
        return "bg-orange-500";
      default:
        return "bg-gray-400";
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "present":
        return UserCheck;
      case "absent":
        return UserX;
      case "late":
        return Clock;
      default:
        return Users;
    }
  };

  const getStatusText = (status: string | null) => {
    switch (status) {
      case "present":
        return "Présent";
      case "absent":
        return "Absent";
      case "late":
        return "En retard";
      default:
        return "Non défini";
    }
  };

  const getButtonVariant = (buttonStatus: string, studentStatus: string | null) => {
    return buttonStatus === studentStatus ? "default" : "outline";
  };

  const getButtonClasses = (buttonStatus: string, studentStatus: string | null) => {
    const baseClasses = "flex-1 lg:flex-none text-xs sm:text-sm transition-all duration-200";

    if (buttonStatus === studentStatus) {
      switch (buttonStatus) {
        case "present":
          return `${baseClasses} bg-green-600 hover:bg-green-700 text-white border-green-600`;
        case "absent":
          return `${baseClasses} bg-red-600 hover:bg-red-700 text-white border-red-600`;
        case "late":
          return `${baseClasses} bg-orange-600 hover:bg-orange-700 text-white border-orange-600`;
        default:
          return `${baseClasses} bg-white dark:bg-gray-600 border-gray-200 dark:border-gray-500 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-500`;
      }
    }

    return `${baseClasses} bg-white dark:bg-gray-600 border-gray-200 dark:border-gray-500 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-500`;
  };

  const handleClassChange = (className: string) => {
    const foundClass = classes.find((c) => c.classeId === className);
    if (foundClass) {
      setSelectedClass(foundClass.classeId);
      setStudents(foundClass.classe.students);
    }
  };
  if (!subjects || !classes) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-3 sm:p-6">
      {/* === AJOUT: composant du gros pop-up === */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="max-w-[560px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl">Notification envoyée ✅</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {lastSummary.count} notification(s) envoyée(s) pour{" "}
              <span className="font-medium">{lastSummary.subject}</span> —{" "}
              <span className="font-medium">{lastSummary.className}</span> le {lastSummary.date}.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="mt-3 rounded-lg border p-4 bg-muted/40 text-sm">
            La notification a été correctement transmise aux destinataires{" "}
          </div>

          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setConfirmOpen(false)}>OK, compris</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate("/teacher-dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Gestion des Présences
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Enregistrement des présences - Prof. {currentTeacher.prenom} {currentTeacher.nom}
            </p>
          </div>
        </div>

        {/* Top Control Bar: Class, Subject & Date Selectors */}
        <Card className="bg-muted/30">
          <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
              {/* Classe Selector */}
              <div className="w-full sm:w-auto">
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Classe
                </label>
                <Select value={selectedClass || ""} onValueChange={handleClassChange}>
                  <SelectTrigger className="w-full sm:w-48 bg-white dark:bg-gray-800">
                    <SelectValue placeholder="Sélectionner une classe" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c: any) => {
                      const label = `${c.classe?.niveau || c.classeNiveau || ""} ${c.classe?.nom || c.classeName || ""}`.trim();
                      return (
                        <SelectItem key={c.classeId} value={c.classeId}>
                          {label || `Classe ${c.classeId}`}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Matière Selector */}
              <div className="w-full sm:w-auto">
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Matière
                </label>
                <Select value={selectedSubject || ""} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="w-full sm:w-48 bg-white dark:bg-gray-800">
                    <SelectValue placeholder="Sélectionner une matière" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects?.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date de l'appel */}
              <div className="w-full sm:w-auto">
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Date de la séance
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full sm:w-48 justify-start text-left font-normal bg-white dark:bg-gray-800 border-gray-300",
                        !attendanceDate && "text-muted-foreground"
                      )}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {attendanceDate
                        ? format(attendanceDate, "dd/MM/yyyy", { locale: fr })
                        : "Sélectionner une date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={attendanceDate}
                      onSelect={(date) => date && setAttendanceDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Quick Badge info */}
            <div className="text-right text-xs text-muted-foreground hidden lg:block">
              {students.length} élève{students.length > 1 ? "s" : ""} enregistré{students.length > 1 ? "s" : ""}
            </div>
          </CardContent>
        </Card>

        {selectedClass && (
          <div className="space-y-4">

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Présents</p>
                      <p className="text-2xl font-bold text-green-600">
                        {students.filter((s) => s.status === "present").length}
                      </p>
                    </div>
                    <UserCheck className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Absents</p>
                      <p className="text-2xl font-bold text-red-600">
                        {students.filter((s) => s.status === "absent").length}
                      </p>
                    </div>
                    <UserX className="w-8 h-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">En retard</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {students.filter((s) => s.status === "late").length}
                      </p>
                    </div>
                    <Clock className="w-8 h-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Students List */}
            <Card>
              <CardHeader>
                <CardTitle>Liste des Élèves</CardTitle>
                <CardDescription>
                  Cliquez sur les boutons pour marquer les présences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {students.map((student) => {
                    const StatusIcon = getStatusIcon(student.status);
                    return (
                      <div key={student.id} className="border rounded-lg p-4">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-full ${getStatusColor(student.status)}`}>
                              <StatusIcon className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <h3 className="font-medium">{`${student.prenom} ${student.nom}`}</h3>
                              <p className="text-sm text-muted-foreground">
                                {getStatusText(student.status)}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col lg:flex-row gap-2 lg:items-center">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant={getButtonVariant("present", student.status)}
                                onClick={() => updateAttendance(student.id, "present")}
                                className={getButtonClasses("present", student.status)}>
                                Présent
                              </Button>
                              <Button
                                size="sm"
                                variant={getButtonVariant("absent", student.status)}
                                onClick={() => updateAttendance(student.id, "absent")}
                                className={getButtonClasses("absent", student.status)}>
                                Absent
                              </Button>
                              <Button
                                size="sm"
                                variant={getButtonVariant("late", student.status)}
                                onClick={() => updateAttendance(student.id, "late")}
                                className={getButtonClasses("late", student.status)}>
                                En retard
                              </Button>
                            </div>

                            {student.status === "late" && (
                              <Input
                                placeholder="Motif du retard..."
                                value={lateReason[student.id] || ""}
                                onChange={(e) => updateLateReason(student.id, e.target.value)}
                                className="lg:w-48"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end pt-6 mt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    disabled={disabledButton}
                    onClick={validateAttendance}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold text-sm px-8 py-3 rounded-lg shadow-md transition-all flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Valider les Présences et Notifier
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div >
  );
};

export default TeacherAttendance;
