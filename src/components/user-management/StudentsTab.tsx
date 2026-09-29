import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Download } from "lucide-react";
import { Student, Class } from "@/hooks/useUsers";
import { Parent } from "@/hooks/useParents";
import AddStudentForm from "./AddStudentForm";
import EditStudentModal from "./EditStudentModal";
import { generateStudentListPDF, StudentPDFData } from "@/utils/generateStudentListPDF";

interface StudentsTabProps {
  students: (Student & {
    classe?: { nom: string; niveau: string } | null;
    parent?: { nom: string; prenom: string } | null;
  })[];
  classe: Class[];
  parents: Parent[];
}

const StudentsTab: React.FC<StudentsTabProps> = ({ students, classe: classes, parents }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState<string>("all");

  // Step 1: Create a mapping for parents and classes
  const parentMap = parents.reduce((acc, parent) => {
    acc[parent.id] = parent;
    return acc;
  }, {});

  const classMap = classes.reduce((acc, classe) => {
    acc[classe.id] = classe;
    return acc;
  }, {});

  // Step 2: Attach both parent and class data to each student based on parentId and classeId
  const studentsWithDetails = students.map((student) => {
    const parent = parentMap[student.parentId]; // Get the parent data by parentId
    const studentClass = classMap[student.classeId]; // Get the class data by classeId
    return {
      ...student,
      parent: parent || null, // Attach parent data (or null if not found)
      classe: studentClass || null, // Attach class data (or null if not found)
    };
  });

  const filteredStudents = studentsWithDetails.filter((student) => {
    // Apply class filter
    if (classFilter !== "all" && student.classeId !== classFilter) {
      return false;
    }
    // Apply search filter
    return (
      student.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.parent &&
        (student.parent.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.parent.prenom.toLowerCase().includes(searchTerm.toLowerCase()))) ||
      (student.classe &&
        (student.classe.niveau.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.classe.nom.toLowerCase().includes(searchTerm.toLowerCase())))
    );
  });

  const handleExportPDF = () => {
    const pdfStudents: StudentPDFData[] = filteredStudents.map((student) => ({
      id: student.id,
      prenom: student.prenom,
      nom: student.nom,
      dateOfBirth: student.dateOfBirth,
      className: student.classe?.nom,
      classLevel: student.classe?.niveau,
      parentName: student.parent
        ? `${student.parent.prenom} ${student.parent.nom}`
        : undefined,
    }));

    const selectedClass = classes.find((c) => c.id === classFilter);
    const filterLabel = selectedClass
      ? `${selectedClass.niveau} - ${selectedClass.nom}`
      : undefined;

    generateStudentListPDF(pdfStudents, filterLabel);
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <CardTitle>Gestion des Élèves</CardTitle>
          <CardDescription>Ajouter et gérer les élèves et leurs classes</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportPDF}
            disabled={filteredStudents.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Exporter PDF
          </Button>
          <AddStudentForm classes={classes} parents={parents} />
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="mb-4 flex flex-col sm:flex-row gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un élève ou parent ou classe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filtrer par classe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les classes</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.niveau} - {c.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom Complet</TableHead>
                <TableHead>Date de Naissance</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>
                    {student.prenom} {student.nom}
                  </TableCell>
                  <TableCell>
                    {student.dateOfBirth ? (
                      <span className="text-sm text-muted-foreground">
                        {new Date(student.dateOfBirth).toLocaleDateString("fr-FR")}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Non renseignée</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {student.classe ? (
                      <Badge variant="secondary">
                        {student.classe.niveau} - {student.classe.nom}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Non assigné</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {student.parent ? (
                      <span className="text-sm">
                        {student.parent.prenom} {student.parent.nom}
                      </span>
                    ) : (
                      <Badge variant="outline">Aucun</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <EditStudentModal student={student} classes={classes} parents={parents} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default StudentsTab;
