import React, { useContext, useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardCheck,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCreateEmargement, useEmargementsByProfessor } from "@/hooks/useEmargement";
import { SocketContext } from "@/socket/SocketContext";
import { useGetCoursByProfesseur } from "@/hooks/useCours";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";

interface AttendanceSheetData {
  subject: string;
  class: string;
  date: string;
  startTime: string;
  endTime: string;
  sessionCount: number;
  courseSummary: string;
  notes: string;
}

interface TeacherAttendanceSheetProps {
  subjects?: { id: string; name: string }[];
  classes: { id: string; niveau: string; nom?: string }[];
}

interface ParsedSlot {
  id: string;
  startRaw: string;
  endRaw: string;
  display: string;
  durationMinutes: number;
  calculatedSessions: number;
  disciplineId: string;
  disciplineName: string;
  isTaken: boolean;
}

const TeacherAttendanceSheet = ({ subjects = [], classes }: TeacherAttendanceSheetProps) => {
  const { toast } = useToast();
  const { socket } = useContext(SocketContext);
  const { authUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const { data: courses = [] } = useGetCoursByProfesseur();
  const { data: existingEmargements = [] } = useEmargementsByProfessor(
    authUser?.schoolId || "",
    authUser?.id || ""
  );

  const [formData, setFormData] = useState<AttendanceSheetData>({
    subject: "",
    class: "",
    date: new Date().toISOString().split("T")[0],
    startTime: "",
    endTime: "",
    sessionCount: 1,
    courseSummary: "",
    notes: "",
  });

  const [selectedSlotId, setSelectedSlotId] = useState<string>("");
  const createAttendanceMutation = useCreateEmargement();

  // Si aucune classe n'est sélectionnée, présélectionner la 1ère classe
  useEffect(() => {
    if (isOpen && !formData.class && classes && classes.length > 0) {
      setFormData((prev) => ({ ...prev, class: classes[0].id }));
    }
  }, [isOpen, classes, formData.class]);

  // Fonction utilitaire pour parser un créneau et calculer les séances
  const parseSlot = (c: any): Omit<ParsedSlot, "isTaken"> => {
    const parseTimePart = (t: string) => {
      const clean = t.toLowerCase().replace("h", ":").trim();
      let h = 0;
      let m = 0;
      if (clean.includes(":")) {
        const parts = clean.split(":");
        h = parseInt(parts[0], 10) || 0;
        m = parseInt(parts[1], 10) || 0;
      } else {
        const val = parseInt(clean, 10);
        if (val >= 24) {
          h = Math.floor(val / 100);
          m = val % 100;
        } else {
          h = val || 0;
          m = 0;
        }
      }
      return { h, m };
    };

    const cleanHeure = (c.heure || "").replace(/\s/g, "");
    let startH = 0;
    let startM = 0;
    let endH = 0;
    let endM = 0;

    if (cleanHeure.includes("-")) {
      const [startStr, endStr] = cleanHeure.split("-");
      const start = parseTimePart(startStr);
      const end = parseTimePart(endStr);
      startH = start.h;
      startM = start.m;
      endH = end.h;
      endM = end.m;
    } else {
      const start = parseTimePart(cleanHeure);
      startH = start.h;
      startM = start.m;
      endH = startH + 1;
      endM = startM;
    }

    const formatTime = (h: number, m: number) =>
      `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;

    const slotStart = formatTime(startH, startM);
    const slotEnd = formatTime(endH, endM);
    const durationMinutes = endH * 60 + endM - (startH * 60 + startM);

    // Calcul automatique et strict du nombre de séances selon la durée de cours :
    // - Moins de 60 min (ex: 40 min) -> 1 séance
    // - Entre 60 min et 120 min (ex: 1h30 / 90 min) -> 2 séances
    // - Entre 120 min et 180 min (ex: 2h20) -> 3 séances
    // - Au-delà (ex: 3h20 / 200 min) -> 4 séances
    let calculatedSessions = 1;
    if (durationMinutes > 175) {
      calculatedSessions = Math.round(durationMinutes / 50);
    } else if (durationMinutes > 115) {
      calculatedSessions = 3;
    } else if (durationMinutes > 55) {
      calculatedSessions = 2;
    } else {
      calculatedSessions = 1;
    }

    return {
      id: c.id,
      startRaw: slotStart,
      endRaw: slotEnd,
      display: `${slotStart} - ${slotEnd}`,
      durationMinutes,
      calculatedSessions,
      disciplineId: c.disciplineId,
      disciplineName: c.discipline?.name || c.disciplineName || "",
    };
  };

  // 2. Détection automatique des créneaux planifiés pour la date et la classe
  const scheduledSlots = useMemo<ParsedSlot[]>(() => {
    if (!formData.date || !formData.class || !courses) return [];

    const dayName = format(new Date(formData.date), "EEEE", { locale: fr });
    const norm = (s: string) =>
      (s || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
    const targetDay = norm(dayName);

    const dayCourses = courses.filter((c) => {
      const cDay = norm(c.jour);
      return (
        c.classeId === formData.class &&
        (cDay === targetDay || cDay.includes(targetDay) || targetDay.includes(cDay))
      );
    });

    const emargementsForDay = existingEmargements.filter(
      (e) => e.debut.startsWith(formData.date) && e.classeId === formData.class
    );

    return dayCourses.map((c) => {
      const parsed = parseSlot(c);
      const isTaken = emargementsForDay.some((e) => {
        const eStart = e.debut.split("T")[1]?.substring(0, 5) || "";
        return eStart >= parsed.startRaw && eStart < parsed.endRaw;
      });

      return {
        ...parsed,
        isTaken,
      };
    });
  }, [formData.date, formData.class, courses, existingEmargements]);

  // 3. Mise à jour automatique et fixation des heures, matière et séances
  useEffect(() => {
    if (scheduledSlots.length > 0) {
      // Trouver le créneau actif (soit celui sélectionné, soit le premier disponible non émargé)
      const activeSlot =
        scheduledSlots.find((s) => s.id === selectedSlotId) ||
        scheduledSlots.find((s) => !s.isTaken) ||
        scheduledSlots[0];

      if (activeSlot) {
        setSelectedSlotId(activeSlot.id);
        setFormData((prev) => ({
          ...prev,
          subject: activeSlot.disciplineId,
          startTime: activeSlot.startRaw,
          endTime: activeSlot.endRaw,
          sessionCount: activeSlot.calculatedSessions,
        }));
      }
    } else {
      setSelectedSlotId("");
      setFormData((prev) => ({
        ...prev,
        startTime: "",
        endTime: "",
        sessionCount: 1,
      }));
    }
  }, [scheduledSlots, selectedSlotId]);

  const activeSlot = useMemo(() => {
    return scheduledSlots.find((s) => s.id === selectedSlotId);
  }, [scheduledSlots, selectedSlotId]);

  const selectedDisciplineName = useMemo(() => {
    if (activeSlot?.disciplineName) return activeSlot.disciplineName;
    const match = subjects.find((s) => s.id === formData.subject);
    return match ? match.name : "";
  }, [activeSlot, subjects, formData.subject]);

  const handleSubmit = async () => {
    if (!formData.subject || !formData.class || !formData.startTime || !formData.endTime) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une classe avec un créneau valide.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.courseSummary.trim()) {
      toast({
        title: "Résumé requis",
        description: "Veuillez renseigner le résumé ou les notions abordées dans ce cours.",
        variant: "destructive",
      });
      return;
    }

    if (activeSlot?.isTaken) {
      toast({
        title: "Déjà émargé",
        description: `Un émargement existe déjà pour le créneau ${activeSlot.display}.`,
        variant: "destructive",
      });
      return;
    }

    setIsOpen(false);
    await createAttendanceMutation.mutateAsync({
      classeId: formData.class,
      disciplineId: formData.subject,
      debut: `${formData.date}T${formData.startTime}`,
      fin: `${formData.date}T${formData.endTime}`,
      seanceCounter: formData.sessionCount,
      content: formData.courseSummary,
      additionalInfo: formData.notes,
    });

    toast({
      title: "Émargement enregistré",
      description: `Feuille de cours validée : ${formData.sessionCount} séance(s) transmise(s) avec succès.`,
    });

    // Envoyer une notification via Socket.IO
    if (socket) {
      const selectedClassObj = classes.find((c) => c.id === formData.class);
      const notificationPayload = {
        type: "attendance",
        message: `Nouvel émargement automatique : ${selectedClassObj?.niveau || ""} ${selectedClassObj?.nom || ""} (${formData.startTime}-${formData.endTime}) en ${selectedDisciplineName}`,
        urgent: true,
        date: new Date().toISOString(),
        recipients: ["admin"],
      };

      socket.emit("send_notification", notificationPayload);
    }

    // Reset du contenu uniquement
    setFormData((prev) => ({
      ...prev,
      courseSummary: "",
      notes: "",
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="h-auto p-2 sm:p-3 lg:p-4 flex flex-col items-center space-y-1 sm:space-y-2 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white transition-all duration-200">
          <ClipboardCheck className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-primary" />
          <div className="text-center">
            <div className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white">
              Émargement
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
              Remplir la feuille de cours
            </div>
          </div>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <ClipboardCheck className="w-6 h-6 text-primary" />
            Feuille d'Émargement Automatique
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Étape 1 : Classe et Date */}
          <Card className="border border-blue-100 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center justify-between text-blue-900 dark:text-blue-200">
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  1. Sélection de la Classe & Date
                </span>
                <span className="text-xs font-normal text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Horaires automatiques
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date" className="font-medium text-xs uppercase text-gray-700 dark:text-gray-300">
                    Date du cours
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="mt-1 bg-white dark:bg-gray-800"
                  />
                  {formData.date && (
                    <p className="text-[11px] text-muted-foreground mt-1 capitalize">
                      📅 {format(new Date(formData.date), "EEEE d MMMM yyyy", { locale: fr })}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="class" className="font-medium text-xs uppercase text-gray-700 dark:text-gray-300">
                    Classe *
                  </Label>
                  <Select
                    value={formData.class}
                    onValueChange={(value) => setFormData({ ...formData, class: value })}>
                    <SelectTrigger id="class" className="mt-1 bg-white dark:bg-gray-800">
                      <SelectValue placeholder="Choisir votre classe" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((classe) => (
                        <SelectItem key={classe.id} value={classe.id}>
                          {classe.niveau} {classe.nom || ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Étape 2 : Créneau, Heures et Séances Fixes */}
          {scheduledSlots.length > 0 ? (
            <Card className="border-green-200 dark:border-green-800 bg-green-50/20 dark:bg-green-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center justify-between text-green-900 dark:text-green-200">
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-green-600" />
                    2. Horaires & Séances Fixes
                  </span>
                  <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 px-2 py-0.5 rounded-full flex items-center gap-1 font-normal">
                    <Lock className="w-3 h-3" /> Verrouillé selon planning
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Matière identifiée */}
                <div className="flex items-center gap-2 p-2.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Matière :</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {selectedDisciplineName || "Non spécifiée"}
                  </span>
                </div>

                {/* Si plusieurs créneaux le même jour pour cette classe */}
                {scheduledSlots.length > 1 && (
                  <div>
                    <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                      Plusieurs créneaux détectés ce jour. Choisissez le créneau :
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {scheduledSlots.map((slot) => (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => {
                            setSelectedSlotId(slot.id);
                            setFormData((prev) => ({
                              ...prev,
                              subject: slot.disciplineId,
                              startTime: slot.startRaw,
                              endTime: slot.endRaw,
                              sessionCount: slot.calculatedSessions,
                            }));
                          }}
                          className={`p-2 rounded-lg border text-left transition-all text-xs flex flex-col justify-between ${selectedSlotId === slot.id
                            ? "border-primary bg-primary/10 text-primary font-semibold ring-2 ring-primary/20"
                            : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                            } ${slot.isTaken ? "opacity-60 bg-gray-100" : ""}`}>
                          <div className="flex items-center justify-between">
                            <span>{slot.display}</span>
                            {slot.isTaken && <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />}
                          </div>
                          <span className="text-[10px] text-muted-foreground mt-1">
                            {slot.calculatedSessions} séance(s) {slot.isTaken ? "• Déjà émargé" : ""}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Affichage fixe des heures et du nombre de séances */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <span className="text-[11px] text-muted-foreground block font-medium">Heure Début</span>
                    <span className="text-base font-bold text-gray-900 dark:text-white font-mono">
                      {formData.startTime || "--:--"}
                    </span>
                  </div>

                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <span className="text-[11px] text-muted-foreground block font-medium">Heure Fin</span>
                    <span className="text-base font-bold text-gray-900 dark:text-white font-mono">
                      {formData.endTime || "--:--"}
                    </span>
                  </div>

                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-primary/30 bg-primary/5">
                    <span className="text-[11px] text-primary font-medium block">Nb de Séances</span>
                    <span className="text-base font-bold text-primary flex items-center gap-1">
                      {formData.sessionCount}{" "}
                      <span className="text-xs font-normal text-muted-foreground">séance(s)</span>
                    </span>
                  </div>
                </div>

                {activeSlot?.isTaken && (
                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>Ce créneau a déjà été émargé pour cette date.</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : formData.class ? (
            <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Aucun cours planifié
                </h4>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                  Vous n'avez pas de créneau planifié pour cette classe le{" "}
                  <strong className="capitalize">
                    {format(new Date(formData.date), "EEEE", { locale: fr })}
                  </strong>
                  . Veuillez vérifier la classe sélectionnée ou la date.
                </p>
              </div>
            </div>
          ) : null}

          {/* Étape 3 : Contenu du cours */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-primary" />
                3. Contenu Pédagogique
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="courseSummary" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Résumé du cours enseigné *
                </Label>
                <Textarea
                  id="courseSummary"
                  placeholder="Ex : Chapitre 3 - Suites arithmétiques, exercices 4 et 5 page 42..."
                  value={formData.courseSummary}
                  onChange={(e) => setFormData({ ...formData, courseSummary: e.target.value })}
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="notes" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Remarques / Observations (Facultatif)
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Ex : Bon travail de classe, 2 élèves en retard..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                scheduledSlots.length === 0 ||
                !formData.courseSummary.trim() ||
                activeSlot?.isTaken ||
                createAttendanceMutation.isPending
              }
              className="bg-primary hover:bg-primary/90 text-white font-semibold">
              {createAttendanceMutation.isPending ? "Transmission..." : "Envoyer l'Émargement"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TeacherAttendanceSheet;
