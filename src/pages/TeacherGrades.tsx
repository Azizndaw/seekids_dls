import React, { useContext, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Save,
  Send,
  FileText,
  ClipboardList,
  Edit2,
  Search,
  Filter,
  Bell,
  Trash2,
  GraduationCap,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useGetCurrentTeacher, useClasses } from "@/hooks/useUsers";
import { useAuth } from "@/hooks/useAuth";
import {
  convertGrades,
  useCreateNote,
  useGetNotesByTeacherId,
  useUpdateNote,
} from "@/hooks/useNotes";
import {
  useCreateEvaluation,
  useDeleteEvaluation,
  useEvaluationsByTeacher,
  useUpdateEvaluation,
} from "@/hooks/use-evaluation";
import { useGetCoursByProfesseur } from "@/hooks/useCours";
import { SocketContext } from "@/socket/SocketContext";

type HomeworkEntry = {
  grade: number;
  appreciation?: string;
};

// Function to get fixed coefficient based on class name and subject/discipline name (from official Senegal matrix)
const getFixedCoefficient = (classNameStr: string, subjectNameStr: string): number => {
  if (!classNameStr || !subjectNameStr) return 2;

  const c = classNameStr.toLowerCase();
  const s = subjectNameStr.toLowerCase();

  const isFr = s.includes("français") || s.includes("francais") || s.includes("frç") || s.includes("frc");
  const isAng = s.includes("anglais") || s.includes("ang");
  const isMath = s.includes("math");
  const isHG = s.includes("histoire") || s.includes("géographie") || s.includes("geographie") || s.includes("hg");
  const isEC = s.includes("civique") || s.includes("religieuse") || s.includes("ec") || s.includes("ed.");
  const isSVT = s.includes("svt") || s.includes("vie");
  const isSP = s.includes("physique") || s.includes("chimie") || s.includes("sp") || s.includes("pc");
  const isArabe = s.includes("arabe");
  const isEsp = s.includes("espagnol") || s.includes("esp");
  const isEco = s.includes("économie") || s.includes("economie") || s.includes("eco");
  const isEPS = s.includes("eps") || s.includes("sport");
  const isPhilo = s.includes("philo");

  const is6e = c.includes("6e") || c.includes("6ème") || c.includes("6eme");
  const is5e = c.includes("5e") || c.includes("5ème") || c.includes("5eme");
  const is4e = c.includes("4e") || c.includes("4ème") || c.includes("4eme");
  const is3e = c.includes("3e") || c.includes("3ème") || c.includes("3eme");

  const is2ndS = (c.includes("2nd") || c.includes("2nde") || c.includes("seconde")) && (c.includes("s") || !c.includes("l"));
  const is2ndL = (c.includes("2nd") || c.includes("2nde") || c.includes("seconde")) && c.includes("l");

  const is1erS2 = (c.includes("1er") || c.includes("1ère") || c.includes("premiere")) && c.includes("s");
  const is1erL2 = (c.includes("1er") || c.includes("1ère") || c.includes("premiere")) && (c.includes("l2") || c.includes("l 2"));
  const is1erL1 = (c.includes("1er") || c.includes("1ère") || c.includes("premiere")) && (c.includes("l1") || c.includes("l'") || c.includes("l 1"));

  const isTS2 = (c.includes("tle") || c.includes("terminale") || c.includes("t ")) && c.includes("s");
  const isTL1 = (c.includes("tle") || c.includes("terminale") || c.includes("t ")) && (c.includes("l1") || c.includes("l'") || c.includes("l 1"));
  const isTL2 = (c.includes("tle") || c.includes("terminale") || c.includes("t ")) && (c.includes("l2") || c.includes("l 2"));

  if (is6e || is5e) {
    if (isFr) return 4;
    if (isAng) return 2;
    if (isMath) return 3;
    if (isHG) return 2;
    if (isEC) return 1;
    if (isSVT) return 2;
    if (isEPS) return 2;
    return 2;
  }

  if (is4e || is3e) {
    if (isFr) return 4;
    if (isAng) return 2;
    if (isMath) return 3;
    if (isHG) return 2;
    if (isEC) return 1;
    if (isSVT) return 2;
    if (isSP) return 2;
    if (isArabe) return 2;
    if (isEsp) return 2;
    if (isEPS) return 2;
    return 2;
  }

  if (is2ndS) {
    if (isFr) return 3;
    if (isAng) return 3;
    if (isMath) return 5;
    if (isHG) return 2;
    if (isSVT) return 5;
    if (isSP) return 5;
    if (isArabe) return 3;
    if (isEsp) return 3;
    if (isEco) return 2;
    if (isEPS) return 1;
    return 2;
  }

  if (is2ndL) {
    if (isFr) return 4;
    if (isAng) return 3;
    if (isMath) return 3;
    if (isHG) return 3;
    if (isSVT) return 2;
    if (isSP) return 2;
    if (isArabe) return 3;
    if (isEsp) return 3;
    if (isEco) return 2;
    if (isEPS) return 1;
    return 2;
  }

  if (is1erS2) {
    if (isFr) return 3;
    if (isAng) return 2;
    if (isMath) return 5;
    if (isHG) return 2;
    if (isSVT) return 6;
    if (isSP) return 6;
    if (isArabe) return 2;
    if (isEsp) return 2;
    if (isEco) return 2;
    if (isEPS) return 1;
    return 2;
  }

  if (is1erL2) {
    if (isFr) return 5;
    if (isAng) return 4;
    if (isMath) return 3;
    if (isHG) return 6;
    if (isSVT) return 2;
    if (isSP) return 2;
    if (isArabe) return 4;
    if (isEsp) return 4;
    if (isEco) return 2;
    if (isEPS) return 1;
    return 2;
  }

  if (is1erL1) {
    if (isFr) return 6;
    if (isAng) return 4;
    if (isMath) return 3;
    if (isHG) return 2;
    if (isArabe) return 4;
    if (isEsp) return 4;
    if (isEPS) return 1;
    return 2;
  }

  if (isTS2) {
    if (isPhilo) return 2;
    if (isFr) return 3;
    if (isAng) return 2;
    if (isMath) return 5;
    if (isHG) return 2;
    if (isSVT) return 6;
    if (isSP) return 6;
    if (isEPS) return 1;
    return 2;
  }

  if (isTL1) {
    if (isPhilo) return 4;
    if (isFr) return 6;
    if (isAng) return 4;
    if (isMath) return 2;
    if (isHG) return 2;
    if (isArabe) return 4;
    if (isEsp) return 4;
    if (isEPS) return 1;
    return 2;
  }

  if (isTL2) {
    if (isPhilo) return 6;
    if (isFr) return 5;
    if (isAng) return 4;
    if (isMath) return 2;
    if (isHG) return 6;
    if (isSVT) return 2;
    if (isSP) return 2;
    if (isArabe) return 4;
    if (isEsp) return 4;
    if (isEco) return 2;
    if (isEPS) return 1;
    return 2;
  }

  return 2;
};

/* ======================= BULLE ROUGE ERREUR ======================= */
const MissingFieldsBubble: React.FC = () => (
  <div
    id="missing-fields-error"
    className="hidden fixed top-4 left-1/2 -translate-x-1/2 z-[70] bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium"
  />
);

/* ======================= AJOUT: Confirmation visuelle ======================= */
const BigSendConfirmation: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const [context, setContext] = React.useState<"grades" | "evaluation" | null>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const btn = target?.closest("button");
      if (!btn) return;

      const txt = (btn.textContent || "").toLowerCase().trim();

      /* ==================== VALIDATION POUR NOTES ==================== */
      if (txt.includes("valider et envoyer")) {
        // Champs obligatoires
        const required = document.querySelectorAll(
          'input[placeholder*="Titre"], input[type="date"], input[placeholder*="Coef"]',
        );

        // Bulle rouge
        const bubble = document.getElementById("missing-fields-error") as HTMLDivElement | null;

        let missingLabel = "";
        for (const el of Array.from(required) as HTMLInputElement[]) {
          const val = el.value.trim();
          if (!val) {
            if (el.placeholder?.toLowerCase().includes("titre")) missingLabel = "Titre";
            else if (el.placeholder?.toLowerCase().includes("coef")) missingLabel = "Coefficient";
            else if (el.type === "date") missingLabel = "Date";
            break;
          }
        }

        // SI CHAMP MANQUANT ⇒ bulle rouge + blocage popup
        if (missingLabel) {
          if (bubble) {
            bubble.textContent = `Vous avez oublié de remplir le champ : ${missingLabel}`;
            bubble.classList.remove("hidden");
            setTimeout(() => bubble.classList.add("hidden"), 3500);
          }
          return;
        }

        // Tout est OK ⇒ cacher bulle
        if (bubble) bubble.classList.add("hidden");

        setContext("grades");
        setOpen(true);
      } else if (txt.includes("envoyer la notification")) {
        /* ==================== VALIDATION POUR ÉVALUATIONS ==================== */
        const titleInput = document.querySelector(
          'input[placeholder*="Contrôle"], input[placeholder*="composition"]',
        ) as HTMLInputElement | null;

        const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement | null;

        // valeurs propres
        const title = titleInput?.value.trim();
        const date = dateInput?.value.trim();

        // classe sélectionnée
        const cls = document
          .querySelector('[data-state="checked"], [data-state="open"]')
          ?.textContent?.trim();

        // si un manque -> bloquer
        if (!title || !date || !cls) {
          return;
        }

        setContext("evaluation");
        setOpen(true);
      }
    };

    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setOpen(false), 2200);
    return () => clearTimeout(t);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-16 px-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-hidden
      />

      <div
        role="status"
        aria-live="polite"
        className="relative w-full max-w-xl mx-auto rounded-2xl shadow-2xl bg-background border p-6 sm:p-8
                   animate-in fade-in-0 zoom-in-95 duration-200">
        <div className="flex items-start gap-4">
          <CheckCircle2 className="w-10 h-10 flex-shrink-0 text-green-600" />

          <div className="space-y-1">
            <h3 className="text-2xl font-bold">
              {context === "grades" ? "Notes envoyées ✅" : "Notification envoyée ✅"}
            </h3>

            <p className="text-muted-foreground">
              {context === "grades"
                ? "Les parents et l'administration seront notifiés. Merci."
                : "Les parents recevront l’information de l’évaluation. Elle est aussi visible dans l’historique."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
/* ===================== /AJOUT: Confirmation visuelle ====================== */

const TeacherGrades = () => {
  const navigate = useNavigate();
  const { authUser } = useAuth();
  const { socket } = useContext(SocketContext);
  const { data: currentTeacher, isLoading: teacherLoading } = useGetCurrentTeacher(authUser);
  const { data: currentCourses, isLoading: coursesLoading } = useGetCoursByProfesseur();
  const { data: allClasses, isLoading: classesLoading } = useClasses();
  const subjects = currentTeacher?.disciplines;

  const classes = React.useMemo(() => {
    if (!allClasses) return [];

    // Class IDs from scheduled courses
    const courseClassIds = currentCourses ? currentCourses.map((c: any) => c.classe?.id || c.classeId) : [];

    // Class IDs from direct teacher assignments
    const assignedClassIds = allClasses ? allClasses.filter((c: any) => c.professeurs?.some((p: any) => p.professeurId === authUser?.id)).map((c: any) => c.id) : [];

    const uniqueClassIds = Array.from(new Set([...courseClassIds, ...assignedClassIds].filter(Boolean)));
    return uniqueClassIds.map(id => {
      const cls = allClasses.find((c: any) => c.id === id);
      return cls ? { classeId: id, classe: cls } : null;
    }).filter(Boolean);
  }, [allClasses, currentCourses, authUser?.id]);

  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedClassObject, setSelectedClassObject] = useState(null);

  const [selectedSubject, setSelectedSubject] = useState<string>();
  const [students, setStudents] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGrade, setSelectedGrade] = useState(null);

  // État pour les prochaines évaluations
  const [evaluationTitle, setEvaluationTitle] = useState("");
  const [evaluationDate, setEvaluationDate] = useState("");
  const [evaluationClass, setEvaluationClass] = useState("");
  const [evaluationDescription, setEvaluationDescription] = useState("");
  const [evaluationId, setEvaluationId] = useState("");

  const createEvaluationMutation = useCreateEvaluation();
  const updateEvaluationMutation = useUpdateEvaluation();
  const deleteEvaluationMutation = useDeleteEvaluation();

  const { data: allEvaluations } = useEvaluationsByTeacher(authUser?.id);

  const createNoteMutation = useCreateNote();
  const updateNoteMutation = useUpdateNote();
  const { data: allGradesByTeacher } = useGetNotesByTeacherId(authUser?.id);
  const todayStr = new Date().toISOString().split("T")[0];

  // Notes info générales pour devoir
  const [formData, setHomeworkFormData] = useState({
    title: "Devoir 1",
    date: todayStr,
    coef: "2",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setHomeworkFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpdateGrade = async () => {
    if (!selectedGrade) return;
    await updateNoteMutation.mutateAsync({
      id: selectedGrade.id,
      data: {
        appreciation: selectedGrade.comment,
        classeId: selectedGrade.extraData.classeId,
        professeurId: selectedGrade.extraData.professeurId,
        studentId: selectedGrade.extraData.studentId,
        note: selectedGrade.grade,
        date: selectedGrade.data,
        coefficient: selectedGrade.coefficient,
        disciplineId: selectedGrade.extraData.disciplineId,
        type: selectedGrade.title,
        devoir: selectedGrade.type !== "Composition",
      },
    });
  };

  const [selectedSemester, setSelectedSemester] = useState<"Semestre 1" | "Semestre 2">("Semestre 1");

  // Historique des évaluations envoyées
  const [sentEvaluations, setSentEvaluations] = useState([]);
  const [editingEvaluation, setEditingEvaluation] = useState(null);

  const [homeworkData, setHomeworkData] = useState<{ [studentId: number]: HomeworkEntry }>({});
  const [compositionGrades, setCompositionGrades] = useState<{
    [studentId: number]: HomeworkEntry;
  }>({});

  const handleHomeworkChange = (studentId: number, field: keyof HomeworkEntry, value: string) => {
    setHomeworkData((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
      },
    }));
  };

  const handleCompositionGradeChange = (
    studentId: number,
    field: keyof HomeworkEntry,
    value: string,
  ) => {
    setCompositionGrades((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value },
    }));
  };

  const handleValidateGrades = async (type: "homework" | "composition") => {
    const coefficient: number = parseFloat(formData.coef.toString());
    const date = formData.date;
    const title = formData.title;
    const disciplineId = selectedSubject;
    const classeId = selectedClass;
    const devoir = type == "homework";

    try {
      if (type == "homework") {
        for (const [studentId, data] of Object.entries(homeworkData)) {
          await createNoteMutation.mutateAsync({
            coefficient,
            classeId,
            date,
            devoir,
            disciplineId,
            note: parseFloat(data.grade.toString()),
            studentId,
            type: title,
            appreciation: data.appreciation ?? null,
            professeurId: authUser.id,
            semester: selectedSemester,
          });
        }
      } else {
        for (const [studentId, data] of Object.entries(compositionGrades)) {
          await createNoteMutation.mutateAsync({
            coefficient,
            classeId,
            date,
            devoir,
            disciplineId,
            note: parseFloat(data.grade.toString()),
            studentId,
            type: title,
            appreciation: data.appreciation ?? null,
            professeurId: authUser.id,
            semester: selectedSemester,
          });
        }
      }

      // Envoyer une notification via Socket.IO seulement si tout s'est bien passé
      if (socket) {
        const selectedClassObj = classes.find((c) => c.classeId == selectedClass);
        const selectedSubjectObj = subjects.find((s) => s.id === selectedSubject);

        const notificationPayload = {
          type: "grades", // consistent type
          text: `Nouvelles notes ajoutées pour la classe ${selectedClassObj?.classe?.niveau || ""} ${selectedClassObj?.classe?.nom || ""} en ${selectedSubjectObj?.name || ""}`,
          urgent: false,
          date: new Date().toISOString(),
          recipients: ["admin"],
        };

        socket.emit("send_notification", notificationPayload);
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi des notes:", error);
      // Optional: Show specific error toast here if needed, usually mutation handles it
    }
  };

  const handleEditGrade = (grade) => {
    setSelectedGrade({ ...grade });
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 16) return "text-green-600";
    if (grade >= 12) return "text-orange-600";
    return "text-red-600";
  };

  const handleClassChange = (className: string) => {
    setHomeworkData({});
    setCompositionGrades({});
    if (className == "all") {
      setSelectedClass(className);
      return;
    }
    const foundClass = classes.find((c) => c.classeId === className);
    if (foundClass) {
      setSelectedClass(`${foundClass.classeId}`);
      setStudents(foundClass.classe.students);
    }
  };

  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubject(subjectId);
    setHomeworkData({});
    setCompositionGrades({});
  };

  const handleSendEvaluationNotification = async () => {
    await createEvaluationMutation.mutateAsync({
      classeId: evaluationClass,
      date: evaluationDate,
      title: evaluationTitle,
      professeurId: authUser?.id,
      description: evaluationDescription,
      disciplineId: selectedSubject,
      schoolId: authUser?.schoolId,
      type: "EXERCICE",
    });

    // Reset form
    setEvaluationTitle("");
    setEvaluationDate("");
    setEvaluationClass("");
    setEvaluationDescription("");

    // Notification Socket
    if (socket) {
      // Find class name for better message if possible, or just use ID if we don't have the object handy.
      // We can try to find it in classes list:
      const clsObj = classes.find((c) => c.classeId === evaluationClass);
      const clsAny = clsObj as any;
      const clsName = clsAny ? `${(clsAny.classe?.niveau || clsAny.classeNiveau || clsAny.classNiveau || "")} ${(clsAny.classe?.nom || clsAny.classeName || clsAny.className || "")}` : "une classe";
      const subObj = subjects.find((s) => s.id === selectedSubject);
      const subName = subObj ? subObj.name : "une matière";

      const notificationPayload = {
        type: "homework", // or specific 'evaluation' type if supported, fallback to homework/grades
        message: `Nouvelle évaluation programmée : "${evaluationTitle}" pour ${clsName} en ${subName} le ${evaluationDate}`,
        urgent: false,
        date: new Date().toISOString(),
        recipients: ["admin"],
      };
      socket.emit("send_notification", notificationPayload);
    }
  };

  const handleEditEvaluation = (evaluation) => {
    const formattedDate = new Date("2025-09-18T00:00:00.000Z").toISOString().split("T")[0];
    evaluation.date = formattedDate;
    setEditingEvaluation({ ...evaluation });
  };

  const handleSaveEvaluation = async () => {
    setSentEvaluations((prev) =>
      prev.map(async (evaluation) => {
        console.log("evaluation", evaluation);
        await updateEvaluationMutation.mutateAsync({
          id: editingEvaluation.id,
          title: editingEvaluation.title,
          date: editingEvaluation.date,
          description: editingEvaluation.description,
        });
      }),
    );

    setEditingEvaluation(null);
  };

  const handleDeleteEvaluation = async (id: string) => {
    await deleteEvaluationMutation.mutateAsync({
      evaluationId: id,
    });
  };
  useEffect(() => {
    if (allEvaluations) {
      setSentEvaluations(allEvaluations);
    }
  }, [allEvaluations]);

  useEffect(() => {
    if (allEvaluations) {
      setSentEvaluations(allEvaluations);
    }
  }, [allEvaluations]);

  useEffect(() => {
    if (subjects && subjects.length > 0 && !selectedSubject) {
      setSelectedSubject(subjects[0].id);
    }
  }, [subjects, selectedSubject]);

  useEffect(() => {
    if (classes?.length > 0) {
      const defaultClass = classes[0].classe;
      setSelectedClassObject(defaultClass);
    }
  }, [classes]);

  useEffect(() => {
    if (selectedClass && selectedSubject && classes && subjects) {
      const currentClassObj = classes.find((c) => c.classeId === selectedClass);
      const cAny = currentClassObj as any;
      const classNameStr = cAny
        ? `${(cAny.classe?.niveau || cAny.classeNiveau || cAny.classNiveau || "")} ${(cAny.classe?.nom || cAny.classeName || cAny.className || "")}`
        : "";
      const currentSubjectObj = subjects.find((s) => s.id === selectedSubject);
      const subjectNameStr = currentSubjectObj ? currentSubjectObj.name : "";

      const fixedCoef = getFixedCoefficient(classNameStr, subjectNameStr);

      setHomeworkFormData((prev) => ({
        ...prev,
        coef: fixedCoef.toString(),
        date: prev.date || todayStr,
        title: prev.title || "Devoir 1",
      }));
    }
  }, [selectedClass, selectedSubject, classes, subjects, todayStr]);

  if (teacherLoading || coursesLoading || classesLoading || !allGradesByTeacher || !allEvaluations) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }
  const grades = convertGrades(allGradesByTeacher);

  const filteredGrades = grades.filter((grade) => {
    const matchesClass =
      selectedClass === "all" || grade.extraData.classeId.toLowerCase().includes(selectedClass);
    const matchesSearch =
      grade.student.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grade.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesClass && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background p-3 sm:p-6">
      <BigSendConfirmation />
      <MissingFieldsBubble />
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate("/teacher-dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Notes et Évaluations</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Saisie et gestion des notes - Prof. {currentTeacher.prenom} {currentTeacher.nom}
            </p>
          </div>
        </div>

        {/* Subject Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              Sélection de la matière
            </CardTitle>
            <CardDescription>
              Choisissez la matière que vous enseignez pour cette session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedSubject} onValueChange={handleSubjectChange}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Sélectionner une matière" />
              </SelectTrigger>
              <SelectContent>
                {subjects?.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedSubject && (
          <div className="space-y-4">
            {/* Main Tabs */}
            <Tabs defaultValue="saisie" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3 h-auto p-1">
                <TabsTrigger
                  value="saisie"
                  className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-1 sm:px-3 py-2 text-xs sm:text-sm min-h-[50px] sm:min-h-[40px]">
                  <FileText className="w-4 h-4" />
                  <span className="text-center leading-tight">Saisie des Notes</span>
                </TabsTrigger>
                <TabsTrigger
                  value="gestion"
                  className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-1 sm:px-3 py-2 text-xs sm:text-sm min-h-[50px] sm:min-h-[40px]">
                  <ClipboardList className="w-4 h-4" />
                  <span className="text-center leading-tight">Gestion des Notes</span>
                </TabsTrigger>
                <TabsTrigger
                  value="evaluation"
                  className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-1 sm:px-3 py-2 text-xs sm:text-sm min-h-[50px] sm:min-h-[40px]">
                  <Bell className="w-4 h-4" />
                  <span className="text-center leading-tight">Prochains Devoirs</span>
                </TabsTrigger>
              </TabsList>

              {/* Saisie Tab */}
              <TabsContent value="saisie" className="space-y-4">
                {/* Class Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle>Sélection de la classe</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select value={selectedClass} onValueChange={handleClassChange}>
                      <SelectTrigger className="w-64">
                        <SelectValue placeholder="Choisir une classe" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cl) => {
                          const className = `${(cl.classe?.niveau || cl.classeNiveau || cl.classNiveau)} ${(cl.classe?.nom || cl.classeName || cl.className)}`;
                          return (
                            <SelectItem key={cl.classeId} value={cl.classeId}>
                              {className} - {cl.classe.students?.length} élèves
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {/* Grades Entry Tabs */}
                <Tabs defaultValue="homework" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="homework" className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Devoirs
                    </TabsTrigger>
                    <TabsTrigger value="composition" className="flex items-center gap-2">
                      <ClipboardList className="w-4 h-4" />
                      Compositions
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="homework" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Saisie des notes de devoirs</CardTitle>
                        <CardDescription>
                          Les notes seront automatiquement transmises à l'administration et aux
                          parents après validation
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* This div wraps all inputs and allows them to wrap on small screens */}
                          <div className="flex flex-wrap gap-4">
                            <Input
                              name="title"
                              placeholder="Titre du devoir (ex: Devoir 1)"
                              value={formData.title}
                              onChange={handleChange}
                              className="flex-1 min-w-[200px]"
                            />

                            <Input
                              name="date"
                              placeholder="Date"
                              type="date"
                              value={formData.date}
                              onChange={handleChange}
                              className="w-40 min-w-[150px]"
                            />

                            <Input
                              name="coef"
                              type="number"
                              placeholder="Coef."
                              value={formData.coef}
                              readOnly
                              title="Le coefficient est fixe selon le niveau et la matière"
                              className="w-24 min-w-[90px] bg-gray-100 font-semibold cursor-not-allowed text-center"
                            />

                            {/* Use a normal div instead of CardContent here — CardContent has fixed padding/margin */}
                            <div className="w-64 min-w-[200px]">
                              <Select
                                value={selectedSemester}
                                onValueChange={(val) => setSelectedSemester(val as "Semestre 1" | "Semestre 2")}>
                                <SelectTrigger className="w-full sm:w-48 bg-white border-2">
                                  <SelectValue placeholder="Sélectionner un semestre" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem key="Semestre 1" value="Semestre 1">
                                    Semestre 1
                                  </SelectItem>
                                  <SelectItem key="Semestre 2" value="Semestre 2">
                                    Semestre 2
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Élève</TableHead>
                                <TableHead>Note /20</TableHead>
                                <TableHead>Appréciation</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {students.map((student) => (
                                <TableRow key={student.id}>
                                  <TableCell className="font-medium">
                                    {`${student.prenom} ${student.nom}`}
                                  </TableCell>

                                  {/* Grade input */}
                                  <TableCell>
                                    <Input
                                      type="number"
                                      placeholder="0"
                                      className="w-20"
                                      value={homeworkData[student.id]?.grade || ""}
                                      onChange={(e) =>
                                        handleHomeworkChange(student.id, "grade", e.target.value)
                                      }
                                    />
                                  </TableCell>

                                  {/* Appreciation input */}
                                  <TableCell>
                                    <Input
                                      placeholder="Appréciation..."
                                      className="w-full"
                                      value={homeworkData[student.id]?.appreciation || ""}
                                      onChange={(e) =>
                                        handleHomeworkChange(
                                          student.id,
                                          "appreciation",
                                          e.target.value,
                                        )
                                      }
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>

                          <div className="flex gap-2 pt-4">
                            <Button onClick={() => handleValidateGrades("homework")}>
                              <Send className="w-4 h-4 mr-2" />
                              Valider et Envoyer
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="composition" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Saisie des notes de compositions</CardTitle>
                        <CardDescription>
                          Les notes seront automatiquement transmises à l'administration et aux
                          parents après validation
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex gap-4">
                            <Input
                              name="title"
                              placeholder="Titre de la composition"
                              value={formData.title}
                              onChange={handleChange}
                              className="flex-1 min-w-[200px]"
                            />
                            <Input
                              name="date"
                              placeholder="Date"
                              type="date"
                              value={formData.date}
                              onChange={handleChange}
                              className="w-40"
                            />
                            <Input
                              type="number"
                              name="coef"
                              placeholder="Coef."
                              value={formData.coef}
                              readOnly
                              title="Le coefficient est fixe selon le niveau et la matière"
                              className="w-24 bg-gray-100 font-semibold cursor-not-allowed text-center"
                            />
                          </div>
                          {/* Use a normal div instead of CardContent here — CardContent has fixed padding/margin */}
                          <div className="w-64 min-w-[200px]">
                            <Select
                              value={selectedSemester}
                              onValueChange={(val) => setSelectedSemester(val as "Semestre 1" | "Semestre 2")}>
                              <SelectTrigger className="w-full md:w-48 bg-white">
                                <SelectValue placeholder="Sélectionner un semestre" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem key="Semestre 1" value="Semestre 1">
                                  Semestre 1
                                </SelectItem>
                                <SelectItem key="Semestre 2" value="Semestre 2">
                                  Semestre 2
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Élève</TableHead>
                                <TableHead>Note /20</TableHead>
                                <TableHead>Appréciation</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {students.map((student) => (
                                <TableRow key={student.id}>
                                  <TableCell className="font-medium">{`${student.prenom} ${student.nom}`}</TableCell>

                                  {/* Grade input */}
                                  <TableCell>
                                    <Input
                                      type="number"
                                      placeholder="0"
                                      className="w-20"
                                      value={compositionGrades[student.id]?.grade || ""}
                                      onChange={(e) =>
                                        handleCompositionGradeChange(
                                          student.id,
                                          "grade",
                                          e.target.value,
                                        )
                                      }
                                    />
                                  </TableCell>

                                  {/* Appreciation input */}
                                  <TableCell>
                                    <Input
                                      placeholder="Appréciation..."
                                      className="w-full"
                                      value={compositionGrades[student.id]?.appreciation || ""}
                                      onChange={(e) =>
                                        handleCompositionGradeChange(
                                          student.id,
                                          "appreciation",
                                          e.target.value,
                                        )
                                      }
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>

                          <div className="flex gap-2 pt-4">
                            <Button onClick={() => handleValidateGrades("composition")}>
                              <Send className="w-4 h-4 mr-2" />
                              Valider et Envoyer
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </TabsContent>

              {/* Prochaine Évaluation Tab */}
              <TabsContent value="evaluation" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="w-5 h-5" />
                      Prochain Devoir
                    </CardTitle>
                    <CardDescription>
                      Informez les parents des prochains devoirs programmés
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground mb-2 block">
                            Titre du devoir *
                          </label>
                          <Input
                            placeholder="Ex: Exercices Mathématiques Ch.4"
                            value={evaluationTitle}
                            onChange={(e) => setEvaluationTitle(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground mb-2 block">
                            Date du devoir *
                          </label>
                          <Input
                            type="date"
                            value={evaluationDate}
                            onChange={(e) => setEvaluationDate(e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-muted-foreground mb-2 block">
                          Classe concernée *
                        </label>
                        <Select value={evaluationClass} onValueChange={setEvaluationClass}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une classe" />
                          </SelectTrigger>
                          <SelectContent key={"1"}>
                            {classes.map((cls) => {
                              const className = `${(cls.classe?.niveau || cls.classeNiveau || cls.classNiveau)} ${(cls.classe?.nom || cls.classeName || cls.className)}`;
                              return (
                                <SelectItem key={cls.classeId} value={cls.classeId}>
                                  {className} - {cls.classe.students?.length} élèves
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-muted-foreground mb-2 block">
                          Description / Chapitres à réviser
                        </label>
                        <Input
                          placeholder="Ex: Chapitres 3 et 4 - Algèbre et géométrie"
                          value={evaluationDescription}
                          onChange={(e) => setEvaluationDescription(e.target.value)}
                        />
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button
                          onClick={handleSendEvaluationNotification}
                          disabled={!evaluationTitle || !evaluationDate || !evaluationClass}>
                          <Send className="w-4 h-4 mr-2" />
                          Envoyer la notification
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Historique des évaluations */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ClipboardList className="w-5 h-5" />
                      Historique des Devoirs Envoyés
                    </CardTitle>
                    <CardDescription>
                      Gérez les notifications d'évaluations déjà envoyées aux parents
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {sentEvaluations.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Aucun devoir envoyé pour le moment
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Titre</TableHead>
                              <TableHead>Date devoir</TableHead>
                              <TableHead>Classe</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Envoyé le</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sentEvaluations &&
                              sentEvaluations.map((evaluation) => (
                                <TableRow key={evaluation?.id}>
                                  <TableCell className="font-medium">{evaluation.title}</TableCell>
                                  <TableCell>
                                    {new Date(evaluation?.date).toLocaleDateString("fr-FR")}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">
                                      {evaluation?.classe?.niveau} {evaluation?.classe?.nom}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>{evaluation?.description}</TableCell>
                                  <TableCell>
                                    {new Date(evaluation?.createdAt).toLocaleDateString()}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-2">
                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEditEvaluation(evaluation)}>
                                            <Edit2 className="w-4 h-4 mr-1" />
                                            Modifier
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-md">
                                          <DialogHeader>
                                            <DialogTitle>Modifier le devoir</DialogTitle>
                                            <DialogDescription>
                                              Modification du devoir programmé
                                            </DialogDescription>
                                          </DialogHeader>
                                          {editingEvaluation && (
                                            <div className="space-y-4">
                                              <div>
                                                <label className="text-sm font-medium mb-2 block">
                                                  Titre
                                                </label>
                                                <Input
                                                  value={editingEvaluation.title}
                                                  onChange={(e) =>
                                                    setEditingEvaluation({
                                                      ...editingEvaluation,
                                                      title: e.target.value,
                                                    })
                                                  }
                                                />
                                              </div>
                                              <div>
                                                <label className="text-sm font-medium mb-2 block">
                                                  Date
                                                </label>
                                                <Input
                                                  type="date"
                                                  value={editingEvaluation.date}
                                                  onChange={(e) =>
                                                    setEditingEvaluation({
                                                      ...editingEvaluation,
                                                      date: e.target.value,
                                                    })
                                                  }
                                                />
                                              </div>
                                              <div>
                                                <label className="text-sm font-medium mb-2 block">
                                                  Description
                                                </label>
                                                <Input
                                                  value={editingEvaluation.description}
                                                  onChange={(e) =>
                                                    setEditingEvaluation({
                                                      ...editingEvaluation,
                                                      description: e.target.value,
                                                    })
                                                  }
                                                />
                                              </div>
                                              <div className="flex gap-2 pt-4">
                                                <Button
                                                  onClick={handleSaveEvaluation}
                                                  className="flex-1">
                                                  <Save className="w-4 h-4 mr-2" />
                                                  Sauvegarder
                                                </Button>
                                                <Button
                                                  variant="outline"
                                                  onClick={() => setEditingEvaluation(null)}
                                                  className="flex-1">
                                                  Annuler
                                                </Button>
                                              </div>
                                            </div>
                                          )}
                                        </DialogContent>
                                      </Dialog>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDeleteEvaluation(evaluation.id)}>
                                        <Trash2 className="w-4 h-4 mr-1" />
                                        Supprimer
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Gestion Tab */}
              <TabsContent value="gestion" className="space-y-4">
                {/* Filters */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Filter className="w-5 h-5" />
                      Filtres
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <label className="text-sm font-medium text-muted-foreground mb-2 block">
                          Rechercher un élève ou un devoir
                        </label>
                        <div className="relative">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Nom de l'élève ou titre du devoir..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div className="w-full sm:w-64">
                        <label className="text-sm font-medium text-muted-foreground mb-2 block">
                          Classe
                        </label>
                        <Select value={selectedClass} onValueChange={handleClassChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une classe" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Toutes les classes</SelectItem>
                            {classes.map((cls) => {
                              const className = `${(cls.classe?.niveau || cls.classeNiveau || cls.classNiveau)} ${(cls.classe?.nom || cls.classeName || cls.className)}`;
                              return (
                                <SelectItem key={cls.classeId} value={cls.classeId}>
                                  {className} - {cls.classe.students?.length} élèves
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Grades Management Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Notes saisies ({filteredGrades.length})</CardTitle>
                    <CardDescription>Cliquez sur "Modifier" pour éditer une note</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Élève</TableHead>
                            <TableHead>Classe</TableHead>
                            <TableHead>Devoir/Composition</TableHead>
                            <TableHead>Titre</TableHead>
                            <TableHead>Note</TableHead>
                            <TableHead>Coef.</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredGrades?.map((grade) => (
                            <TableRow key={grade.id}>
                              <TableCell className="font-medium">{grade.student}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{grade.class}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={grade.type === "Composition" ? "default" : "secondary"}>
                                  {grade.type}
                                </Badge>
                              </TableCell>
                              <TableCell>{grade.title}</TableCell>
                              <TableCell>
                                <span className={`font-bold ${getGradeColor(grade.grade)}`}>
                                  {grade.grade}/20
                                </span>
                              </TableCell>
                              <TableCell>{grade.coefficient}</TableCell>
                              <TableCell>
                                {new Date(grade.date).toLocaleDateString("fr-FR")}
                              </TableCell>
                              <TableCell>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEditGrade(grade)}>
                                      <Edit2 className="w-4 h-4 mr-1" />
                                      Modifier
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                      <DialogTitle>Modifier la note</DialogTitle>
                                      <DialogDescription>
                                        Modification de la note de {grade.student}
                                      </DialogDescription>
                                    </DialogHeader>
                                    {selectedGrade && (
                                      <div className="space-y-4">
                                        <div>
                                          <label className="text-sm font-medium mb-2 block">
                                            Note /20
                                          </label>
                                          <Input
                                            type="number"
                                            min="0"
                                            max="20"
                                            step="0.5"
                                            value={selectedGrade.grade}
                                            onChange={(e) =>
                                              setSelectedGrade({
                                                ...selectedGrade,
                                                grade: parseFloat(e.target.value),
                                              })
                                            }
                                          />
                                        </div>
                                        <div>
                                          <label className="text-sm font-medium mb-2 block">
                                            Coefficient
                                          </label>
                                          <Input
                                            type="number"
                                            min="1"
                                            max="5"
                                            value={selectedGrade.coefficient}
                                            onChange={(e) =>
                                              setSelectedGrade({
                                                ...selectedGrade,
                                                coefficient: parseInt(e.target.value),
                                              })
                                            }
                                          />
                                        </div>
                                        <div>
                                          <label className="text-sm font-medium mb-2 block">
                                            Appréciation
                                          </label>
                                          <Input
                                            value={selectedGrade.comment || ""}
                                            onChange={(e) =>
                                              setSelectedGrade({
                                                ...selectedGrade,
                                                comment: e.target.value,
                                              })
                                            }
                                          />
                                        </div>
                                        <div className="flex gap-2 pt-4">
                                          <DialogFooter>
                                            <Button
                                              variant="outline"
                                              onClick={() => {
                                                setSelectedGrade(null); // close the modal
                                              }}>
                                              Annuler
                                            </Button>
                                            <Button
                                              onClick={handleUpdateGrade}
                                              disabled={updateNoteMutation.isPending}>
                                              {updateNoteMutation.isPending ? (
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                              ) : (
                                                <Save className="w-4 h-4 mr-2" />
                                              )}
                                              Valider
                                            </Button>
                                          </DialogFooter>
                                        </div>
                                      </div>
                                    )}
                                  </DialogContent>
                                </Dialog>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {filteredGrades.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        Aucune note trouvée avec les critères sélectionnés
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherGrades;
