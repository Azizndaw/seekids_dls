import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Clock } from "lucide-react";

interface Absence {
  id: number;
  date: string;
  discipline: {
    id: string;
    name: string;
  };
  // period: string;
  // justified: boolean;
  reason?: string;
  //justification?: string | null;
}

interface AbsencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  absences: Absence[];
  classId?: string; // Added classId
}

import { useGetCoursByClasse } from "@/hooks/useCours";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useJustifyAttendance, useReportParentAbsence } from "@/hooks/useStudents";
import { useState } from "react";
import { FileText, CheckCircle, PlusCircle } from "lucide-react";
import { Input } from "@/components/ui/input"; // Assuming Input exists
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AbsencesModal = ({ isOpen, onClose, absences, studentId, classId }: AbsencesModalProps) => {
  const justifyMutation = useJustifyAttendance();
  const reportMutation = useReportParentAbsence(); // New hook
  const getDayFromDate = (dateString: string) => {
    return new Date(`${dateString}T00:00:00Z`)
      .toLocaleDateString("fr-FR", {
        weekday: "long",
        timeZone: "UTC",
      })
      .toLowerCase(); // samedi, lundi, etc.
  };
  // State for Report Dialog
  const [reportDialog, setReportDialog] = useState({
    isOpen: false,
    date: new Date().toISOString().slice(0, 10),
    type: "ABSCENCE",
    justification: "",
    disciplineId: "",
  });

  const selectedDay = React.useMemo(() => {
    return getDayFromDate(reportDialog.date);
  }, [reportDialog.date]);

  const { data: courses } = useGetCoursByClasse(classId || "");

  const disciplines = React.useMemo(() => {
    if (!courses) return [];
    const filteredCourses = courses.filter((course) => course.jour?.toLowerCase() === selectedDay);
    const unique = new Map();
    filteredCourses.forEach((c) => {
      if (!unique.has(c.disciplineId)) {
        unique.set(c.disciplineId, { id: c.disciplineId, name: c.discipline.name });
      }
    });
    return Array.from(unique.values());
  }, [courses, selectedDay]);

  const handleReport = async () => {
    if (!reportDialog.date || !reportDialog.justification) return;

    // Assuming we have studentId available or we pass it.
    // AbsencesModal props currently don't have studentId, only absences list.
    // I need to fetch studentId from absences[0]?.studentId (if exists) or pass it as prop.
    // Looking at `Absence` interface, it doesn't show studentId.
    // I should update AbsencesModal to receive studentId.

    // WORKAROUND: For now, I'll log a warning if missing, but typically the parent view knows the child ID.
    // I will update the component signature in next chunk to accept `studentId`.
  };
  const [justificationDialog, setJustificationDialog] = useState<{
    isOpen: boolean;
    absenceId: number | null;
    text: string;
  }>({
    isOpen: false,
    absenceId: null,
    text: "",
  });

  const handleOpenJustify = (absenceId: number) => {
    setJustificationDialog({
      isOpen: true,
      absenceId,
      text: "",
    });
  };

  const handleSubmitJustification = async () => {
    if (!justificationDialog.absenceId || !justificationDialog.text.trim()) return;

    await justifyMutation.mutateAsync({
      studentId,
      attendanceId: justificationDialog.absenceId.toString(),
      justification: justificationDialog.text,
    });

    setJustificationDialog({ isOpen: false, absenceId: null, text: "" });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <DialogHeader className="flex flex-row items-center justify-between pr-8">
            <DialogTitle className="flex items-center space-x-2 text-gray-900 dark:text-white">
              <Calendar className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <span>Détails des absences</span>
            </DialogTitle>
            <Button
              size="sm"
              onClick={() => setReportDialog({ ...reportDialog, isOpen: true })}
              className="bg-orange-600 hover:bg-orange-700 text-white gap-2">
              <PlusCircle className="w-4 h-4" /> Signaler une absence
            </Button>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {absences.map((absence) => {
              const isJustified = absence.reason?.trim().length <= 0;

              return (
                <div
                  key={absence.id}
                  className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-gray-900 dark:text-white">{absence.date}</div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenJustify(absence.id)}
                      disabled={isJustified}
                      className={
                        isJustified
                          ? "text-green-600 border-green-200 hover:bg-green-50"
                          : "text-orange-600 border-orange-200 hover:bg-orange-50"
                      }>
                      {isJustified ? "Absence justifiée" : "Justifier"}
                    </Button>
                  </div>

                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">Matière:</span>
                      <span>{absence.discipline.name}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>{absence.date}</span>
                    </div>

                    {isJustified && (
                      <div className="mt-2 text-xs bg-white dark:bg-gray-800 p-2 rounded border border-gray-100 dark:border-gray-600">
                        <span className="font-semibold block mb-1">Motif :</span>
                        {absence.reason}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {absences.length === 0 && (
              <div className="text-center py-8 text-gray-500">Aucune absence enregistrée.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={justificationDialog.isOpen}
        onOpenChange={(open) =>
          !open && setJustificationDialog((prev) => ({ ...prev, isOpen: false }))
        }>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Justifier l'absence</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Motif de l'absence</Label>
              <Textarea
                placeholder="Ex: Maladie, Rendez-vous médical..."
                value={justificationDialog.text}
                onChange={(e) =>
                  setJustificationDialog((prev) => ({ ...prev, text: e.target.value }))
                }
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setJustificationDialog((prev) => ({ ...prev, isOpen: false }))}>
                Annuler
              </Button>
              <Button
                onClick={handleSubmitJustification}
                className="bg-orange-600 hover:bg-orange-700 text-white"
                disabled={justificationDialog.text.trim().length < 1}>
                Envoyer le justificatif
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* REPORT DIALOG */}
      <Dialog
        open={reportDialog.isOpen}
        onOpenChange={(open) => !open && setReportDialog({ ...reportDialog, isOpen: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Signaler une absence à venir</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={reportDialog.date}
                onChange={(e) => setReportDialog({ ...reportDialog, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={reportDialog.type}
                onValueChange={(val) => setReportDialog({ ...reportDialog, type: val as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ABSCENCE">Absence</SelectItem>
                  <SelectItem value="RETARD">Retard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Matière (Cours concerné)</Label>
              <Select
                value={reportDialog.disciplineId}
                onValueChange={(val) => setReportDialog({ ...reportDialog, disciplineId: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une matière" />
                </SelectTrigger>
                <SelectContent>
                  {disciplines.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Motif (Rendez-vous médical, etc.)</Label>
              <Textarea
                value={reportDialog.justification}
                onChange={(e) =>
                  setReportDialog({ ...reportDialog, justification: e.target.value })
                }
              />
            </div>
            <Button
              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              onClick={async () => {
                console.log("HOLA : ", reportDialog.date);
                // await reportMutation.mutateAsync({
                //   studentId: studentId,
                //   date: new Date(reportDialog.date),
                //   type: reportDialog.type as any,
                //   justification: reportDialog.justification,
                //   disciplineId: reportDialog.disciplineId,
                // });
                setReportDialog({ ...reportDialog, isOpen: false, justification: "" });
              }}
              // disabled={
              //   !reportDialog.date || !reportDialog.justification || !reportDialog.disciplineId
              // }
            >
              Envoyer le signalement
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AbsencesModal;
