import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
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
import {
  FileSpreadsheet,
  Search,
  Calendar,
  Clock,
  BookOpen,
  Edit2,
  Trash2,
  Loader2,
  Download,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  useDeleteEmargement,
  useEmargementsByProfessor,
  useUpdateEmargement,
} from "@/hooks/useEmargement";
import { generateTeacherAttendanceReport } from "@/utils/generateTeacherAttendanceReport";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useSchoolLogo } from "@/hooks/useSchoolLogo";

interface AttendanceRecord {
  id: string;
  teacherName: string;
  subject: string;
  class: string;
  date: string;
  startTime: string;
  endTime: string;
  sessionCount: number;
  courseSummary: string;
  notes: string;
  submittedAt: string;
  subjectId?: string;
  classId?: string;
}
interface TeacherAttendanceSheetProps {
  subjects: { id: string; name: string }[]; // Define the type based on what you get from `useSubjects`
  classes: { id: string; niveau: string; nom?: string }[]; // For `yclasse`, you can adjust based on the actual type
}
const TeacherAttendanceHistory = ({ subjects, classes }: TeacherAttendanceSheetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const { authUser } = useAuth();
  const { data: dbEmargements } = useEmargementsByProfessor(authUser?.schoolId, authUser?.id);
  const updateMutation = useUpdateEmargement();
  const deleteMutation = useDeleteEmargement();
  const { useGetSchool } = useSchoolData();
  const { data: schoolData } = useGetSchool();
  const logo = useSchoolLogo();
  const { toast } = useToast();

  const currentYear = new Date().getFullYear() - 1;

  const monthNames = [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre",
  ];

  const monthsThisYear = Array.from({ length: 12 }, (_, i) => {
    const monthIndex = i + 1;
    return {
      value: `${currentYear}-${String(monthIndex).padStart(2, "0")}`,
      label: `${monthNames[i]} ${currentYear}`,
    };
  });

  const monthsNextYear = Array.from({ length: 12 }, (_, i) => {
    const monthIndex = i + 1;
    return {
      value: `${currentYear + 1}-${String(monthIndex).padStart(2, "0")}`,
      label: `${monthNames[i]} ${currentYear + 1}`,
    };
  });

  const allMonths = [...monthsThisYear, ...monthsNextYear];

  // Initialiser les données quand dbEmargements change
  useEffect(() => {
    if (dbEmargements) {
      const formatted: AttendanceRecord[] = dbEmargements.map((em) => ({
        id: em.id,
        date: em.debut.split("T")[0],
        courseSummary: em.content,
        startTime: em.debut.slice(11, 16),
        endTime: em.fin.slice(11, 16),
        sessionCount: em.seanceCounter,
        notes: em.additionalInfo,
        submittedAt: em.createdAt.split("T")[0],
        teacherName: [em.professeur.prenom, em.professeur.nom].join(" "),
        class: [em.classe.niveau, em.classe.nom].join(" "),
        subject: em.discipline.name,
        classId: em.classe.id,
        subjectId: em.discipline.id,
      }));
      setAttendanceRecords(formatted);
    }
  }, [dbEmargements]);

  const uniqueClasses = useMemo(() => classes ?? [], [classes]);
  const uniqueSubjects = useMemo(() => subjects ?? [], [subjects]);

  if (!dbEmargements) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const handleEdit = (record: AttendanceRecord) => {
    setEditingRecord({ ...record });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    // Sécurité: on empêche l’enregistrement si matière/classe vides
    if (!editingRecord.subject || !editingRecord.class) {
      toast({
        title: "Champs requis",
        description: "Veuillez sélectionner une matière et une classe.",
        variant: "destructive",
      });
      return;
    }

    setAttendanceRecords((prev) =>
      prev.map((record) => (record.id === editingRecord.id ? editingRecord : record))
    );

    toast({
      title: "Émargement modifié",
      description: "Vos modifications ont été enregistrées avec succès.",
    });

    await updateMutation.mutateAsync({
      id: editingRecord.id,
      updatedEmargement: {
        classeId: editingRecord.classId!,
        disciplineId: editingRecord.subjectId!,
        debut: `${editingRecord.date}T${editingRecord.startTime}`,
        fin: `${editingRecord.date}T${editingRecord.endTime}`,
        seanceCounter: editingRecord.sessionCount,
        content: editingRecord.courseSummary,
        additionalInfo: editingRecord.notes,
      },
    });
    setEditingRecord(null);
    setIsEditDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    setDeleteRecordId(id);
  };

  const confirmDelete = async () => {
    if (!deleteRecordId) return;

    toast({
      title: "Émargement supprimé",
      description: "L'émargement a été supprimé avec succès.",
      variant: "default",
    });

    setDeleteRecordId(null);
    await deleteMutation.mutateAsync(deleteRecordId);
  };

  // Get unique classes for filter
  const filteredRecords = attendanceRecords.filter((record) => {
    const matchesMonth =
      !selectedMonth || selectedMonth === "all" || record.date.includes(selectedMonth);
    const matchesSearch =
      !searchTerm ||
      record.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.class.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClass === "all" || record.class === selectedClass;

    return matchesMonth && matchesSearch && matchesClass;
  });

  const calculateHours = (startTime: string, endTime: string): number => {
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);
    const start = startHour + startMin / 60;
    const end = endHour + endMin / 60;
    return end - start;
  };

  const getRateForClass = (classe: string) => {
    const c = (classe || "").toLowerCase().trim();
    const isExam =
      c.includes("terminal") || c.startsWith("3") || c.includes("3e") || c.includes("3ème");
    return isExam ? 4000 : 3000;
  };

  const calculateStats = (records: AttendanceRecord[]) => {
    const totalHours = records.reduce((sum, r) => sum + calculateHours(r.startTime, r.endTime), 0);
    const totalSessions = records.length;
    const totalPayment = records.reduce((sum, r) => {
      const hours = calculateHours(r.startTime, r.endTime);
      const rate = getRateForClass(r.class);
      return sum + hours * rate;
    }, 0);

    return { totalHours, totalSessions, totalPayment };
  };

  const handleDownloadPDF = () => {
    const monthLabel = allMonths.find((m) => m.value === selectedMonth)?.label || "Toute la période";
    const stats = calculateStats(filteredRecords);
    const teacherName = authUser ? `${authUser.prenom} ${authUser.nom}` : "Enseignant";

    generateTeacherAttendanceReport(
      filteredRecords,
      teacherName,
      monthLabel,
      schoolData?.name || "Ma Super École",
      logo,
      stats
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="h-auto p-2 sm:p-3 lg:p-4 flex flex-col items-center space-y-1 sm:space-y-2 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white transition-all duration-200">
          <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-gray-700 dark:text-gray-300" />
          <div className="text-center">
            <div className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white">
              Historique Émargement
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
              Voir mes émargements
            </div>
          </div>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-[95vw] w-full h-[90vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5" />
            Mon Historique d'Émargement
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-y-auto">
          {/* Filtres */}
          <Card className="flex-shrink-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Search className="w-3 h-3 sm:w-4 sm:h-4" />
                Filtres de Recherche
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm">Mois</Label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="h-9 sm:h-10">
                      <SelectValue placeholder="Tous les mois" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les mois</SelectItem>
                      {allMonths.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm">Classe</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="h-9 sm:h-10">
                      <SelectValue placeholder="Toutes les classes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les classes</SelectItem>
                      {uniqueClasses.map((cls) => (
                        <SelectItem key={cls.id} value={`${cls.niveau} ${cls.nom}`}>
                          {cls.niveau} {cls.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm">Recherche</Label>
                  <Input
                    placeholder="Rechercher par matière..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-9 sm:h-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Récapitulatif */}
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 flex-shrink-0">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-sm sm:text-base flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <span className="text-xs sm:text-sm">Récapitulatif de vos émargements</span>
                  {selectedMonth && selectedMonth !== "all" && (
                    <span className="text-xs sm:text-sm font-normal">
                      - {allMonths.find((m) => m.value === selectedMonth)?.label}
                    </span>
                  )}
                </CardTitle>
                <Button
                  onClick={handleDownloadPDF}
                  disabled={filteredRecords.length === 0}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm">
                  <Download className="w-4 h-4" />
                  Télécharger PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {(() => {
                  const stats = calculateStats(filteredRecords);
                  return (
                    <>
                      <div className="text-center p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                        <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-600 dark:text-blue-400">
                          {stats.totalSessions}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Séances totales
                        </div>
                      </div>
                      <div className="text-center p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                        <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-600 dark:text-green-400">
                          {stats.totalHours.toFixed(1)}h
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Heures de cours
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Liste des émargements */}
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-3 flex-shrink-0">
              <CardTitle className="text-sm sm:text-base">
                Mes Émargements ({filteredRecords.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 pb-4">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-3">
                  {filteredRecords.map((record) => (
                    <Card
                      key={record.id}
                      className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex flex-col gap-2 mb-3">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
                                <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                <span className="truncate">
                                  {record.subject} - {record.class}
                                </span>
                              </h4>
                            </div>
                            <Badge
                              variant="outline"
                              className="flex items-center gap-1 shrink-0 text-xs w-fit">
                              <Calendar className="w-3 h-3" />
                              {new Date(record.date).toLocaleDateString("fr-FR")}
                            </Badge>
                          </div>

                          {/* Boutons d'action */}
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(record)}
                              className="flex items-center gap-1 h-7 text-xs">
                              <Edit2 className="w-3 h-3" />
                              <span className="hidden sm:inline">Modifier</span> /
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(record.id)}
                              className="flex items-center gap-1 h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950">
                              <Trash2 className="w-3 h-3" />
                              <span className="hidden sm:inline">Supprimer</span>
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 shrink-0" />
                            <span className="text-xs sm:text-sm truncate">
                              {record.startTime} - {record.endTime}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500 shrink-0" />
                            <span className="text-xs sm:text-sm font-medium">
                              {calculateHours(record.startTime, record.endTime)}h
                            </span>
                          </div>
                          <div className="text-xs sm:text-sm col-span-2">
                            <span className="font-medium">{record.sessionCount}</span> séance(s)
                          </div>
                        </div>

                        {record.courseSummary && (
                          <div className="mb-2">
                            <span className="text-xs sm:text-sm font-medium">Résumé: </span>
                            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                              {record.courseSummary}
                            </span>
                          </div>
                        )}

                        {record.notes && (
                          <div className="mb-2">
                            <span className="text-xs sm:text-sm font-medium">Notes: </span>
                            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                              {record.notes}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  {filteredRecords.length === 0 && (
                    <div className="text-center py-8 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      Aucun émargement trouvé pour les critères sélectionnés
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </DialogContent>

      {/* Dialog de modification */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Modifier l'émargement</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Modifiez les informations de votre émargement
            </DialogDescription>
          </DialogHeader>

          {editingRecord && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* MATIÈRE — Select au lieu d'Input */}
                <div className="space-y-2">
                  <Label htmlFor="edit-subject" className="text-xs sm:text-sm">
                    Matière
                  </Label>
                  <Select
                    value={editingRecord.subjectId}
                    onValueChange={(val) => setEditingRecord({ ...editingRecord, subjectId: val })}>
                    <SelectTrigger id="edit-subject" className="h-9 text-sm">
                      <SelectValue placeholder="Choisir une matière" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Si la valeur actuelle n'est pas dans la liste, on l'affiche pour éviter de la perdre */}
                      {uniqueSubjects.map((subj) => (
                        <SelectItem key={subj.id} value={subj.id}>
                          {subj.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-class" className="text-xs sm:text-sm">
                    Classe
                  </Label>
                  <Select
                    value={editingRecord.classId}
                    onValueChange={(val) => setEditingRecord({ ...editingRecord, classId: val })}>
                    <SelectTrigger id="edit-class" className="h-9 text-sm">
                      <SelectValue placeholder="Choisir une classe" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueClasses.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.niveau} {cls.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-date" className="text-xs sm:text-sm">
                  Date
                </Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editingRecord.date}
                  onChange={(e) => setEditingRecord({ ...editingRecord, date: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-start" className="text-xs sm:text-sm">
                    Heure début
                  </Label>
                  <Input
                    id="edit-start"
                    type="time"
                    value={editingRecord.startTime}
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, startTime: e.target.value })
                    }
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-end" className="text-xs sm:text-sm">
                    Heure fin
                  </Label>
                  <Input
                    id="edit-end"
                    type="time"
                    value={editingRecord.endTime}
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, endTime: e.target.value })
                    }
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-sessions" className="text-xs sm:text-sm">
                    Séances
                  </Label>
                  <Input
                    id="edit-sessions"
                    type="number"
                    min="1"
                    value={editingRecord.sessionCount}
                    onChange={(e) =>
                      setEditingRecord({
                        ...editingRecord,
                        sessionCount: parseInt(e.target.value) || 1,
                      })
                    }
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-summary" className="text-xs sm:text-sm">
                  Résumé du cours
                </Label>
                <Textarea
                  id="edit-summary"
                  value={editingRecord.courseSummary}
                  onChange={(e) =>
                    setEditingRecord({ ...editingRecord, courseSummary: e.target.value })
                  }
                  className="min-h-[80px] text-sm"
                  placeholder="Décrivez brièvement le contenu du cours..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-notes" className="text-xs sm:text-sm">
                  Notes
                </Label>
                <Textarea
                  id="edit-notes"
                  value={editingRecord.notes}
                  onChange={(e) => setEditingRecord({ ...editingRecord, notes: e.target.value })}
                  className="min-h-[60px] text-sm"
                  placeholder="Notes additionnelles..."
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              className="w-full sm:w-auto text-sm">
              Annuler
            </Button>
            <Button onClick={handleSaveEdit} className="w-full sm:w-auto text-sm">
              Enregistrer les modifications
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={!!deleteRecordId} onOpenChange={() => setDeleteRecordId(null)}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-[500px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">
              Confirmer la suppression
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm">
              Êtes-vous sûr de vouloir supprimer cet émargement ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto text-sm">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-sm">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default TeacherAttendanceHistory;
