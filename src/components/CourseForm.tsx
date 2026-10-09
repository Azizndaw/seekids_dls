import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useSubjects } from "@/hooks/useSubjects";
import { useAllTeachers, useClasses } from "@/hooks/useUsers";
import { useAuth } from "@/hooks/useAuth";
import { useCreateCours, useUpdateCours } from "@/hooks/useCours";

const parseTime = (start: string, duration: string): string => {
  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(":");
    return `${hours}h ${minutes}`;
  };

  return `${formatTime(start)} - ${formatTime(duration)}`;
};
interface CourseFormProps {
  onBack: () => void;
  onSave: (courseData: any) => void;
  initialData?: any;
  selectedDay?: string;
}
const reverseParseTime = (timeRange: string): [string, string] => {
  const parseSingle = (time: string): string => {
    const [hours, minutes] = time
      .trim()
      .split("h")
      .map((part) => part.trim());
    return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
  };

  const [start, end] = timeRange.split("-").map(parseSingle);
  return [start, end];
};

const CourseForm = ({ onBack, onSave, initialData, selectedDay }: CourseFormProps) => {
  let startTime = "";
  let endTime = "";
  if (initialData) {
    const timeRange = `${initialData.startTime.trim()} - ${initialData.endTime.trim()}`;
    console.log("TimeRange", timeRange);
    [startTime, endTime] = reverseParseTime(timeRange);
  }
  const [formData, setFormData] = useState({
    subject: initialData?.subjectId || "",
    class: initialData?.classeId || "",
    teacher: initialData?.teacherId || "",
    day: /* selectedDay || */ initialData?.day || "",
    startTime,
    endTime,
  });
  const coursMutation = useCreateCours();
  const coursUpdateMutation = useUpdateCours();

  const { authUser } = useAuth();

  const { data: untypedSubjects } = useSubjects();
  const { data: untypedClasses } = useClasses();
  const { data: untypedteachers } = useAllTeachers(authUser);

  const subjects: { name: string; id: string }[] = untypedSubjects;
  const classes: any[] = untypedClasses;
  const teachers: any = untypedteachers;

  if (!subjects || !classes || !teachers) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const weekDays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Là, on est entrain de modifier
    if (initialData) {
      const courseToUpdate = {
        jour: formData.day,
        heure: parseTime(formData.startTime, formData.endTime),
        disciplineId: formData.subject,
        professeurId: formData.teacher,
        classeId: formData.class,
      };
      await coursUpdateMutation.mutateAsync({
        coursId: initialData.id,
        data: courseToUpdate,
      });
      onSave(formData);

      return;
    }

    const courseToCreate = {
      jour: formData.day,
      heure: parseTime(formData.startTime, formData.endTime),
      disciplineId: formData.subject,
      professeurId: formData.teacher,
      classeId: formData.class,
    };

    await coursMutation.mutateAsync(courseToCreate);
    onSave(formData);
  };
  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background dark:bg-background p-3 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour au Planning
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {initialData ? "Modifier le Cours" : "Nouveau Cours"}
            </h1>
            <p className="text-muted-foreground">
              {initialData
                ? "Modifiez les informations du cours"
                : "Créez un nouveau cours dans le planning"}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informations du Cours</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="subject">Matière</Label>
                  <Select
                    value={formData.subject}
                    onValueChange={(value) => handleInputChange("subject", value)}>
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

                <div>
                  <Label htmlFor="class">Classe</Label>
                  <Select
                    value={formData.class}
                    onValueChange={(value) => handleInputChange("class", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une classe" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={`classe-${cls.id}`} value={cls.id}>
                          {`${cls.niveau} - ${cls.nom}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="teacher">Professeur</Label>
                  <Select
                    value={formData.teacher}
                    onValueChange={(value) => handleInputChange("teacher", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un professeur" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {`Pr. ${teacher.prenom} ${teacher.nom}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="day">Jour</Label>
                  <Select
                    value={formData.day}
                    onValueChange={(value) => handleInputChange("day", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un jour" />
                    </SelectTrigger>
                    <SelectContent>
                      {weekDays.map((day) => (
                        <SelectItem key={day} value={day}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="startTime">Heure de début</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => handleInputChange("startTime", e.target.value)}
                    className="w-full"
                  />
                </div>

                <div>
                  <Label htmlFor="endTime">Heure de fin</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => handleInputChange("endTime", e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  {initialData ? "Modifier le Cours" : "Créer le Cours"}
                </Button>
                <Button type="button" variant="outline" onClick={onBack}>
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CourseForm;
