import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { FileSpreadsheet, Search, Calendar, Clock, Users, BookOpen, Loader2, Download } from "lucide-react";
import { useEmargements } from "@/hooks/useEmargement";
import { useAllTeachers } from "@/hooks/useUsers";
import { useAuth } from "@/hooks/useAuth";
import { generateTeacherAttendanceReport } from "@/utils/generateTeacherAttendanceReport";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useSchoolLogo } from "@/hooks/useSchoolLogo";

interface AttendanceRecord {
  id: string;
  teacherName: string;
  subject: string;
  class: string;
  date: string; // format YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  sessionCount: number;
  courseSummary: string;
  notes: string;
  submittedAt: string; // ISO
}

const AdminAttendanceHistory = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { authUser } = useAuth();

  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const { data: dbEmargements } = useEmargements();
  const { data: dbteachers } = useAllTeachers(authUser);
  const { useGetSchool } = useSchoolData();
  const { data: schoolData } = useGetSchool();
  const logo = useSchoolLogo();

  if (dbEmargements == undefined || dbEmargements == null || !dbteachers) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const formattedEmargement: AttendanceRecord[] = dbEmargements.map((em: any) => {
    // Handle both Prisma ISO strings and D1 Epoch timestamp numbers
    const parseSqlDate = (d: any) => {
      if (!d) return new Date().toISOString();
      if (typeof d === 'number' || (typeof d === 'string' && !isNaN(Number(d)))) {
        // Test if the number is too small (seconds vs ms). D1 stores ms.
        return new Date(Number(d)).toISOString();
      }
      return new Date(d).toISOString();
    };

    const debutIso = parseSqlDate(em.debut);
    const finIso = parseSqlDate(em.fin);
    const createdAtIso = parseSqlDate(em.createdAt);

    return {
      id: em.id,
      date: debutIso.split("T")[0],
      courseSummary: em.content,
      startTime: debutIso.slice(11, 16),
      endTime: finIso.slice(11, 16),
      sessionCount: em.seanceCounter,
      notes: em.additionalInfo,
      submittedAt: createdAtIso.split("T")[0],
      teacherName: [(em.professeur?.prenom || em.professeurPrenom || ""), (em.professeur?.nom || em.professeurNom || "")].filter(Boolean).join(" ") || "Inconnu",
      class: [(em.classe?.niveau || em.classeNiveau || ""), (em.classe?.nom || em.classeName || "")].filter(Boolean).join(" ") || "Classe Inconnue",
      subject: em.discipline?.name || em.disciplineName || "Matière",
    };
  });

  const teachers = dbteachers.map((dbt) => `${dbt.prenom} ${dbt.nom}`);
  const filteredRecords = formattedEmargement.filter((record) => {
    const matchesTeacher =
      !selectedTeacher || selectedTeacher === "all" || record.teacherName === selectedTeacher;
    const matchesMonth =
      !selectedMonth || selectedMonth === "all" || record.date.includes(selectedMonth);
    const matchesSearch =
      !searchTerm ||
      record.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.class.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesTeacher && matchesMonth && matchesSearch;
  });

  const calculateHours = (startTime: string, endTime: string): number => {
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);
    const start = startHour + startMin / 60;
    const end = endHour + endMin / 60;
    return end - start;
  };
  // ======= ⚙️ NOUVELLE RÈGLE DE CALCUL =======
  const SESSION_MINUTES = 40;
  const HOUR_FACTOR = SESSION_MINUTES / 60; // 40/60

  // Tarif horaire selon classe (examen ou non)
  const getRateForClass = (classe: string) => {
    const c = (classe || "").toLowerCase().trim();
    const isExam =
      c.includes("terminal l2") ||
      c.includes("terminal s2") ||
      c.startsWith("3") ||
      c.includes("3e") ||
      c.includes("3ème");
    return isExam ? 4000 : 3000; // CFA PAR HEURE
  };

  // Heures calculées PAR SÉANCES (et non plus par horaires)
  const hoursFromSessions = (sessions: number) => (sessions || 0) * HOUR_FACTOR;
  // ===========================================

  const calculateStats = (records: AttendanceRecord[]) => {
    // totalHours = somme des (séances * 40/60)
    const totalHours = records.reduce((sum, r) => sum + hoursFromSessions(r.sessionCount || 1), 0);
    const totalSessions = records.reduce((sum, r) => sum + (r.sessionCount || 1), 0);
    // Montant = heures (par règle) × tarif horaire (3000 / 4000)
    const totalPayment = records.reduce((sum, r) => {
      const hours = hoursFromSessions(r.sessionCount || 1);
      const rate = getRateForClass(r.class);
      return sum + hours * rate;
    }, 0);

    return { totalHours, totalSessions, totalPayment };
  };
  // ---------------------------------------------------------------------

  // Générer les mois dynamiquement basés sur l'année actuelle
  const currentYear = new Date().getFullYear() - 1;
  const currentMonth = new Date().getMonth(); // 0-11

  const months = Array.from({ length: 12 }, (_, i) => {
    const monthIndex = i + 1;
    const monthValue = `${currentYear}-${monthIndex.toString().padStart(2, "0")}`;
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
    return {
      value: monthValue,
      label: `${monthNames[i]} ${currentYear}`,
    };
  });

  // Ajouter aussi les mois de l'année prochaine
  const nextYearMonths = Array.from({ length: 12 }, (_, i) => {
    const monthIndex = i + 1;
    const monthValue = `${currentYear + 1}-${monthIndex.toString().padStart(2, "0")}`;
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
    return {
      value: monthValue,
      label: `${monthNames[i]} ${currentYear + 1}`,
    };
  });

  const allMonths = [...months, ...nextYearMonths];

  const handleDownloadPDF = () => {
    const teacherName = !selectedTeacher || selectedTeacher === "all" ? "Tous les enseignants" : selectedTeacher;
    const monthLabel = allMonths.find((m) => m.value === selectedMonth)?.label || "Toute la période";
    const stats = calculateStats(filteredRecords);

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
              Émargements
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
              Historique des professeurs
            </div>
          </div>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-[95vw] w-full h-[90vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5" />
            Historique des Émargements
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm">Professeur</Label>
                  <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                    <SelectTrigger className="h-9 sm:h-10">
                      <SelectValue placeholder="Tous les professeurs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les professeurs</SelectItem>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher} value={teacher}>
                          {teacher}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

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
                  <Label className="text-xs sm:text-sm">Recherche</Label>
                  <Input
                    placeholder="Matière ou classe..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-9 sm:h-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Récapitulatif mensuel */}
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 flex-shrink-0">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-sm sm:text-base flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <span className="text-xs sm:text-sm">Récapitulatif</span>
                  <span className="text-xs sm:text-sm font-normal">
                    {selectedMonth && selectedMonth !== "all"
                      ? allMonths.find((m) => m.value === selectedMonth)?.label
                      : ""}
                    {selectedTeacher && selectedTeacher !== "all" ? ` - ${selectedTeacher}` : ""}
                  </span>
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
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
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
                      <div className="text-center p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                        <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-orange-600 dark:text-orange-400">
                          3000 – 4000 CFA
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Tarif horaire (selon classe)
                        </div>
                      </div>
                      <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow-md col-span-2 lg:col-span-1">
                        <div className="text-xl sm:text-2xl lg:text-3xl font-bold">
                          {stats.totalPayment.toLocaleString("fr-FR")} CFA
                        </div>
                        <div className="text-xs sm:text-sm mt-1 opacity-90">Montant à payer</div>
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
                Émargements ({filteredRecords.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 pb-4">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-3">
                  {filteredRecords.map((record) => {
                    const computedHours = hoursFromSessions(record.sessionCount || 1);
                    const rate = getRateForClass(record.class);
                    const amount = computedHours * rate;
                    const isAbsent = record.sessionCount === 0;
                    const isLate = record.courseSummary?.toLowerCase().includes("retard");

                    return (
                      <Card
                        key={record.id}
                        className={`border-l-4 ${isAbsent ? "border-l-red-500 bg-red-50/30" :
                          isLate ? "border-l-orange-500 bg-orange-50/30" :
                            "border-l-blue-500"
                          }`}
                      >
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                            <div className="flex-1">
                              <h4 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
                                <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span className="truncate">
                                  {record.subject} - {record.class}
                                </span>
                              </h4>
                              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                                {record.teacherName}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className="flex items-center gap-1 shrink-0 text-xs">
                              <Calendar className="w-3 h-3" />
                              {new Date(record.date).toLocaleDateString("fr-FR")}
                            </Badge>
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
                            <div className="text-xs sm:text-sm">
                              <span className="font-medium">{record.sessionCount}</span> séance(s)
                            </div>
                            <div className="text-xs sm:text-sm font-semibold text-green-600 dark:text-green-400">
                              {amount.toLocaleString("fr-FR")} CFA
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
                    );
                  })}

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
    </Dialog>
  );
};

export default AdminAttendanceHistory;
