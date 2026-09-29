import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArrowLeft, Edit2, Search, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface GradeEntry {
  id: number;
  student: string;
  class: string;
  subject: string;
  type: string; // e.g., "Devoir", "Contrôle", etc.
  title: string;
  grade: number; // sur 20 ?
  coefficient: number;
  date: string; // format ISO: "YYYY-MM-DD"
  comment?: string; // facultatif
}

const TeacherGradesManagement = () => {
  const navigate = useNavigate();
  const [selectedClass, setSelectedClass] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<GradeEntry>(null);

  const classes = [
    { id: "all", name: "Toutes les classes" },
    { id: "6eme-a", name: "6ème A" },
    { id: "5eme-b", name: "5ème B" },
    { id: "4eme-c", name: "4ème C" },
    { id: "3eme-d", name: "3ème D" },
    { id: "2nde-e", name: "2nde E" },
  ];

  const grades = [
    // 6ème A - Mathématiques
    {
      id: 1,
      student: "Dubois Emma",
      class: "6ème A",
      subject: "Mathématiques",
      type: "Devoir",
      title: "Algèbre Ch.3",
      grade: 16,
      coefficient: 2,
      date: "2024-01-15",
      comment: "Très bon travail",
    },
    {
      id: 2,
      student: "Martin Lucas",
      class: "6ème A",
      subject: "Mathématiques",
      type: "Composition",
      title: "Géométrie",
      grade: 12,
      coefficient: 3,
      date: "2024-01-20",
      comment: "Peut mieux faire",
    },
    {
      id: 3,
      student: "Leroy Julie",
      class: "6ème A",
      subject: "Mathématiques",
      type: "Devoir",
      title: "Nombres décimaux",
      grade: 15,
      coefficient: 1,
      date: "2024-01-10",
      comment: "Bonne compréhension",
    },
    {
      id: 4,
      student: "Moreau Pierre",
      class: "6ème A",
      subject: "Mathématiques",
      type: "Devoir",
      title: "Algèbre Ch.3",
      grade: 8,
      coefficient: 2,
      date: "2024-01-15",
      comment: "Difficultés à revoir",
    },
    {
      id: 5,
      student: "Roux Camille",
      class: "6ème A",
      subject: "Mathématiques",
      type: "Composition",
      title: "Géométrie",
      grade: 17,
      coefficient: 3,
      date: "2024-01-20",
      comment: "Excellent travail",
    },

    // 6ème A - Français
    {
      id: 6,
      student: "Dubois Emma",
      class: "6ème A",
      subject: "Français",
      type: "Devoir",
      title: "Dictée",
      grade: 14,
      coefficient: 1,
      date: "2024-01-12",
      comment: "Quelques fautes d'orthographe",
    },
    {
      id: 7,
      student: "Martin Lucas",
      class: "6ème A",
      subject: "Français",
      type: "Composition",
      title: "Rédaction",
      grade: 13,
      coefficient: 3,
      date: "2024-01-25",
      comment: "Idées intéressantes",
    },
    {
      id: 8,
      student: "Leroy Julie",
      class: "6ème A",
      subject: "Français",
      type: "Devoir",
      title: "Grammaire",
      grade: 18,
      coefficient: 2,
      date: "2024-01-18",
      comment: "Parfait",
    },
    {
      id: 9,
      student: "Moreau Pierre",
      class: "6ème A",
      subject: "Français",
      type: "Devoir",
      title: "Dictée",
      grade: 10,
      coefficient: 1,
      date: "2024-01-12",
      comment: "Progrès à faire",
    },
    {
      id: 10,
      student: "Roux Camille",
      class: "6ème A",
      subject: "Français",
      type: "Composition",
      title: "Rédaction",
      grade: 16,
      coefficient: 3,
      date: "2024-01-25",
      comment: "Très créatif",
    },

    // 5ème B - Mathématiques
    {
      id: 11,
      student: "Petit Sophie",
      class: "5ème B",
      subject: "Mathématiques",
      type: "Devoir",
      title: "Fractions",
      grade: 18,
      coefficient: 1,
      date: "2024-01-18",
      comment: "Excellent",
    },
    {
      id: 12,
      student: "Garnier Antoine",
      class: "5ème B",
      subject: "Mathématiques",
      type: "Composition",
      title: "Calcul littéral",
      grade: 14,
      coefficient: 3,
      date: "2024-01-22",
      comment: "Bon niveau",
    },
    {
      id: 13,
      student: "Bernard Lisa",
      class: "5ème B",
      subject: "Mathématiques",
      type: "Devoir",
      title: "Fractions",
      grade: 12,
      coefficient: 1,
      date: "2024-01-18",
      comment: "Assez bien",
    },
    {
      id: 14,
      student: "Fournier Max",
      class: "5ème B",
      subject: "Mathématiques",
      type: "Devoir",
      title: "Proportionnalité",
      grade: 16,
      coefficient: 2,
      date: "2024-01-20",
      comment: "Très bien",
    },
    {
      id: 15,
      student: "Simon Clara",
      class: "5ème B",
      subject: "Mathématiques",
      type: "Composition",
      title: "Calcul littéral",
      grade: 11,
      coefficient: 3,
      date: "2024-01-22",
      comment: "Peut mieux faire",
    },

    // 5ème B - Français
    {
      id: 16,
      student: "Petit Sophie",
      class: "5ème B",
      subject: "Français",
      type: "Devoir",
      title: "Analyse de texte",
      grade: 15,
      coefficient: 2,
      date: "2024-01-16",
      comment: "Bonne analyse",
    },
    {
      id: 17,
      student: "Garnier Antoine",
      class: "5ème B",
      subject: "Français",
      type: "Composition",
      title: "Dissertation",
      grade: 13,
      coefficient: 3,
      date: "2024-01-24",
      comment: "Arguments pertinents",
    },
    {
      id: 18,
      student: "Bernard Lisa",
      class: "5ème B",
      subject: "Français",
      type: "Devoir",
      title: "Conjugaison",
      grade: 17,
      coefficient: 1,
      date: "2024-01-14",
      comment: "Très bien maîtrisé",
    },
    {
      id: 19,
      student: "Fournier Max",
      class: "5ème B",
      subject: "Français",
      type: "Devoir",
      title: "Analyse de texte",
      grade: 12,
      coefficient: 2,
      date: "2024-01-16",
      comment: "Correct",
    },
    {
      id: 20,
      student: "Simon Clara",
      class: "5ème B",
      subject: "Français",
      type: "Composition",
      title: "Dissertation",
      grade: 14,
      coefficient: 3,
      date: "2024-01-24",
      comment: "Bien structuré",
    },

    // 4ème C - Mathématiques
    {
      id: 21,
      student: "Durand Thomas",
      class: "4ème C",
      subject: "Mathématiques",
      type: "Devoir",
      title: "Équations",
      grade: 14,
      coefficient: 2,
      date: "2024-01-22",
      comment: "Bien",
    },
    {
      id: 22,
      student: "Blanc Marie",
      class: "4ème C",
      subject: "Mathématiques",
      type: "Composition",
      title: "Théorème de Pythagore",
      grade: 16,
      coefficient: 3,
      date: "2024-01-26",
      comment: "Excellent travail",
    },
    {
      id: 23,
      student: "Fabre Nicolas",
      class: "4ème C",
      subject: "Mathématiques",
      type: "Devoir",
      title: "Équations",
      grade: 9,
      coefficient: 2,
      date: "2024-01-22",
      comment: "Difficultés importantes",
    },
    {
      id: 24,
      student: "Rousseau Léa",
      class: "4ème C",
      subject: "Mathématiques",
      type: "Devoir",
      title: "Calcul numérique",
      grade: 13,
      coefficient: 1,
      date: "2024-01-19",
      comment: "Satisfaisant",
    },
    {
      id: 25,
      student: "Vincent Hugo",
      class: "4ème C",
      subject: "Mathématiques",
      type: "Composition",
      title: "Théorème de Pythagore",
      grade: 15,
      coefficient: 3,
      date: "2024-01-26",
      comment: "Bonne maîtrise",
    },

    // 4ème C - Français
    {
      id: 26,
      student: "Durand Thomas",
      class: "4ème C",
      subject: "Français",
      type: "Devoir",
      title: "Commentaire de texte",
      grade: 12,
      coefficient: 2,
      date: "2024-01-17",
      comment: "Analyse superficielle",
    },
    {
      id: 27,
      student: "Blanc Marie",
      class: "4ème C",
      subject: "Français",
      type: "Composition",
      title: "Argumentation",
      grade: 18,
      coefficient: 3,
      date: "2024-01-28",
      comment: "Remarquable",
    },
    {
      id: 28,
      student: "Fabre Nicolas",
      class: "4ème C",
      subject: "Français",
      type: "Devoir",
      title: "Vocabulaire",
      grade: 11,
      coefficient: 1,
      date: "2024-01-15",
      comment: "Efforts à poursuivre",
    },
    {
      id: 29,
      student: "Rousseau Léa",
      class: "4ème C",
      subject: "Français",
      type: "Devoir",
      title: "Commentaire de texte",
      grade: 16,
      coefficient: 2,
      date: "2024-01-17",
      comment: "Très bonne analyse",
    },
    {
      id: 30,
      student: "Vincent Hugo",
      class: "4ème C",
      subject: "Français",
      type: "Composition",
      title: "Argumentation",
      grade: 14,
      coefficient: 3,
      date: "2024-01-28",
      comment: "Bien argumenté",
    },

    // Nouvelles classes - 3ème D
    {
      id: 31,
      student: "Lambert Sarah",
      class: "3ème D",
      subject: "Mathématiques",
      type: "Devoir",
      title: "Fonctions",
      grade: 17,
      coefficient: 2,
      date: "2024-01-23",
      comment: "Excellente compréhension",
    },
    {
      id: 32,
      student: "Mercier Paul",
      class: "3ème D",
      subject: "Mathématiques",
      type: "Composition",
      title: "Brevet blanc",
      grade: 13,
      coefficient: 4,
      date: "2024-01-30",
      comment: "Niveau correct",
    },
    {
      id: 33,
      student: "Girard Chloé",
      class: "3ème D",
      subject: "Français",
      type: "Devoir",
      title: "Analyse littéraire",
      grade: 15,
      coefficient: 2,
      date: "2024-01-21",
      comment: "Bonne méthode",
    },
    {
      id: 34,
      student: "André Kevin",
      class: "3ème D",
      subject: "Français",
      type: "Composition",
      title: "Brevet blanc",
      grade: 12,
      coefficient: 4,
      date: "2024-01-31",
      comment: "Expression à améliorer",
    },

    // 2nde E
    {
      id: 35,
      student: "Morel Emma",
      class: "2nde E",
      subject: "Mathématiques",
      type: "Devoir",
      title: "Statistiques",
      grade: 16,
      coefficient: 2,
      date: "2024-01-25",
      comment: "Très bon travail",
    },
    {
      id: 36,
      student: "Fontaine Alex",
      class: "2nde E",
      subject: "Mathématiques",
      type: "Composition",
      title: "Fonctions",
      grade: 14,
      coefficient: 3,
      date: "2024-02-01",
      comment: "Progrès notable",
    },
    {
      id: 37,
      student: "Rey Manon",
      class: "2nde E",
      subject: "Français",
      type: "Devoir",
      title: "Commentaire composé",
      grade: 18,
      coefficient: 2,
      date: "2024-01-27",
      comment: "Analyse remarquable",
    },
    {
      id: 38,
      student: "Lemoine Théo",
      class: "2nde E",
      subject: "Français",
      type: "Composition",
      title: "Dissertation",
      grade: 11,
      coefficient: 3,
      date: "2024-02-02",
      comment: "Argumentation à structurer",
    },
  ];

  console.log("Grades array:", grades);
  console.log("Selected class:", selectedClass);
  console.log("Search term:", searchTerm);

  const filteredGrades = grades.filter((grade) => {
    const matchesClass =
      selectedClass === "all" ||
      (selectedClass === "6eme-a" && grade.class === "6ème A") ||
      (selectedClass === "5eme-b" && grade.class === "5ème B") ||
      (selectedClass === "4eme-c" && grade.class === "4ème C") ||
      (selectedClass === "3eme-d" && grade.class === "3ème D") ||
      (selectedClass === "2nde-e" && grade.class === "2nde E");
    const matchesSearch =
      grade.student.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grade.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesClass && matchesSearch;
  });

  console.log("Filtered grades:", filteredGrades);

  const handleEditGrade = (grade) => {
    setSelectedGrade({ ...grade });
  };

  const handleSaveGrade = () => {
    console.log("Sauvegarde de la note:", selectedGrade);
    setSelectedGrade(null);
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 16) return "text-green-600";
    if (grade >= 12) return "text-orange-600";
    return "text-red-600";
  };

  return (
    <div className="min-h-screen bg-background p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate("/teacher-dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Gestion des Notes</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Visualiser et modifier toutes vos notes saisies
            </p>
          </div>
        </div>

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
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une classe" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((classe) => (
                      <SelectItem key={classe.id} value={classe.id}>
                        {classe.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grades Table */}
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
                    <TableHead>Type</TableHead>
                    <TableHead>Devoir/Composition</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Coef.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGrades.map((grade) => (
                    <TableRow key={grade.id}>
                      <TableCell className="font-medium">{grade.student}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{grade.class}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={grade.type === "Composition" ? "default" : "secondary"}>
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
                      <TableCell>{new Date(grade.date).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditGrade(grade)}
                            >
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
                                  <label className="text-sm font-medium mb-2 block">Note /20</label>
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
                                    value={selectedGrade.comment}
                                    onChange={(e) =>
                                      setSelectedGrade({
                                        ...selectedGrade,
                                        comment: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <div className="flex gap-2 pt-4">
                                  <Button
                                    variant="outline"
                                    onClick={() => setSelectedGrade(null)}
                                    className="flex-1"
                                  >
                                    Annuler
                                  </Button>
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
      </div>
    </div>
  );
};

export default TeacherGradesManagement;
