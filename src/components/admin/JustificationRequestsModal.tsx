import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, CalendarDays, CheckCircle, XCircle } from "lucide-react";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useStudents } from "@/hooks/useUsers";
import { useDeleteStudentAttendance } from "@/hooks/useStudents";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";

export const JustificationRequestsModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { useGetSchool } = useSchoolData();
  const { data: school } = useGetSchool();
  const { toast } = useToast();
  const deleteAttendanceMutation = useDeleteStudentAttendance();

  // In a real app we should have a specific endpoint for this.
  // Here we will iterate over classes -> students -> attendance to find justifications.
  // This is expensive but fits the current data model limitations.
  const { data: classesData } = useStudents();

  // Flatten data to find justifications
  const { futureAbsences, pastAbsences } = React.useMemo(() => {
    console.log("struu", classesData);

    if (!classesData) return { futureAbsences: [], pastAbsences: [] };

    const future = [];
    const past = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    classesData.forEach((student) => {
      if (student.attendances?.length) {
        student.attendances.forEach((att) => {
          if (att.reason?.trim()) {
            const attDate = new Date(att.date);

            const item = {
              ...att,
              studentName: `${student.prenom} ${student.nom}`,
              className: student.classe?.nom,
              studentId: student.id,
            };

            if (attDate > today) {
              future.push(item);
            } else {
              past.push(item);
            }
          }
        });
      }
    });
    return { futureAbsences: future, pastAbsences: past };
  }, [classesData]);

  const handleValidate = async (attendanceId) => {
    try {
      await deleteAttendanceMutation.mutateAsync(attendanceId);
      toast({ title: "Justification acceptée", description: "L'absence a été supprimée." });
    } catch (e) {
      toast({ title: "Erreur", description: "Impossible de valider.", variant: "destructive" });
    }
  };

  const renderList = (list, title, emptyMessage, isFuture = false) => (
    <div className="flex-1 min-w-[300px]">
      <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
        {title}
        <Badge variant="secondary">{list.length}</Badge>
      </h3>
      <div className="space-y-3">
        {list.length === 0 ? (
          <div className="text-gray-500 text-sm py-4 italic border-l-2 border-gray-200 pl-3">
            {emptyMessage}
          </div>
        ) : (
          list.map((item) => (
            <Card
              key={item.id}
              className={`border-l-4 ${isFuture ? "border-l-blue-500 bg-blue-50/20" : "border-l-orange-500 bg-orange-50/20"}`}>
              <CardContent className="p-3">
                <div className="flex flex-col gap-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm">{item.studentName}</span>
                      <Badge variant="outline" className="text-[10px] h-5">
                        {item.className}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <CalendarDays className="w-3 h-3" />
                      {new Date(item.date).toLocaleDateString()}
                      {item.course && <span>• {item.course}</span>}
                    </div>
                    <div className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-100 dark:border-gray-700 text-xs italic text-gray-600 dark:text-gray-300">
                      "{item.reason}"
                    </div>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <Button
                      size="sm"
                      className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleValidate(item.id)}>
                      <CheckCircle className="w-3 h-3 mr-1" /> Valider
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1 h-8 text-xs text-red-600 hover:bg-red-50"
                      onClick={() =>
                        (document.location.href = `mailto:?subject=Refus de justification&body=Votre justification pour l'absence du ${item.date} a été refusée.`)
                      }>
                      <XCircle className="w-3 h-3 mr-1" /> Refuser
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="h-auto p-4 flex flex-col items-center space-y-2 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white transition-all duration-200">
          <div className="relative">
            <MessageSquare className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            {futureAbsences.length + pastAbsences.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {futureAbsences.length + pastAbsences.length}
              </span>
            )}
          </div>
          <div className="text-center">
            <div className="font-medium text-sm">Justifications</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
              Gérer les absences
            </div>
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Gestion des Justifications & Signalements</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4">
          <div className="flex flex-col md:flex-row gap-6 py-4">
            {renderList(
              futureAbsences,
              "Absences Signalées (Futures)",
              "Aucun signalement d'absence future.",
              true,
            )}
            <div className="hidden md:block w-px bg-gray-200 dark:bg-gray-700 self-stretch"></div>
            {renderList(
              pastAbsences,
              "Justifications (Passées)",
              "Aucune demande de justification pour des absences passées.",
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
