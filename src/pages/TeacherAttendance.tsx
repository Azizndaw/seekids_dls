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
import { useGetCurrentTeacher } from "@/hooks/useUsers";
import { useCreateStudentAttendance, useUpdateStudent } from "@/hooks/useStudents";
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
  const { data: currentTeacher, isLoading, error } = useGetCurrentTeacher(authUser);

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
  const updateAttendance = (studentId: string, status: "present" | "absent" | "late") => {
    setStudents((prev) =>
      prev.map((student) => (student.id === studentId ? { ...student, status } : student))
    );
  };
  let classes = [];

  useEffect(() => {
    if (classes?.length > 0) {
      const defaultClass = classes[0];
      setSelectedClassObject(defaultClass);
    }
  }, [classes]);

  const updateLateReason = (studentId: string, reason: string) => {
    setLateReason((prev) => ({ ...prev, [studentId]: reason }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }
  if (error) return <div>Error loading data</div>;
  if (!currentTeacher) return null;

  const subjects = currentTeacher?.disciplines;
  classes = currentTeacher?.classes;

  const validateAttendance = async () => {
    let absentStudents = students.filter((s) => s.status === "absent");
    let lateStudents = students.filter((s) => s.status === "late");
    const currentClass = classes.find((c) => c.classeId === selectedClass);
    console.log("vlll", classes);
    console.log("vlllId", selectedClass);
    console.log("currentClass", currentClass);
    const currentSubject = subjects?.find((s) => s.id === selectedSubject);
    setDisabledButton(true);

    const notificationCount = absentStudents.length + lateStudents.length;

    const summaryDate = format(attendanceDate, "dd/MM/yyyy", { locale: fr });
    setLastSummary({
      count: notificationCount,
      subject: currentSubject?.nom,
      className: currentClass?.name,
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
        description: `Aucune notification nécessaire - Tous les élèves de ${
          currentClass?.classe.niveau
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
        nom: student.nom,
        prenom: student.prenom,
        abscence: student.abscence + 1,
        moyenne: student.moyenne,
        dateOfBirth: student.dateOfBirth,
        retards: student.retards,
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
        `Notification envoyée aux parents de ${student.prenom} ${student.nom} pour absence en ${
          currentSubject?.name
        } le ${format(attendanceDate, "dd/MM/yyyy", { locale: fr })}`
      );
    });

    // Envoyer notifications pour les retards
    lateStudents.forEach(async (student) => {
      const reason = lateReason[student.id] || "Aucun motif spécifié";
      const isUpdateSuccessful = await updateStudentMutation.mutateAsync({
        nom: student.nom,
        prenom: student.prenom,
        abscence: student.abscence,
        moyenne: student.moyenne,
        dateOfBirth: student.dateOfBirth,
        retards: student.retards + 1,
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
        `Notification envoyée aux parents de ${student.prenom} ${student.nom} pour retard en ${
          currentSubject?.name
        } le ${format(attendanceDate, "dd/MM/yyyy", { locale: fr })} - Motif: ${reason}`
      );
    });
    toast({
      title: "Présences validées",
      description: `${notificationCount} notification(s) envoyée(s) aux parents pour ${
        currentSubject?.name
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

        {/* Subject Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              Sélection de la matière
            </CardTitle>
            <CardDescription>
              Choisissez la matière que vous enseignez pour cette session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-64">
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
          </CardContent>
        </Card>

        {selectedSubject && !selectedClass && (
          <Card>
            <CardHeader>
              <CardTitle>Sélection de la classe</CardTitle>
              <CardDescription>
                Choisissez la classe pour {subjects?.find((s) => s.id === selectedSubject)?.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {classes
                  .filter((classe) => {
                    const currentSubject = classes?.find((s) => s.id === selectedClass);
                    return (
                      classe.niveau === currentSubject?.niveau && classe.nom === currentSubject?.nom
                    );
                  })
                  .map((classe) => (
                    <Card
                      key={classe.classeId}
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => handleClassChange(classe.classeId)}>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Users className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                          </div>
                          <div>
                            <h3 className="font-medium">
                              {classe.classe.niveau} {classe.classe.nom}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {classe.classe.students?.length} élèves
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="mt-2 text-xs">
                          Sélectionner
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {selectedSubject && selectedClass && (
          <div className="space-y-4">
            {/* Navigation */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedClass(null)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Changer de classe
              </Button>
              <div>
                <h2 className="text-xl font-semibold">
                  {classes.find((c) => c.classeId === selectedClass)?.niveau} -{" "}
                  {subjects?.find((s) => s.id === selectedSubject)?.name}
                </h2>
              </div>
            </div>

            {/* Date Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  Date de l'appel
                </CardTitle>
                <CardDescription>
                  Sélectionnez la date pour laquelle vous faites l'appel
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-64 justify-start text-left font-normal",
                          !attendanceDate && "text-muted-foreground"
                        )}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {attendanceDate
                          ? format(attendanceDate, "PPP", { locale: fr })
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
                  <Button
                    disabled={disabledButton}
                    onClick={validateAttendance}
                    className="bg-green-600 hover:bg-green-700 text-white">
                    <Send className="w-4 h-4 mr-2" />
                    Valider et Notifier
                  </Button>
                </div>
              </CardContent>
            </Card>

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
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherAttendance;
