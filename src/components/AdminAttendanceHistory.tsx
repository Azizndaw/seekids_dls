import React, { useState, useMemo } from "react";
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
import {
  FileSpreadsheet,
  Search,
  Calendar,
  Clock,
  BookOpen,
  Loader2,
  Download,
  ChevronDown,
  ChevronUp,
  Calculator,
} from "lucide-react";
import { useEmargements } from "@/hooks/useEmargement";
import { useAllTeachers } from "@/hooks/useUsers";
import { useAuth } from "@/hooks/useAuth";
import { useGetAllCours } from "@/hooks/useCours";
import { generateTeacherAttendanceReport } from "@/utils/generateTeacherAttendanceReport";
import { calculateTeachersSchedulePayroll } from "@/utils/teacherSchedulePayroll";
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
  const [showScheduleTable, setShowScheduleTable] = useState(true);
  const { authUser } = useAuth();

  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const { data: dbEmargements, refetch: refetchEmargements } = useEmargements();
  const { data: dbteachers } = useAllTeachers(authUser);
  const { data: dbCourses, refetch: refetchCourses } = useGetAllCours();
  const { useGetSchool } = useSchoolData();
  const { data: schoolData } = useGetSchool();
  const logo = useSchoolLogo();

  const hasSpecificMonth = Boolean(selectedMonth && selectedMonth !== "all");

  const schedulePayroll = useMemo(
    () =>
      calculateTeachersSchedulePayroll(dbCourses, selectedMonth, {
        selectedTeacher,
        searchTerm,
      }),
    [dbCourses, selectedMonth, selectedTeacher, searchTerm]
  );

  if (dbEmargements == undefined || dbEmargements == null || !dbteachers) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const formattedEmargement: AttendanceRecord[] = dbEmargements.map((em: any) => {
    const parseSqlDate = (d: any) => {
      if (!d) return new Date().toISOString();
      if (typeof d === "number" || (typeof d === "string" && !isNaN(Number(d)))) {
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
      teacherName:
        [
          em.professeur?.prenom || em.professeurPrenom || "",
          em.professeur?.nom || em.professeurNom || "",
        ]
          .filter(Boolean)
          .join(" ") || "Inconnu",
      class:
        Array.isArray(em.classes) && em.classes.length > 0
          ? em.classes
              .map((classe: any) => [classe.niveau, classe.nom].filter(Boolean).join(" "))
              .join(" + ")
          : [(em.classe?.niveau || em.classeNiveau || ""), (em.classe?.nom || em.classeName || "")]
              .filter(Boolean)
              .join(" ") || "Classe Inconnue",
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

  const isNdaw = (teacherName?: string | null): boolean => {
    return !!teacherName && teacherName.toLowerCase().includes("ndaw");
  };

  // Tarif horaire selon classe (examen ou non)
  const getRateForClass = (classe: string) => {
    const c = (classe || "").toLowerCase().trim();
    const isExam =
      c.includes("terminal l2") ||
      c.includes("terminal s2") ||
      c.includes("terminal") ||
      c.includes("tl2") ||
      c.includes("ts2") ||
      c.startsWith("3") ||
      c.includes("3e") ||
      c.includes("3ème");
    return isExam ? 4000 : 3000; // CFA PAR HEURE
  };

  // Heures calculées PAR SÉANCES (et non plus par horaires)
  const hoursFromSessions = (sessions: number) => (sessions || 0) * HOUR_FACTOR;
  // ===========================================

  const calculateStats = (records: AttendanceRecord[]) => {
    const totalHours = records.reduce((sum, r) => sum + hoursFromSessions(r.sessionCount || 1), 0);
    const totalSessions = records.reduce((sum, r) => sum + (r.sessionCount || 1), 0);
    // Montant = pour M. Ndaw: calcul interne à 4000 CFA par séance
    // pour les autres: heures (par règle) × tarif horaire (3000 / 4000)
    const totalPayment = records.reduce((sum, r) => {
      const sessions = r.sessionCount !== undefined ? r.sessionCount : 1;
      if (isNdaw(r.teacherName)) {
        return sum + sessions * 4000;
      }
      const hours = hoursFromSessions(sessions);
      const rate = getRateForClass(r.class);
      return sum + hours * rate;
    }, 0);

    return { totalHours, totalSessions, totalPayment };
  };
  // ---------------------------------------------------------------------

  // Générer les mois couvrant les années scolaires 2025, 2026 et 2027
  const baseYear = new Date().getFullYear() - 1;
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

  const buildYearMonths = (yr: number) =>
    Array.from({ length: 12 }, (_, i) => {
      const monthIndex = i + 1;
      return {
        value: `${yr}-${monthIndex.toString().padStart(2, "0")}`,
        label: `${monthNames[i]} ${yr}`,
      };
    });

  const allMonths = [
    ...buildYearMonths(baseYear),
    ...buildYearMonths(baseYear + 1),
    ...buildYearMonths(baseYear + 2),
  ];

  const selectedMonthLabel =
    allMonths.find((m) => m.value === selectedMonth)?.label || "Toute la période";

  const handleDownloadPDF = () => {
    const teacherName =
      !selectedTeacher || selectedTeacher === "all" ? "Tous les enseignants" : selectedTeacher;
    const stats = calculateStats(filteredRecords);

    generateTeacherAttendanceReport(
      filteredRecords,
      teacherName,
      selectedMonthLabel,
      schoolData?.name || "Ma Super École",
      logo,
      stats,
      {
        ...schedulePayroll,
        hasSpecificMonth,
      }
    );
  };

  // Valeurs prévues à afficher dans la carte principale selon qu'un mois précis est sélectionné ou non
  const expectedSessionsToDisplay = hasSpecificMonth
    ? schedulePayroll.totals.calendarSessions
    : schedulePayroll.totals.monthlySessions4W;
  const expectedHoursToDisplay = hasSpecificMonth
    ? schedulePayroll.totals.calendarHours
    : schedulePayroll.totals.monthlyHours4W;
  const expectedPaymentToDisplay = hasSpecificMonth
    ? schedulePayroll.totals.calendarPayment
    : schedulePayroll.totals.monthlyPayment4W;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) {
          void refetchEmargements();
          void refetchCourses();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="h-auto p-2 sm:p-3 lg:p-4 flex flex-col items-center space-y-1 sm:space-y-2 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white transition-all duration-200"
        >
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
            Historique des Émargements & Prévisions Mensuelles (Selon Planning)
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
                    {hasSpecificMonth ? selectedMonthLabel : ""}
                    {selectedTeacher && selectedTeacher !== "all" ? ` - ${selectedTeacher}` : ""}
                  </span>
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowScheduleTable((prev) => !prev)}
                    className="flex items-center gap-1.5 text-xs border-emerald-600/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    {showScheduleTable
                      ? "Masquer prévisions par mois"
                      : "Voir prévisions par mois (sans absence)"}
                    {showScheduleTable ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </Button>
                  <Button
                    onClick={handleDownloadPDF}
                    disabled={filteredRecords.length === 0 && schedulePayroll.teachers.length === 0}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                    size="sm"
                  >
                    <Download className="w-4 h-4" />
                    Télécharger PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
                {(() => {
                  const stats = calculateStats(filteredRecords);
                  return (
                    <>
                      <div className="text-center p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                        <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-600 dark:text-blue-400">
                          {stats.totalSessions}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Séances émargées
                        </div>
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                          Prévu sans abs. : {expectedSessionsToDisplay} séances
                        </div>
                      </div>
                      <div className="text-center p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                        <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-600 dark:text-green-400">
                          {stats.totalHours.toFixed(1)}h
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Heures émargées
                        </div>
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                          Prévu sans abs. : {expectedHoursToDisplay.toFixed(1)}h
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
                      <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow-md">
                        <div className="text-lg sm:text-xl lg:text-2xl font-bold">
                          {Math.round(stats.totalPayment).toLocaleString("fr-FR")} CFA
                        </div>
                        <div className="text-xs sm:text-sm mt-1 opacity-90">
                          Montant à payer (Émargé)
                        </div>
                      </div>
                      <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-lg shadow-md col-span-2 lg:col-span-1">
                        <div className="text-lg sm:text-xl lg:text-2xl font-bold">
                          {Math.round(expectedPaymentToDisplay).toLocaleString("fr-FR")} CFA
                        </div>
                        <div className="text-xs font-medium mt-1 opacity-95">
                          {hasSpecificMonth
                            ? `Prévision ${selectedMonthLabel} (Sans absence)`
                            : "Prévision Mensuelle (Sans absence)"}
                        </div>
                        <div className="text-[11px] mt-1 bg-white/15 rounded px-1.5 py-0.5 inline-block">
                          {schedulePayroll.periodLabel}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Grille Mensuelle Théorique selon l'Emploi du Temps (Sans Absence) */}
          {showScheduleTable && (
            <Card className="border-2 border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/10 flex-shrink-0">
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                      <Calculator className="w-4 h-4" />
                      {selectedTeacher && selectedTeacher !== "all"
                        ? `Prévisions Mensuelles Sans Absence (Selon Planning) — ${selectedTeacher}`
                        : "Prévisions Mensuelles par Professeur (Selon leur Planning • Sans Absence)"}
                    </CardTitle>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                      Calendrier scolaire intégré :{" "}
                      <span className="font-medium">Octobre</span> dès le 12 oct. •{" "}
                      <span className="font-medium">Novembre</span> mois complet •{" "}
                      <span className="font-medium">Décembre</span> arrêt le 23 déc. •{" "}
                      <span className="font-medium">Janvier</span> reprise le 6 janv.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="border-emerald-600 text-emerald-800 dark:text-emerald-200 text-xs">
                      Oct (12-31) :{" "}
                      {Math.round(
                        schedulePayroll.totals.bySpecialMonth.october.payment
                      ).toLocaleString("fr-FR")}{" "}
                      CFA
                    </Badge>
                    <Badge variant="outline" className="border-emerald-600 text-emerald-800 dark:text-emerald-200 text-xs">
                      Nov (1-30) :{" "}
                      {Math.round(
                        schedulePayroll.totals.bySpecialMonth.november.payment
                      ).toLocaleString("fr-FR")}{" "}
                      CFA
                    </Badge>
                    <Badge variant="outline" className="border-emerald-600 text-emerald-800 dark:text-emerald-200 text-xs">
                      Déc (1-23) :{" "}
                      {Math.round(
                        schedulePayroll.totals.bySpecialMonth.december.payment
                      ).toLocaleString("fr-FR")}{" "}
                      CFA
                    </Badge>
                    <Badge variant="outline" className="border-emerald-600 text-emerald-800 dark:text-emerald-200 text-xs">
                      Janv (6-31) :{" "}
                      {Math.round(
                        schedulePayroll.totals.bySpecialMonth.january.payment
                      ).toLocaleString("fr-FR")}{" "}
                      CFA
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                {selectedTeacher && selectedTeacher !== "all" ? (
                  // Vue détaillée des créneaux de l'emploi du temps pour le professeur sélectionné
                  schedulePayroll.teachers.length > 0 ? (
                    <div className="space-y-3">
                      {schedulePayroll.teachers.map((t) => (
                        <div key={t.teacherName} className="space-y-2">
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-white dark:bg-gray-800 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 text-xs">
                            <div className="p-2 rounded bg-gray-50 dark:bg-gray-700/60">
                              <div className="text-gray-500 dark:text-gray-400">Planning Hebdo</div>
                              <div className="font-bold text-sm text-gray-900 dark:text-white mt-0.5">
                                {Math.round(t.weeklyPayment).toLocaleString("fr-FR")} CFA
                              </div>
                              <div className="text-[11px] text-gray-500">
                                {t.weeklySessions} séances ({t.weeklyHours.toFixed(1)}h)
                              </div>
                            </div>
                            <div className="p-2 rounded bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60">
                              <div className="text-emerald-800 dark:text-emerald-300 font-medium">
                                Octobre (12 – 31 oct.)
                              </div>
                              <div className="font-bold text-sm text-emerald-700 dark:text-emerald-400 mt-0.5">
                                {Math.round(t.bySpecialMonth.october.payment).toLocaleString("fr-FR")} CFA
                              </div>
                              <div className="text-[11px] text-gray-500">
                                {t.bySpecialMonth.october.sessions} séances ({t.bySpecialMonth.october.hours.toFixed(1)}h)
                              </div>
                            </div>
                            <div className="p-2 rounded bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60">
                              <div className="text-emerald-800 dark:text-emerald-300 font-medium">
                                Novembre (1 – 30 nov.)
                              </div>
                              <div className="font-bold text-sm text-emerald-700 dark:text-emerald-400 mt-0.5">
                                {Math.round(t.bySpecialMonth.november.payment).toLocaleString("fr-FR")} CFA
                              </div>
                              <div className="text-[11px] text-gray-500">
                                {t.bySpecialMonth.november.sessions} séances ({t.bySpecialMonth.november.hours.toFixed(1)}h)
                              </div>
                            </div>
                            <div className="p-2 rounded bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60">
                              <div className="text-emerald-800 dark:text-emerald-300 font-medium">
                                Décembre (1 – 23 déc.)
                              </div>
                              <div className="font-bold text-sm text-emerald-700 dark:text-emerald-400 mt-0.5">
                                {Math.round(t.bySpecialMonth.december.payment).toLocaleString("fr-FR")} CFA
                              </div>
                              <div className="text-[11px] text-gray-500">
                                {t.bySpecialMonth.december.sessions} séances ({t.bySpecialMonth.december.hours.toFixed(1)}h)
                              </div>
                            </div>
                            <div className="p-2 rounded bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 col-span-2 sm:col-span-1">
                              <div className="text-emerald-800 dark:text-emerald-300 font-medium">
                                Janvier (6 – 31 janv.)
                              </div>
                              <div className="font-bold text-sm text-emerald-700 dark:text-emerald-400 mt-0.5">
                                {Math.round(t.bySpecialMonth.january.payment).toLocaleString("fr-FR")} CFA
                              </div>
                              <div className="text-[11px] text-gray-500">
                                {t.bySpecialMonth.january.sessions} séances ({t.bySpecialMonth.january.hours.toFixed(1)}h)
                              </div>
                            </div>
                          </div>

                          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                            <table className="w-full text-xs sm:text-sm text-left">
                              <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                  <th className="py-2 px-3">Jour</th>
                                  <th className="py-2 px-3">Horaire</th>
                                  <th className="py-2 px-3">Matière</th>
                                  <th className="py-2 px-3">Classe(s)</th>
                                  <th className="py-2 px-3 text-center">Séances/sem</th>
                                  <th className="py-2 px-3 text-center">Heures/sem</th>
                                  <th className="py-2 px-3 text-right">Tarif</th>
                                  <th className="py-2 px-3 text-right">Montant/cours</th>
                                  {hasSpecificMonth && (
                                    <th className="py-2 px-3 text-center">
                                      Jours ({selectedMonthLabel})
                                    </th>
                                  )}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {t.slots.map((slot) => (
                                  <tr
                                    key={slot.key}
                                    className="hover:bg-gray-50/80 dark:hover:bg-gray-700/40"
                                  >
                                    <td className="py-2 px-3 font-medium">{slot.jour}</td>
                                    <td className="py-2 px-3">{slot.displayTime}</td>
                                    <td className="py-2 px-3">{slot.disciplineName}</td>
                                    <td className="py-2 px-3 font-medium">{slot.classDisplay}</td>
                                    <td className="py-2 px-3 text-center font-semibold text-blue-600 dark:text-blue-400">
                                      {slot.sessions}
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      {slot.hours.toFixed(1)}h
                                    </td>
                                    <td className="py-2 px-3 text-right">
                                      {slot.rate.toLocaleString("fr-FR")} CFA/h
                                    </td>
                                    <td className="py-2 px-3 text-right font-medium text-emerald-700 dark:text-emerald-400">
                                      {Math.round(slot.hours * slot.rate).toLocaleString("fr-FR")}{" "}
                                      CFA
                                    </td>
                                    {hasSpecificMonth && (
                                      <td className="py-2 px-3 text-center">
                                        {slot.calendarOccurrences} j. ({slot.calendarSessions} s.)
                                      </td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-xs sm:text-sm text-gray-500">
                      Aucun créneau trouvé dans l'emploi du temps pour ce professeur.
                    </div>
                  )
                ) : (
                  // Vue globale de tous les professeurs avec Octobre (12-31), Novembre (1-30), Décembre (1-23), Janvier (6-31)
                  <div className="overflow-x-auto max-h-80 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <table className="w-full text-xs sm:text-sm text-left">
                      <thead className="bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 sticky top-0 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                          <th className="py-2.5 px-3">Professeur</th>
                          <th className="py-2.5 px-3 text-center">Hebdo (EDT)</th>
                          <th className="py-2.5 px-3 text-right">Octobre (12–31)</th>
                          <th className="py-2.5 px-3 text-right">Novembre (1–30)</th>
                          <th className="py-2.5 px-3 text-right">Décembre (1–23)</th>
                          <th className="py-2.5 px-3 text-right">Janvier (6–31)</th>
                          {hasSpecificMonth && (
                            <th className="py-2.5 px-3 text-right bg-emerald-50 dark:bg-emerald-950/40">
                              Prévu {selectedMonthLabel}
                            </th>
                          )}
                          <th className="py-2.5 px-3 text-right">Émargé (Filtre)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {schedulePayroll.teachers.map((t) => {
                          const teacherActualRecords = filteredRecords.filter(
                            (r) => r.teacherName === t.teacherName
                          );
                          const teacherActualStats = calculateStats(teacherActualRecords);

                          return (
                            <tr
                              key={t.teacherName}
                              onClick={() => setSelectedTeacher(t.teacherName)}
                              title="Cliquer pour voir le détail du planning de ce professeur"
                              className="hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30 cursor-pointer transition-colors"
                            >
                              <td className="py-2 px-3">
                                <div className="font-semibold text-gray-900 dark:text-white">
                                  {t.teacherName}
                                </div>
                                <div className="text-[11px] text-gray-500">
                                  {t.subjects.join(", ")}
                                </div>
                              </td>
                              <td className="py-2 px-3 text-center">
                                <div className="font-medium">
                                  {Math.round(t.weeklyPayment).toLocaleString("fr-FR")} CFA
                                </div>
                                <div className="text-[11px] text-gray-500">
                                  {t.weeklySessions} s. ({t.weeklyHours.toFixed(1)}h)
                                </div>
                              </td>
                              <td className="py-2 px-3 text-right">
                                <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                                  {Math.round(t.bySpecialMonth.october.payment).toLocaleString("fr-FR")} CFA
                                </div>
                                <div className="text-[11px] text-gray-500">
                                  {t.bySpecialMonth.october.sessions} s.
                                </div>
                              </td>
                              <td className="py-2 px-3 text-right">
                                <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                                  {Math.round(t.bySpecialMonth.november.payment).toLocaleString("fr-FR")} CFA
                                </div>
                                <div className="text-[11px] text-gray-500">
                                  {t.bySpecialMonth.november.sessions} s.
                                </div>
                              </td>
                              <td className="py-2 px-3 text-right">
                                <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                                  {Math.round(t.bySpecialMonth.december.payment).toLocaleString("fr-FR")} CFA
                                </div>
                                <div className="text-[11px] text-gray-500">
                                  {t.bySpecialMonth.december.sessions} s.
                                </div>
                              </td>
                              <td className="py-2 px-3 text-right">
                                <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                                  {Math.round(t.bySpecialMonth.january.payment).toLocaleString("fr-FR")} CFA
                                </div>
                                <div className="text-[11px] text-gray-500">
                                  {t.bySpecialMonth.january.sessions} s.
                                </div>
                              </td>
                              {hasSpecificMonth && (
                                <td className="py-2 px-3 text-right font-bold text-teal-800 dark:text-teal-300 bg-emerald-50/40 dark:bg-emerald-950/20">
                                  <div>
                                    {Math.round(t.calendarPayment).toLocaleString("fr-FR")} CFA
                                  </div>
                                  <div className="text-[11px] font-normal text-gray-500">
                                    {t.calendarSessions} s. ({t.calendarHours.toFixed(1)}h)
                                  </div>
                                </td>
                              )}
                              <td className="py-2 px-3 text-right font-semibold text-purple-700 dark:text-purple-400">
                                <div>
                                  {Math.round(teacherActualStats.totalPayment).toLocaleString("fr-FR")} CFA
                                </div>
                                <div className="text-[11px] font-normal text-gray-500">
                                  {teacherActualStats.totalSessions} s.
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-gray-100 dark:bg-gray-900 font-bold text-gray-900 dark:text-white border-t-2 border-gray-300 dark:border-gray-700">
                        <tr>
                          <td className="py-2.5 px-3">TOTAL ÉCOLE</td>
                          <td className="py-2.5 px-3 text-center">
                            {Math.round(schedulePayroll.totals.weeklyPayment).toLocaleString("fr-FR")} CFA
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400">
                            {Math.round(
                              schedulePayroll.totals.bySpecialMonth.october.payment
                            ).toLocaleString("fr-FR")}{" "}
                            CFA
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400">
                            {Math.round(
                              schedulePayroll.totals.bySpecialMonth.november.payment
                            ).toLocaleString("fr-FR")}{" "}
                            CFA
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400">
                            {Math.round(
                              schedulePayroll.totals.bySpecialMonth.december.payment
                            ).toLocaleString("fr-FR")}{" "}
                            CFA
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400">
                            {Math.round(
                              schedulePayroll.totals.bySpecialMonth.january.payment
                            ).toLocaleString("fr-FR")}{" "}
                            CFA
                          </td>
                          {hasSpecificMonth && (
                            <td className="py-2.5 px-3 text-right text-teal-800 dark:text-teal-300">
                              {Math.round(schedulePayroll.totals.calendarPayment).toLocaleString("fr-FR")}{" "}
                              CFA
                            </td>
                          )}
                          <td className="py-2.5 px-3 text-right text-purple-700 dark:text-purple-400">
                            {Math.round(calculateStats(filteredRecords).totalPayment).toLocaleString(
                              "fr-FR"
                            )}{" "}
                            CFA
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

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
                    const sessions = record.sessionCount !== undefined ? record.sessionCount : 1;
                    const computedHours = hoursFromSessions(sessions);
                    const rate = getRateForClass(record.class);
                    const displayAmount = computedHours * rate;
                    const isAbsent = record.sessionCount === 0;
                    const isLate = record.courseSummary?.toLowerCase().includes("retard");

                    return (
                      <Card
                        key={record.id}
                        className={`border-l-4 ${
                          isAbsent
                            ? "border-l-red-500 bg-red-50/30"
                            : isLate
                            ? "border-l-orange-500 bg-orange-50/30"
                            : "border-l-blue-500"
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
                              className="flex items-center gap-1 shrink-0 text-xs"
                            >
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
                                {calculateHours(record.startTime, record.endTime).toFixed(1)}h
                              </span>
                            </div>
                            <div className="text-xs sm:text-sm">
                              <span className="font-medium">{record.sessionCount}</span> séance(s)
                            </div>
                            <div className="text-xs sm:text-sm font-semibold text-green-600 dark:text-green-400">
                              {Math.round(displayAmount).toLocaleString("fr-FR")} CFA
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
