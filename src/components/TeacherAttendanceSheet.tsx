import React, { useContext, useState, useMemo } from "react";
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
import { ClipboardCheck, Calendar, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
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
  subjects: { id: string; name: string }[];
  classes: { id: string; niveau: string; nom?: string }[];
}

const TeacherAttendanceSheet = ({ subjects, classes }: TeacherAttendanceSheetProps) => {
  const { toast } = useToast();
  const { socket } = useContext(SocketContext);
  const { authUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const { data: courses = [] } = useGetCoursByProfesseur();
  // Fetch existing attendance records to check for duplicates
  const { data: existingEmargements = [] } = useEmargementsByProfessor(authUser?.schoolId || "", authUser?.id || "");

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
  const createAttendanceMutation = useCreateEmargement();

  // --- Helper: Get Scheduled Slots for Selected Date/Class/Subject ---
  const scheduledSlots = useMemo(() => {
    if (!formData.date || !formData.class || !formData.subject) return [];

    const dayName = format(new Date(formData.date), "EEEE", { locale: fr });
    const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);

    const dayCourses = courses.filter(
      (c) =>
        c.jour === capitalizedDay &&
        c.classeId === formData.class &&
        c.disciplineId === formData.subject
    );

    const emargementsForDay = existingEmargements.filter(e => {
      return e.debut.startsWith(formData.date) &&
        e.classeId === formData.class &&
        e.disciplineId === formData.subject;
    });

    return dayCourses.map((c) => {
      // Parse time format "08h - 10h" or "08:00" or similar

      // Helper to parse time strings like "14:00", "14h30", "1400", "8"
      const parseTimePart = (t: string) => {
        let clean = t.toLowerCase().replace("h", ":");
        let h = 0, m = 0;

        if (clean.includes(":")) {
          const parts = clean.split(":");
          h = parseInt(parts[0]);
          m = parseInt(parts[1]) || 0;
        } else {
          // No separator: check if it's like "1400" or just "14"
          const val = parseInt(clean);
          if (val >= 24) { // likely HHMM format like 1400
            h = Math.floor(val / 100);
            m = val % 100;
          } else {
            h = val;
            m = 0;
          }
        }
        return { h, m };
      };

      let cleanHeure = c.heure.replace(/\s/g, "");
      let startH = 0, startM = 0;
      let endH = 0, endM = 0;

      if (cleanHeure.includes("-")) {
        const [startStr, endStr] = cleanHeure.split("-");
        const start = parseTimePart(startStr);
        const end = parseTimePart(endStr);
        startH = start.h; startM = start.m;
        endH = end.h; endM = end.m;
      } else {
        const start = parseTimePart(cleanHeure);
        startH = start.h; startM = start.m;
        endH = startH + 1; // Default duration 1h
        endM = startM;
      }

      const formatTime = (h: number, m: number) =>
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

      const slotStart = formatTime(startH, startM);
      const slotEnd = formatTime(endH, endM);

      const isTaken = emargementsForDay.some(e => {
        const eStart = e.debut.split("T")[1].substring(0, 5);
        return eStart >= slotStart && eStart < slotEnd;
      });

      return {
        startRaw: slotStart,
        endRaw: slotEnd,
        display: `${slotStart} - ${slotEnd}`,
        isTaken: isTaken
      };
    });
  }, [formData.date, formData.class, formData.subject, courses, existingEmargements]);


  const handleSubmit = async () => {
    if (!formData.subject || !formData.class || !formData.startTime || !formData.endTime) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    if (scheduledSlots.length === 0) {
      toast({
        title: "Planning non respecté",
        description: "Aucun cours n'est planifié pour cette classe et cette matière à cette date.",
        variant: "destructive",
      });
      return;
    }

    // --- Validation Logic ---
    const matchingSlot = scheduledSlots.find(slot => {
      // Relaxed check: user start time must be >= slot start AND user end time <= slot end
      return formData.startTime >= slot.startRaw && formData.endTime <= slot.endRaw && formData.startTime < formData.endTime;
    });

    if (!matchingSlot) {
      toast({
        title: "Horaire invalide",
        description: `Votre émargement (${formData.startTime} - ${formData.endTime}) ne correspond pas à vos horaires planifiés.`,
        variant: "destructive",
      });
      return;
    }

    if (matchingSlot.isTaken) {
      toast({
        title: "Déjà émargé",
        description: `Un émargement existe déjà pour le créneau ${matchingSlot.display}.`,
        variant: "destructive",
      });
      return;
    }

    // Double check against actual overlaps (in case multiple slots/day)
    const emargementsForDay = existingEmargements.filter(e =>
      e.debut.startsWith(formData.date) &&
      e.classeId === formData.class &&
      e.disciplineId === formData.subject
    );
    const isOverlapping = emargementsForDay.some(e => {
      const eStart = e.debut.split("T")[1].substring(0, 5);
      const eEnd = e.fin.split("T")[1].substring(0, 5);

      // Overlap logic: (StartA < EndB) and (EndA > StartB)
      return formData.startTime < eEnd && formData.endTime > eStart;
    });

    if (isOverlapping) {
      toast({
        title: "Chevauchement détecté",
        description: "Vous avez déjà émargé sur cette plage horaire.",
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
      title: "Émargement envoyé",
      description: "Votre feuille d'émargement a été transmise à l'administration",
    });

    // Envoyer une notification via Socket.IO
    if (socket) {
      const selectedClassObj = classes.find((c) => c.id === formData.class);
      const selectedSubjectObj = subjects.find((s) => s.id === formData.subject);

      const notificationPayload = {
        type: "attendance",
        message: `Nouvelle feuille d'émargement pour la classe ${selectedClassObj?.niveau || ""} ${selectedClassObj?.nom || ""} en ${selectedSubjectObj?.name || ""}`,
        urgent: true,
        date: new Date().toISOString(),
        recipients: ["admin"],
      };

      socket.emit("send_notification", notificationPayload);
    }

    // Reset form
    setFormData({
      subject: "",
      class: "",
      date: new Date().toISOString().split("T")[0],
      startTime: "",
      endTime: "",
      sessionCount: 1,
      courseSummary: "",
      notes: "",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="h-auto p-2 sm:p-3 lg:p-4 flex flex-col items-center space-y-1 sm:space-y-2 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white transition-all duration-200">
          <ClipboardCheck className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-gray-700 dark:text-gray-300" />
          <div className="text-center">
            <div className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white">
              Émargement
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
              Remplir la feuille de cours
            </div>
          </div>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5" />
            Feuille d'Émargement
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations de base */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Informations du Cours
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  {/* Info message about schedule */}
                  {formData.date && (
                    <div className="text-xs text-muted-foreground mt-8 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Jour : {format(new Date(formData.date), "EEEE d MMMM", { locale: fr })}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="class">Classe *</Label>
                  <Select
                    value={formData.class}
                    onValueChange={(value) => setFormData({ ...formData, class: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une classe" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((classe) => (
                        <SelectItem key={classe.id} value={classe.id}>
                          {classe.niveau} {classe.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="subject">Matière *</Label>
                  <Select
                    value={formData.subject}
                    onValueChange={(value) => setFormData({ ...formData, subject: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une matière" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* SHOW SCHEDULED SLOTS IF AVAILABLE */}
              {formData.class && formData.subject && (
                <div className="my-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-100 dark:border-blue-800">
                  <Label className="text-blue-700 dark:text-blue-300 text-xs font-semibold uppercase">Horaires planifiés pour ce jour :</Label>
                  {scheduledSlots.length > 0 ? (
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {scheduledSlots.map((slot, idx) => (
                        <div key={idx}
                          className={`px-2 py-1 rounded text-sm font-medium shadow-sm border flex items-center gap-2 ${slot.isTaken
                            ? "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500 border-gray-200"
                            : "bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-green-200"
                            }`}>
                          {slot.display}
                          {slot.isTaken && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                          {slot.isTaken && <span className="text-xs italic">(Émargé)</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-red-500 flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-4 h-4" />
                      Aucun cours planifié ce jour.
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Heure début (Réel) *</Label>
                  <Input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="endTime">Heure fin (Réel) *</Label>
                  <Input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Compteur de séances */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Séances
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="sessionCount">Nombre de séances *</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.sessionCount}
                  onChange={(e) =>
                    setFormData({ ...formData, sessionCount: parseInt(e.target.value) })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Résumé du cours */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Contenu du Cours
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="courseSummary">Résumé du cours</Label>
                <Textarea
                  placeholder="Décrivez brièvement le contenu du cours..."
                  value={formData.courseSummary}
                  onChange={(e) => setFormData({ ...formData, courseSummary: e.target.value })}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes supplémentaires</Label>
                <Textarea
                  placeholder="Remarques, incidents, points d'attention..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={scheduledSlots.length === 0}>Envoyer l'Émargement</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TeacherAttendanceSheet;
