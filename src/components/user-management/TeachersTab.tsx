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
import { Search } from "lucide-react";
import { User, useGetSchool } from "@/hooks/useUsers";
import AddUserForm from "./AddUserForm";
import EditTeacherModal from "./EditTeacherModal";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateTeacherListPDF } from "@/utils/generateTeacherListPDF";
import { useSchoolLogo } from "@/hooks/useSchoolLogo";

interface TeachersTabProps {
  teachers: User[];
  classes: Array<{
    id: string;
    nom: string;
    niveau: string;
    schoolId: string;
    created_at?: string;
    professeurs?: Array<{
      professeurId: string;
    }>;
  }>;
}

const TeachersTab: React.FC<TeachersTabProps> = ({ teachers, classes }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const { data: schoolData } = useGetSchool();
  const logoUrl = useSchoolLogo();

  const filteredTeachers = teachers.filter((teacher) => {
    const matchesSearch =
      teacher.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.email.toLowerCase().includes(searchTerm.toLowerCase());

    const teacherClasses = classes.filter((classe) =>
      classe.professeurs?.some((pc) => pc.professeurId === teacher.id)
    );

    const matchesClass =
      selectedClass === "all" || teacherClasses.some((c) => c.id === selectedClass);

    return matchesSearch && matchesClass;
  });

  const handleExportPDF = () => {
    const allClassNames = classes.map((c) => `${c.niveau} ${c.nom}`).join(", ");

    // Liste des professeurs "extra" demandés par l'utilisateur
    const extraTeachers = [
      {
        id: "extra-1",
        prenom: "M. Alioune",
        nom: "SYLLA",
        telephone: "",
        email: "",
        matiere: "Initiation à l'entrepreneuriat",
        classes: allClassNames,
      },
      {
        id: "extra-2",
        prenom: "Coach Régis Ngago",
        nom: "DABO",
        telephone: "",
        email: "",
        matiere: "Initiation à l'entrepreneuriat",
        classes: allClassNames,
      },
    ];

    // Liste de base de l'administration demandée par l'utilisateur (Hybrid approach)
    const requiredAdmins = [
      { key: "cheikh ahmed tidiane ndiaye", prenom: "M. Cheikh Ahmed Tidiane", nom: "NDIAYE", poste: "Directeur Général" },
      { key: "mamadou ndoye", prenom: "M. Mamadou", nom: "NDOYE", poste: "Directeur des Études" },
      { key: "ndiaye coumba diouf", prenom: "Mme NDIAYE Coumba", nom: "Diouf", poste: "Assistante de Direction Générale et Comptable", telephone: "78 608 38 42" },
      { key: "aminata saniko", prenom: "Mme Wade Aminata Saniko", nom: "HAIDRA", poste: "Assistante d'Accueil, Marketing et Communication", telephone: "700031414" },
      { key: "audrey natacha awa diatta", prenom: "Mme Audrey Natacha Awa", nom: "DIATTA", poste: "Assistante Pédagogique" },
      {
        key: "abdou aziz ndaw",
        prenom: "M.Abdou Aziz",
        nom: "Ndaw",
        poste: "Surveillant Général - Responsable Orientation et Technologie Éducative",
      },
    ];

    // Rechercher ces personnes dans la liste complète des utilisateurs pour avoir leurs noms complets
    const matchedAdmins = requiredAdmins.map((admin) => {
      const dbUser = teachers.find((u) => {
        const fullName = `${u.prenom} ${u.nom}`.toLowerCase();
        return fullName.includes(admin.key);
      });

      if (dbUser) {
        return {
          id: dbUser.id,
          prenom: dbUser.prenom,
          nom: dbUser.nom,
          poste: admin.poste,
          telephone: dbUser.telephone || admin.telephone || "",
        };
      }
      return {
        id: `missing-${admin.key}`,
        prenom: admin.prenom,
        nom: admin.nom,
        poste: admin.poste,
        telephone: admin.telephone || "",
      };
    });

    // Ajouter d'AUTRES membres qui auraient le rôle administration mais qui ne sont pas dans la liste de base
    const otherAdmins = teachers
      .filter((u) => {
        const role = (u.role || "").toLowerCase();
        const isAdminRole = role === "administration" || role === "admin";
        if (!isAdminRole) return false;

        // Éviter les doublons avec matchedAdmins
        const alreadyMatched = requiredAdmins.some((ra) =>
          `${u.prenom} ${u.nom}`.toLowerCase().includes(ra.key)
        );
        return !alreadyMatched;
      })
      .map((u) => ({
        id: u.id,
        prenom: u.prenom,
        nom: u.nom,
        poste: "Administration",
        telephone: u.telephone || "",
      }));

    const administrationData = [...matchedAdmins, ...otherAdmins];

    const exportData = [
      ...teachers
        .filter((u) => {
          const role = (u.role || "").toLowerCase();
          // On exclut les admins de la liste des profs pour éviter les doublons
          // On s'assure qu'on n'exporte que les profs ou ceux qui ne sont pas explicitement admins
          return role !== "administration" && role !== "admin";
        })
        .map((teacher) => {
          const teacherClasses = classes.filter((classe) =>
            classe.professeurs?.some((pc) => pc.professeurId === teacher.id)
          );
          const t: any = teacher;
          const assignedSubjects = t.disciplines || [];

          return {
            id: teacher.id,
            prenom: teacher.prenom,
            nom: teacher.nom,
            telephone: teacher.telephone || "",
            email: teacher.email,
            matiere: assignedSubjects.map((s: any) => s.name).join(", "),
            classes: teacherClasses.map((c: any) => `${c.niveau} ${c.nom}`).join(", "),
          };
        }),
      ...extraTeachers,
    ];

    generateTeacherListPDF(
      exportData,
      administrationData,
      schoolData?.nom || "DAKAR LEADERS SCHOOL-DLS",
      logoUrl
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <CardTitle>Gestion des Professeurs</CardTitle>
          <CardDescription>Créer des accès professeurs et attribuer des classes</CardDescription>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleExportPDF}
            disabled={filteredTeachers.length === 0}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Exporter PDF
          </Button>
          <AddUserForm
            roles="TEACHER"
            triggerText="Ajouter un professeur"
            title="Créer un accès professeur"
            description="Remplissez les informations du professeur et sélectionnez ses classes"
            classes={classes}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un professeur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="w-full sm:w-[250px]">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrer par classe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les classes</SelectItem>
                {classes.map((classe) => (
                  <SelectItem key={classe.id} value={classe.id}>
                    {classe.niveau} - {classe.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom Complet</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Classes assignées</TableHead>
                <TableHead>Matières</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeachers.map((teacher) => {
                const assignedClasses = classes.filter((classe) =>
                  classe.professeurs?.some((pc) => pc.professeurId === teacher.id)
                );
                const t: any = teacher;
                const assignedSubjects = t.disciplines;
                return (
                  <TableRow key={teacher.id}>
                    <TableCell>
                      {teacher.prenom} {teacher.nom}
                    </TableCell>
                    <TableCell>{teacher.email}</TableCell>
                    <TableCell>{teacher.telephone || "Non renseigné"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {assignedClasses.length > 0 ? (
                          assignedClasses.map((classe) => (
                            <Badge key={classe.id} variant="outline" className="text-xs">
                              {classe.niveau} - {classe.nom}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">Aucune classe</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {assignedSubjects.length > 0 ? (
                          assignedSubjects.map((subject) => (
                            <Badge key={subject.id} variant="secondary" className="text-xs">
                              {subject.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">Aucune matière</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <EditTeacherModal teacher={teacher} classes={classes} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeachersTab;
