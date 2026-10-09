import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, Download, Users, GraduationCap, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { useAllTeachers } from "@/hooks/useUsers";
import { useAuth } from "@/hooks/useAuth";
import { useGetClasseAverageOrAll, useGetSchoolAverage } from "@/hooks/useAverage";
import { convertStudents } from "@/hooks/useNotes";
import { useUpdateSchoolReportCounter } from "@/hooks/useSchoolData";

interface StudentData {
  nom: string;
  prenom: string;
  classe: string;
  photo?: string;
  notes: {
    devoirs: { matiere: string; note: number; date: string }[];
    compositions: { matiere: string; note: number; date: string }[];
  };
  moyenne: number;
  absences: number;
  retards: number;
}

const DataExtraction = () => {
  const [selectedClass, setSelectedClass] = useState<string>("null");
  const [selectedClassName, setSelectedClassName] = useState<string>(null);
  const [extractionType, setExtractionType] = useState<"students" | "teachers">("students");
  const [students, setStudents] = useState<any[]>([]);
  const { authUser } = useAuth();
  const { data: teachers } = useAllTeachers(authUser);
  const { data: schoolResults } = useGetSchoolAverage();
  const { data: classeDetails } = useGetClasseAverageOrAll(selectedClass);
  const updateCounterMutation = useUpdateSchoolReportCounter();

  useEffect(() => {
    if (classeDetails?.length > 0) {
      setStudents(classeDetails.flatMap((cd) => cd.studentsData));
      return;
    }
    if (classeDetails?.studentsData) {
      setStudents(classeDetails.studentsData);
    }
  }, [classeDetails]);

  if (!teachers || !schoolResults) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const classListSafe = schoolResults.classAverages || (Array.isArray(schoolResults) ? schoolResults : []) || [];
  const classes = classListSafe.map((ca: any) => ({
    id: ca.classeId,
    name: ca.classe,
  }));

  const handleClassChange = (className: string) => {
    setSelectedClass(className);
    const classe = classes.find((cl) => cl.id == className);
    if (!classe) {
      setSelectedClassName(null);
      return;
    }
    setSelectedClassName(classe.name);
  };

  // Données exemple
  const studentsData: StudentData[] = convertStudents(students);

  const teachersData = teachers.map((t) => ({
    nom: t.nom,
    prenom: t.prenom,
    email: t.email,
    classes: t.classes?.map((c) => `${c.classe?.niveau} ${c.classe?.nom}`),
    matieres: t.disciplines?.map((d) => d.name),
  }));

  const exportToExcel = async () => {
    let dataToExport;
    let filename;

    if (extractionType === "students") {
      dataToExport = studentsData.map((student) => ({
        Nom: student.nom,
        Prénom: student.prenom,
        Classe: student.classe,
        "Notes Devoirs": student.notes.devoirs.map((n) => `${n.matiere}: ${n.note}/20`).join(", "),
        "Notes Compositions": student.notes.compositions
          .map((n) => `${n.matiere}: ${n.note}/20`)
          .join(", "),
        "Moyenne Générale": student.moyenne,
        Absences: student.absences,
        Retards: student.retards,
      }));
      filename = `donnees_eleves_${selectedClass === "allClass" ? "toutes_classes" : selectedClassName?.replace(" ", "_")
        }.xlsx`;
    } else {
      dataToExport = teachersData.map((teacher) => ({
        Nom: teacher.nom,
        Prénom: teacher.prenom,
        Email: teacher.email,
        Matières: teacher.matieres.join(", "),
        Classes: teacher.classes.join(", "),
      }));
      filename = "donnees_professeurs.xlsx";
    }

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, extractionType === "students" ? "Élèves" : "Professeurs");
    XLSX.writeFile(wb, filename);
    await updateCounterMutation.mutateAsync();
  };

  return (
    <div className="space-y-6">
      {/* Extraction de données */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Extraction de Données
          </CardTitle>
          <CardDescription>
            Exporter les données du personnel et des élèves vers Excel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Type de données</label>
              <Select
                value={extractionType}
                onValueChange={(value: "students" | "teachers") => setExtractionType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="students">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4" />
                      Élèves
                    </div>
                  </SelectItem>
                  <SelectItem value="teachers">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Professeurs
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {extractionType === "students" && (
              <div>
                <label className="text-sm font-medium mb-2 block">Classe</label>
                <Select value={selectedClass} onValueChange={handleClassChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">Sélectionner une classe</SelectItem>
                    <SelectItem value="allClass">Toutes les classes</SelectItem>
                    {classes.map((cl) => (
                      <SelectItem key={cl.id} value={cl.id}>
                        {cl.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-end">
              <Button onClick={exportToExcel} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Exporter Excel
              </Button>
            </div>
          </div>

          {/* Prévisualisation des données */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h4 className="font-medium mb-2">Aperçu des données à exporter:</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Nom/Prénom</Badge>
              </div>
              {extractionType === "students" && (
                <>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Notes</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Absences/Retards</Badge>
                  </div>
                </>
              )}
              {extractionType === "teachers" && (
                <>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Email</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Classes</Badge>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataExtraction;
