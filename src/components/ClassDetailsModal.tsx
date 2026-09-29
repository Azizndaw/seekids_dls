import React, { useState, useContext } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CalendarDays, UserX, Edit, Trash2, Loader2, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useGetClasseAverage } from "@/hooks/useAverage";
import { useDeleteNote, useUpdateNote } from "@/hooks/useNotes";
import { useDeleteStudentAttendance } from "@/hooks/useStudents";
import { useGetCoursesByTeacherId } from "@/hooks/useCours";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateClassGradeReport } from "@/utils/generateClassGradeReport";
import { useSchoolLogo } from "@/hooks/useSchoolLogo";
import { SocketContext } from "@/socket/SocketContext";
import {
  getAverageInterpretation,
  getAttendanceAlert,
  getWeakestSubject,
  calculatePeriodStats,
} from "@/utils/gradeUtils";
import { AlertTriangle } from "lucide-react";

// ------------------------ INTERFACES -------------------------

interface ClassDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  className: string;
}

// ------------------------ COMPONENT -------------------------

const ClassDetailsModal = ({ isOpen, onClose, className }: ClassDetailsModalProps) => {
  const { data: classeReport } = useGetClasseAverage(className);
  const logo = useSchoolLogo();
  const { socket } = useContext(SocketContext);

  const handleDownloadReport = () => {
    if (classeReport) {
      generateClassGradeReport(classeReport, logo);
    }
  };

  const [filterSubject, setFilterSubject] = useState("");
  const [filterSemester, setFilterSemester] = useState<"" | 1 | 2>("");
  const updateNoteMutation = useUpdateNote();
  const [selectedUpdateGrade, setSelectedUpdateGrade] = useState(null);
  const deleteNoteMutation = useDeleteNote();
  const deleteSchoolAttendance = useDeleteStudentAttendance();
  // ------------------------ EDIT/DELETE STATE -------------------------

  const [editGradeDialog, setEditGradeDialog] = useState({
    isOpen: false,
    studentId: "",
    gradeIndex: -1,
    grade: null,
  });

  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    type: "grade" as "grade" | "attendance",
    studentId: "",
    id: "",
  });

  const [editFormData, setEditFormData] = useState({
    subject: "",
    subjectId: "",
    grade: 0,
    coefficient: 0,
    date: "",
    semester: "Semestre 1" as "Semestre 1" | "Semestre 2",
  });

  // Fetch teacher courses to determine available subjects
  const teacherId = selectedUpdateGrade?.professeurId || "";
  const { data: teacherCourses } = useGetCoursesByTeacherId(teacherId);

  // Debug logs
  console.log("🔍 Debug - teacherId:", teacherId);
  console.log("🔍 Debug - teacherCourses:", teacherCourses);

  // Get unique subjects for this teacher
  const teacherSubjects = React.useMemo(() => {
    if (!teacherCourses) return [];
    const uniqueSubjects = new Map();
    teacherCourses.forEach((course) => {
      if (!uniqueSubjects.has(course.disciplineId)) {
        uniqueSubjects.set(course.disciplineId, {
          id: course.disciplineId,
          name: course.discipline.name,
        });
      }
    });
    const subjects = Array.from(uniqueSubjects.values());
    console.log("🔍 Debug - teacherSubjects:", subjects);
    return subjects;
  }, [teacherCourses]);

  const canEditSubject = teacherSubjects.length > 1;
  console.log(
    "🔍 Debug - canEditSubject:",
    canEditSubject,
    "subjects count:",
    teacherSubjects.length,
    teacherSubjects.length,
  );

  if (!classeReport) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }
  const studentsData = classeReport.studentsData ?? [];
  const classe = classeReport.classe;

  // ------------------------ HELPER FUNCTIONS -------------------------

  const sortedStudents = [...studentsData]
    .map((student) => {
      const stats = calculatePeriodStats(student.grades, filterSemester === "" ? "all" : (filterSemester === 1 ? "semestre1" : "semestre2"));
      return {
        ...student,
        semesterAverage: stats.average,
      };
    })
    .sort((a, b) => b.semesterAverage - a.semesterAverage);

  const calculateAverage = (grades: any[], semester: string) => {
    const period = semester === "" ? "all" : (semester.includes("1") ? "semestre1" : "semestre2");
    return calculatePeriodStats(grades, period).average;
  };

  const getRank = (studentId: string) => {
    const index = sortedStudents.findIndex((s) => s.id === studentId);
    return index + 1;
  };

  const allSubjects = Array.from(
    new Set(studentsData.flatMap((s) => s.grades.map((g) => g.subject))),
  );

  const allMonths = [
    "Octobre",
    "Novembre",
    "Décembre",
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
  ];

  const getMonthName = (dateStr: string) => {
    // dateStr is YYYY-MM-DD from useAverage.ts
    const parts = dateStr.split("-");
    if (parts.length < 2) return "";
    const monthIndex = parseInt(parts[1]) - 1;
    const date = new Date(2000, monthIndex, 1);
    const monthName = date.toLocaleString("fr-FR", { month: "long" });
    return monthName.charAt(0).toUpperCase() + monthName.slice(1);
  };

  const getGradesForMonth = (studentGrades: any[], subject: string, monthName: string) => {
    return studentGrades.filter(
      (g) =>
        g.subject === subject &&
        g.devoir !== false &&
        getMonthName(g.date).toLowerCase() === monthName.toLowerCase() &&
        (filterSemester === "" || g.semestre.includes(filterSemester)),
    );
  };

  const getCompositionGrades = (studentGrades: any[], subject: string) => {
    return studentGrades.filter(
      (g) =>
        g.subject === subject &&
        g.devoir === false &&
        (filterSemester === "" || g.semestre.includes(filterSemester)),
    );
  };

  const monthsWithData = allMonths.filter((month) => {
    return studentsData.some((student) =>
      allSubjects.some((subject) => getGradesForMonth(student.grades, subject, month).length > 0),
    );
  });

  // ------------------------ EDIT FUNCTIONS -------------------------

  const openEditGradeDialog = (studentId: string, gradeIndex: number) => {
    const student = studentsData.find((s) => s.id === studentId);
    if (!student) return;

    const grade = student.grades[gradeIndex];
    setSelectedUpdateGrade(grade);

    setEditFormData({
      subject: grade.subject,
      subjectId: grade.disciplineId,
      grade: grade.grade,
      coefficient: grade.coefficient,
      date: grade.date,
      semester: grade.semestre.includes("1") ? "Semestre 1" : "Semestre 2",
    });

    setEditGradeDialog({
      isOpen: true,
      studentId,
      gradeIndex,
      grade,
    });
  };

  const saveGradeEdit = async () => {
    toast({
      title: "Note modifiée",
      description: "La note a été mise à jour.",
    });

    setEditGradeDialog({
      isOpen: false,
      studentId: "",
      gradeIndex: -1,
      grade: null,
    });
    await updateNoteMutation.mutateAsync({
      id: selectedUpdateGrade.id,
      data: {
        appreciation: selectedUpdateGrade.appreciation,
        classeId: selectedUpdateGrade.classeId,
        professeurId: selectedUpdateGrade.professeurId,
        studentId: editGradeDialog.studentId,
        note: editFormData.grade,
        date: new Date(editFormData.date),
        coefficient: editFormData.coefficient,
        disciplineId: editFormData.subjectId,
        type: selectedUpdateGrade.title,
        devoir: selectedUpdateGrade.devoir,
      },
    });

    if (socket) {
      const notificationPayload = {
        type: "grades",
        message: `Modification de note pour l'élève ${selectedUpdateGrade.student?.prenom || ""
          } ${selectedUpdateGrade.student?.nom || ""} (Nouvelle note: ${editFormData.grade}/20)`,
        urgent: false,
        date: new Date().toISOString(),
        recipients: ["admin"],
      };
      socket.emit("send_notification", notificationPayload);
    }
  };

  // ------------------------ DELETE FUNCTIONS -------------------------

  const deleteGrade = async () => {
    await deleteNoteMutation.mutateAsync(deleteDialog.id);
    setDeleteDialog({ isOpen: false, type: "grade", studentId: "", id: "" });
  };

  const deleteAttendance = async () => {
    await deleteSchoolAttendance.mutateAsync(deleteDialog.id);
    setDeleteDialog({ isOpen: false, type: "grade", studentId: "", id: "" });
  };

  const maxLetters = 7;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader className="flex flex-row items-center justify-between pr-8">
          <DialogTitle>Détails de la classe {classe}</DialogTitle>
          <Button onClick={handleDownloadReport} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Télécharger Carnet
          </Button>
        </DialogHeader>

        <ScrollArea className="h-[70vh]">
          <div className="space-y-6">
            {sortedStudents.map((student) => {
              const rank = getRank(student.id);

              return (
                <Card key={student.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {student.firstName} {student.lastName}
                      </CardTitle>

                      <div className="flex flex-col items-end gap-2">
                        <div className="flex gap-2">
                          <Badge variant="secondary" className="text-lg px-3 py-1">
                            Rang: {rank}
                            {rank === 1 ? "er" : "ème"}
                          </Badge>
                          <div className="flex flex-col items-center">
                            <Badge variant="outline" className="text-lg px-3 py-1">
                              Moyenne: {student.generalAverage}/20
                            </Badge>
                            {(() => {
                              const weakest = getWeakestSubject(student.subjectAverages);
                              const interpretation = getAverageInterpretation(
                                student.generalAverage,
                                weakest,
                              );
                              return (
                                <span
                                  className={`text-[10px] font-bold mt-1 px-2 py-0.5 rounded-full ${interpretation.bg} ${interpretation.color}`}>
                                  {interpretation.label}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                        {(() => {
                          const absenceCount = student.attendance.filter(
                            (a) => a.type === "ABSCENCE",
                          ).length;
                          const alert = getAttendanceAlert(absenceCount);
                          if (!alert) return null;
                          return (
                            <div
                              className={`flex items-center gap-1.5 px-3 py-1 rounded-md border ${alert.bg} border-current animate-pulse`}>
                              <AlertTriangle className={`h-4 w-4 ${alert.color}`} />
                              <span className={`text-xs font-bold ${alert.color}`}>
                                {alert.message}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <Tabs defaultValue="grades" className="w-full">
                      {/* ---------------------------- TABS MENU ---------------------------- */}

                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="grades">Notes & Compositions</TabsTrigger>
                        <TabsTrigger value="attendance">Assiduité</TabsTrigger>
                        <TabsTrigger value="stuff">Autres</TabsTrigger>
                      </TabsList>

                      {/* ---------------------------- NOTES ---------------------------- */}

                      <TabsContent value="grades">
                        {/* FILTRES NOTES */}
                        <div className="flex items-center gap-4 my-4">
                          <div className="w-48">
                            <Label>Semestre</Label>
                            <select
                              className="w-full border rounded-md p-2"
                              value={filterSemester}
                              onChange={(e) =>
                                setFilterSemester(
                                  e.target.value === "" ? "" : (Number(e.target.value) as 1 | 2),
                                )
                              }>
                              <option value="">Tous</option>
                              <option value="1">Semestre 1</option>
                              <option value="2">Semestre 2</option>
                            </select>
                          </div>
                        </div>

                        {/* TABLE NOTES MATRIX STYLE */}
                        <div className="rounded-md border overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gray-50">
                                <TableHead className="font-bold sticky left-0 bg-gray-50 z-30 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                  Matière
                                </TableHead>
                                {monthsWithData.map((month) => (
                                  <TableHead key={month} className="text-center min-w-[100px]">
                                    {month}
                                  </TableHead>
                                ))}
                                <TableHead className="text-center font-bold bg-blue-50 text-blue-900 sticky right-0 z-20 shadow-[-2px_0_5px_rgba(0,0,0,0.05)]">
                                  Compo.
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {allSubjects.map((subject) => (
                                <TableRow key={subject}>
                                  <TableCell className="font-medium sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                    {subject.length > maxLetters
                                      ? subject.slice(0, maxLetters) + "…"
                                      : subject}
                                  </TableCell>
                                  {monthsWithData.map((month) => {
                                    const monthGrades = getGradesForMonth(
                                      student.grades,
                                      subject,
                                      month,
                                    );
                                    return (
                                      <TableCell key={month} className="text-center p-2">
                                        <div className="flex flex-wrap justify-center gap-1.5">
                                          {monthGrades.map((g) => {
                                            const originalIndex = student.grades.findIndex(
                                              (og) => og.id === g.id,
                                            );
                                            return (
                                              <div
                                                key={g.id}
                                                className={`group relative flex flex-col items-center justify-center min-w-[2.5rem] p-1 rounded border cursor-pointer hover:border-blue-400 ${g.grade >= 10
                                                  ? "bg-green-50 border-green-200 text-green-700"
                                                  : "bg-red-50 border-red-200 text-red-700"
                                                  }`}
                                                onClick={() =>
                                                  openEditGradeDialog(student.id, originalIndex)
                                                }>
                                                <span className="text-sm font-bold">{g.grade}</span>
                                                <span className="text-[10px] opacity-70">
                                                  c{g.coefficient}
                                                </span>

                                                {/* Action buttons on hover */}
                                                <div className="absolute -top-2 -right-2 hidden group-hover:flex gap-1 z-30">
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      openEditGradeDialog(
                                                        student.id,
                                                        originalIndex,
                                                      );
                                                    }}
                                                    className="bg-white rounded-full p-0.5 shadow-sm border border-blue-200 hover:bg-blue-50">
                                                    <Edit className="w-3 h-3 text-blue-600" />
                                                  </button>
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setDeleteDialog({
                                                        isOpen: true,
                                                        type: "grade",
                                                        studentId: student.id,
                                                        id: g.id,
                                                      });
                                                    }}
                                                    className="bg-white rounded-full p-0.5 shadow-sm border border-red-200 hover:bg-red-50">
                                                    <Trash2 className="w-3 h-3 text-red-600" />
                                                  </button>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </TableCell>
                                    );
                                  })}
                                  <TableCell className="text-center bg-blue-50/30 p-2 sticky right-0 bg-white z-10 shadow-[-2px_0_5px_rgba(0,0,0,0.05)]">
                                    <div className="flex flex-wrap justify-center gap-1.5">
                                      {getCompositionGrades(student.grades, subject).map((g) => {
                                        const originalIndex = student.grades.findIndex(
                                          (og) => og.id === g.id,
                                        );
                                        return (
                                          <div
                                            key={g.id}
                                            className={`group relative flex flex-col items-center justify-center min-w-[2.75rem] p-1 rounded border cursor-pointer hover:border-blue-400 ${g.grade >= 10
                                              ? "bg-green-100 border-green-300 text-green-800"
                                              : "bg-red-100 border-red-300 text-red-800"
                                              }`}
                                            onClick={() =>
                                              openEditGradeDialog(student.id, originalIndex)
                                            }>
                                            <span className="text-base font-extrabold">
                                              {g.grade}
                                            </span>
                                            <span className="text-[10px] opacity-70">
                                              c{g.coefficient}
                                            </span>

                                            {/* Action buttons on hover */}
                                            <div className="absolute -top-2 -right-2 hidden group-hover:flex gap-1 z-30">
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  openEditGradeDialog(student.id, originalIndex);
                                                }}
                                                className="bg-white rounded-full p-0.5 shadow-sm border border-blue-200 hover:bg-blue-50">
                                                <Edit className="w-3 h-3 text-blue-600" />
                                              </button>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setDeleteDialog({
                                                    isOpen: true,
                                                    type: "grade",
                                                    studentId: student.id,
                                                    id: g.id,
                                                  });
                                                }}
                                                className="bg-white rounded-full p-0.5 shadow-sm border border-red-200 hover:bg-red-50">
                                                <Trash2 className="w-3 h-3 text-red-600" />
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </TabsContent>

                      {/* ---------------------------- ATTENDANCE ---------------------------- */}

                      <TabsContent value="attendance">
                        {student.attendance.length === 0 ? (
                          <div className="text-center py-6 text-muted-foreground">
                            <UserX className="w-10 h-10 mx-auto mb-3 opacity-50" />
                            Aucun enregistrement
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Cours</TableHead>
                                <TableHead>Heure</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>

                            <TableBody>
                              {student.attendance.map((record, index) => (
                                <TableRow key={index}>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <CalendarDays className="w-4 h-4" />
                                      {new Date(record.date).toLocaleDateString("fr-FR")}
                                    </div>
                                  </TableCell>

                                  <TableCell>
                                    <Badge
                                      className={
                                        record.type === "RETARD"
                                          ? "bg-yellow-100 text-yellow-800"
                                          : "bg-orange-100 text-orange-800"
                                      }>
                                      {record.type === "RETARD" ? "Retard" : "Absence"}
                                    </Badge>
                                  </TableCell>

                                  <TableCell>{record.course}</TableCell>
                                  <TableCell>{record.date}</TableCell>

                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          setDeleteDialog({
                                            isOpen: true,
                                            type: "attendance",
                                            studentId: student.id,
                                            id: record.id,
                                          })
                                        }>
                                        <Trash2 className="w-4 h-4 text-red-600" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>

        {/* ------------------------------------------------ EDIT DIALOG ------------------------------------------------ */}

        <Dialog
          open={editGradeDialog.isOpen}
          onOpenChange={(open) => {
            if (!open)
              setEditGradeDialog({
                isOpen: false,
                studentId: "",
                gradeIndex: -1,
                grade: null,
              });
          }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Modifier la note</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label>Matière</Label>
                {canEditSubject ? (
                  <Select
                    value={editFormData.subjectId}
                    onValueChange={(value) => {
                      const selectedSubject = teacherSubjects.find((s) => s.id === value);
                      setEditFormData({
                        ...editFormData,
                        subjectId: value,
                        subject: selectedSubject?.name || "",
                      });
                    }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une matière" />
                    </SelectTrigger>
                    <SelectContent>
                      {teacherSubjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={editFormData.subject} disabled />
                )}
              </div>

              <div>
                <Label>Note</Label>
                <Input
                  type="number"
                  value={editFormData.grade}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      grade: Number(e.target.value),
                    })
                  }
                />
              </div>

              <div>
                <Label>Coefficient</Label>
                <Input
                  disabled
                  type="number"
                  value={editFormData.coefficient}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      coefficient: Number(e.target.value),
                    })
                  }
                />
              </div>

              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={editFormData.date}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      date: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <Label>Semestre</Label>
                <select
                  className="w-full border rounded-md p-2"
                  value={editFormData.semester}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      semester: e.target.value.includes("1") ? "Semestre 1" : "Semestre 2",
                    })
                  }>
                  <option value="Semestre 1">Semestre 1</option>
                  <option value="Semestre 1">Semestre 2</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  setEditGradeDialog({
                    isOpen: false,
                    studentId: "",
                    gradeIndex: -1,
                    grade: null,
                  })
                }>
                Annuler
              </Button>
              <Button onClick={saveGradeEdit}>Enregistrer</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ------------------------------------------------ REVIEW DIALOG ------------------------------------------------ */}

        {/* ------------------------------------------------ DELETE DIALOG ------------------------------------------------ */}

        <AlertDialog
          open={deleteDialog.isOpen}
          onOpenChange={(open) => {
            if (!open)
              setDeleteDialog({
                isOpen: false,
                type: "grade",
                studentId: "",
                id: deleteDialog.id,
              });
          }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>

              <AlertDialogAction
                onClick={deleteDialog.type === "grade" ? deleteGrade : deleteAttendance}
                className="bg-red-600 text-white">
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
};

export default ClassDetailsModal;
