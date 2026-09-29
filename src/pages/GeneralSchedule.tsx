import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  Users,
  BookOpen,
  Plus,
  Edit,
  ArrowLeft,
  Filter,
  Share,
  Send,
  Save,
  Trash2,
  FileText,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import LogoutButton from "@/components/LogoutButton";
import CourseForm from "@/components/CourseForm";
import { toast } from "sonner";
import PlanningForm from "@/components/PlanningForm";
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  BorderStyle,
} from "docx";
import { transformCoursesToAdminSchedule, useDeleteCours, useGetAllCours } from "@/hooks/useCours";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useAllTeachers, useClasses } from "@/hooks/useUsers";
import { useAuth } from "@/hooks/useAuth";

const GeneralSchedule = () => {
  const navigate = useNavigate();
  const [selectedTeacherId, setSelectedTeacherId] = useState("all");
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [showPlanningForm, setShowPlanningForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [selectedDay, setSelectedDay] = useState("");
  const [editingPlanningItem, setEditingPlanningItem] = useState(null);

  const [selectedClassId, setSelectedClassId] = useState("all");
  const { authUser } = useAuth();
  // Mutations
  let { data: planning } = useGetAllCours();
  const { data: teachers } = useAllTeachers(authUser);
  const deleteCoursMutation = useDeleteCours();

  const { useGetSchool } = useSchoolData();
  const { data: school, isLoading, error } = useGetSchool();
  const { data: classes } = useClasses();

  const weekDays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

  const stats = [
    {
      title: "Classes Actives",
      value: school?._count.classes,
      icon: Users,
      color: "bg-blue-500",
    },
    {
      title: "Professeurs",
      value: school?._count.teachers,
      icon: BookOpen,
      color: "bg-green-500",
    },
  ];

  const filteredScheduleData = useMemo(() => {
    const filtered = {};

    if (!planning) return {};

    const scheduleData = transformCoursesToAdminSchedule(planning);

    Object.keys(scheduleData).forEach((day) => {
      const courses = scheduleData[day];
      if (Array.isArray(courses)) {
        let filteredCourses = courses;

        // Filter by class if not "all"
        if (selectedClassId !== "all") {
          filteredCourses = filteredCourses.filter((course) =>
            course.classeId.includes(selectedClassId)
          );
        }

        // Filter by teacher if not "all"
        if (selectedTeacherId !== "all") {
          filteredCourses = filteredCourses.filter(
            (course) => course.teacherId === selectedTeacherId
          );
        }

        if (filteredCourses.length > 0) {
          filtered[day] = filteredCourses;
        }
      }
    });
    return filtered;
  }, [planning, selectedClassId, selectedTeacherId]);

  if (isLoading || !(authUser && school && planning && classes && teachers)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }
  const selectedClass = classes.find((c) => c.id == selectedClassId);

  const getCourseColor = (subject: string) => {
    const colors: Record<string, string> = {
      Mathématiques: "bg-blue-200 text-blue-900",
      Physique: "bg-green-200 text-green-900",
      Chimie: "bg-red-200 text-red-900",
      SVT: "bg-teal-200 text-teal-900",
      Français: "bg-yellow-200 text-yellow-900",
      Anglais: "bg-orange-200 text-orange-900",
      Arabe: "bg-purple-200 text-purple-900",
      EPS: "bg-indigo-200 text-indigo-900",
      "Leadership et Développement Personnel": "bg-pink-200 text-pink-900",
      "Initiation à l'entrepreneuriat": "bg-lime-200 text-lime-900",
      "Education artistique": "bg-cyan-200 text-cyan-900",
      Economie: "bg-amber-200 text-amber-900",
      "Education religieuse": "bg-emerald-200 text-emerald-900",
      Histoire: "bg-orange-200 text-orange-900",
      Géographie: "bg-lime-200 text-lime-900",
      "Histoire-Géographie": "bg-yellow-200 text-yellow-900",
      "Education musicale": "bg-pink-200 text-pink-900",
      "Initiation à l'architecture": "bg-indigo-200 text-indigo-900",
      Espagnol: "bg-red-200 text-red-900",
      Philosophie: "bg-purple-200 text-purple-900",
      "Education Civique": "bg-blue-200 text-blue-900",
      "Physique-chimie": "bg-teal-200 text-teal-900",
      "Bibliothèque/devoirs/exercices": "bg-gray-200 text-gray-900",
    };

    return colors[subject] || "bg-gray-200 text-gray-900";
  };

  const handleNewCourse = () => {
    setEditingCourse(null);
    setSelectedDay("");
    setShowCourseForm(true);
  };

  const handleEditPlanningItem = (day: string, courseData: any) => {
    setEditingPlanningItem({ ...courseData, day });
    setShowCourseForm(true);
  };

  const handleDeletePlanningItem = async (courseId: string) => {
    await deleteCoursMutation.mutateAsync(courseId);
    toast.success("Cours supprimé avec succès");
  };

  const handleAddCourseToDay = (day: string) => {
    setSelectedDay(day);
    setEditingCourse(null);
    setShowCourseForm(true);
  };

  const handleSaveCourse = (courseData: any) => {
    console.log("Sauvegarde du cours:", courseData);
    setShowCourseForm(false);
    setEditingCourse(null);
    setEditingPlanningItem(null);
  };

  const handleBackToSchedule = () => {
    setShowCourseForm(false);
    setEditingCourse(null);
    setEditingPlanningItem(null);
  };

  const handleShareSchedule = () => {
    console.log("Partage du planning:", {
      selectedClassId,
      scheduleData: filteredScheduleData,
    });

    toast.success(
      selectedClassId === "all"
        ? "Planning partagé avec tous les professeurs et parents"
        : `Planning de ${selectedClass.niveau} partagé avec les professeurs et parents concernés`
    );
  };

  const handleExportToWord = async () => {
    try {
      const className = selectedClassId === "all" ? "Toutes les classes" : selectedClass.niveau;
      const weekText = "Semaine du 25 au 29 juin 2025";

      // Créer les en-têtes du tableau
      const headerRow = new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Jour", bold: true })] })],
            width: { size: 15, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [
              new Paragraph({ children: [new TextRun({ text: "Horaires", bold: true })] }),
            ],
            width: { size: 20, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Matière", bold: true })] })],
            width: { size: 20, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Classe", bold: true })] })],
            width: { size: 20, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [
              new Paragraph({ children: [new TextRun({ text: "Professeur", bold: true })] }),
            ],
            width: { size: 25, type: WidthType.PERCENTAGE },
          }),
        ],
      });

      // Créer les lignes pour chaque jour et cours
      const dataRows: TableRow[] = [];
      weekDays.forEach((day) => {
        const courses = filteredScheduleData[day] || [];
        if (Array.isArray(courses) && courses.length > 0) {
          courses.forEach((course) => {
            dataRows.push(
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: day })] })],
                    width: { size: 15, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: `${course.startTime} - ${course.endTime}` }),
                        ],
                      }),
                    ],
                    width: { size: 20, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({ children: [new TextRun({ text: course.subject })] }),
                    ],
                    width: { size: 20, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: course.class })] })],
                    width: { size: 20, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({ children: [new TextRun({ text: course.teacher })] }),
                    ],
                    width: { size: 25, type: WidthType.PERCENTAGE },
                  }),
                ],
              })
            );
          });
        }
      });

      // Créer le document Word
      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: `Planning Général - ${className}`, bold: true, size: 32 }),
                ],
                spacing: { after: 200 },
              }),
              new Paragraph({
                children: [new TextRun({ text: weekText, size: 24 })],
                spacing: { after: 400 },
              }),
              new Table({
                rows: [headerRow, ...dataRows],
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1 },
                  bottom: { style: BorderStyle.SINGLE, size: 1 },
                  left: { style: BorderStyle.SINGLE, size: 1 },
                  right: { style: BorderStyle.SINGLE, size: 1 },
                  insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
                  insideVertical: { style: BorderStyle.SINGLE, size: 1 },
                },
              }),
            ],
          },
        ],
      });

      // Générer et télécharger le fichier
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Planning_${className.replace(/ /g, "_")}_${
        new Date().toISOString().split("T")[0]
      }.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Planning exporté en Word pour ${className}`);
    } catch (error) {
      console.error("Erreur lors de l'export Word:", error);
      toast.error("Erreur lors de l'export du planning");
    }
  };

  if (showCourseForm) {
    return (
      <CourseForm
        onBack={handleBackToSchedule}
        onSave={handleSaveCourse}
        initialData={editingCourse || editingPlanningItem}
        selectedDay={selectedDay}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background dark:bg-background p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate("/admin-dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Planning Général</h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Gestion des emplois du temps
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button size="sm" className="w-full sm:w-auto" onClick={handleNewCourse}>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau Cours
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={handleShareSchedule}>
              <Share className="w-4 h-4 mr-2" />
              Partager Planning
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={handleExportToWord}>
              <FileText className="w-4 h-4 mr-2" />
              Exporter Word
            </Button>
            <LogoutButton className="w-full sm:w-auto" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <div className={`p-2 sm:p-3 rounded-full ${stat.color}`}>
                    <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtres
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Classe</label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les classes</SelectItem>
                    {classes.map((cl) => (
                      <SelectItem key={cl.id} value={cl.id}>
                        {cl.niveau} {cl.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Professeur</label>
                <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-background border-border">
                    <SelectItem value="all">Tous les professeurs</SelectItem>
                    {teachers.map((cl) => (
                      <SelectItem key={cl.id} value={cl.id}>
                        {cl.prenom} {cl.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl">
              Emploi du Temps
              {selectedClassId !== "all" && (
                <Badge variant="secondary" className="ml-2">
                  {`${selectedClass.niveau} ${selectedClass.nom}`}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              {selectedClassId === "all"
                ? "Planning hebdomadaire général"
                : `Planning filtré pour la classe ${selectedClass.niveau} ${selectedClass.nom}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                <div className="grid grid-cols-6 gap-2 mb-4">
                  {weekDays.map((day) => (
                    <div
                      key={day}
                      className="font-semibold text-center p-2 bg-muted rounded text-foreground">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-6 gap-2">
                  {weekDays.map((day) => (
                    <div key={day} className="border rounded p-2 min-h-[400px] bg-card">
                      <div className="space-y-2">
                        {filteredScheduleData[day] &&
                        Array.isArray(filteredScheduleData[day]) &&
                        filteredScheduleData[day].length > 0 ? (
                          filteredScheduleData[day].map((course: any, index: number) => (
                            <div
                              key={index}
                              className={`p-2 rounded text-xs ${getCourseColor(
                                course.subject
                              )} relative group border`}>
                              <div className="font-semibold">{course.subject}</div>
                              <div className="text-xs font-medium mt-1">
                                {course.startTime} - {course.endTime}
                              </div>
                              <div className="text-xs opacity-80 mt-1">{course.class}</div>
                              <div className="text-xs opacity-80">{course.teacher}</div>
                              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 w-5 p-0 bg-white/80 hover:bg-white"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditPlanningItem(day, course);
                                  }}>
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 w-5 p-0 bg-white/80 hover:bg-red-100 text-red-600"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletePlanningItem(course.id);
                                  }}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-muted-foreground text-xs py-4">
                            Aucun cours
                          </div>
                        )}
                        <div className="flex justify-center pt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 w-full"
                            onClick={() => handleAddCourseToDay(day)}>
                            <Plus className="w-4 h-4 mr-1" />
                            Ajouter
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <PlanningForm
          isOpen={showPlanningForm}
          onClose={() => setShowPlanningForm(false)}
          initialClass={selectedClassId !== "all" ? selectedClassId : undefined}
        />
      </div>
    </div>
  );
};

export default GeneralSchedule;
