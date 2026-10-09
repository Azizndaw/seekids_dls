import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { FileCheck, Download, Search, UserCheck } from "lucide-react";
import { useUsers, Student, Class } from "@/hooks/useUsers";
import { generateCertificatScolaritePDF } from "@/utils/generateCertificatScolaritePDF";
import { useToast } from "@/hooks/use-toast";

interface CertificatScolariteGeneratorProps {
    initialStudent?: Student & {
        classe?: any;
        parent?: any;
    };
}

const CertificatScolariteGenerator: React.FC<CertificatScolariteGeneratorProps> = ({
    initialStudent,
}) => {
    const { data: usersData } = useUsers();
    const { toast } = useToast();

    const studentsList: Student[] = usersData?.students || [];
    const classesList: Class[] = usersData?.classes || [];

    const [selectedClassId, setSelectedClassId] = useState<string>("all");
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudent?.id || "");
    const [directeurName, setDirecteurName] = useState<string>("Mamadou NDOYE");
    const [academicYear, setAcademicYear] = useState<string>(
        localStorage.getItem("academicYear") || "2025/2026"
    );
    const [isGenerating, setIsGenerating] = useState<boolean>(false);

    // Filter students by class and search string
    const filteredStudents = studentsList.filter((st: any) => {
        const matchesClass = selectedClassId === "all" || st.classeId === selectedClassId;
        const fullName = `${st.prenom || ""} ${st.nom || ""}`.toLowerCase();
        const matchesSearch = fullName.includes(searchTerm.toLowerCase());
        return matchesClass && matchesSearch;
    });

    const selectedStudent =
        studentsList.find((s) => s.id === selectedStudentId) || (initialStudent as any);

    // Find class details
    const studentClass = classesList.find((c) => c.id === selectedStudent?.classeId);

    const handleGenerate = async () => {
        if (!selectedStudent) {
            toast({
                title: "Veuillez sélectionner un élève",
                description: "Un élève doit être sélectionné pour générer le certificat de scolarité.",
                variant: "destructive",
            });
            return;
        }

        setIsGenerating(true);
        try {
            await generateCertificatScolaritePDF({
                prenom: selectedStudent.prenom,
                nom: selectedStudent.nom,
                dateOfBirth: selectedStudent.dateOfBirth,
                lieu_naissance: selectedStudent.lieu_naissance || "Dakar",
                classeName: studentClass?.nom || selectedStudent.classe?.nom || "",
                classeNiveau: studentClass?.niveau || selectedStudent.classe?.niveau || "",
                academicYear: academicYear,
                directeurName: directeurName,
            });

            toast({
                title: "Certificat généré",
                description: `Le certificat de scolarité pour ${selectedStudent.prenom} ${selectedStudent.nom} a été téléchargé.`,
            });
        } catch (error: any) {
            console.error("Erreur génération certificat:", error);
            toast({
                title: "Erreur de génération",
                description: "Une erreur est survenue lors de la création du PDF.",
                variant: "destructive",
            });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Card className="border shadow-sm">
            <CardHeader className="p-4 sm:p-6 bg-muted/20">
                <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-primary" />
                    Certificat de Scolarité
                </CardTitle>
                <CardDescription>
                    Générez un certificat de scolarité officiel au format officiel (conforme au modèle DLS)
                </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Filter by Class */}
                    <div>
                        <Label className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">
                            Filtrer par Classe
                        </Label>
                        <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Toutes les classes" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Toutes les classes</SelectItem>
                                {classesList.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {c.niveau} - {c.nom}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Search Student */}
                    <div>
                        <Label className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">
                            Rechercher l'élève
                        </Label>
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                            <Input
                                placeholder="Nom ou prénom..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Student Select Dropdown */}
                <div>
                    <Label className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">
                        Élève Sélectionné *
                    </Label>
                    <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="-- Choisir un élève --" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                            {filteredStudents.map((st: any) => {
                                const cls = classesList.find((c) => c.id === st.classeId);
                                const classLabel = cls ? `${cls.niveau} - ${cls.nom}` : "Sans classe";
                                return (
                                    <SelectItem key={st.id} value={st.id}>
                                        {st.prenom} {st.nom} ({classLabel})
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                </div>

                {/* Student Preview Box if selected */}
                {selectedStudent && (
                    <div className="p-3 bg-primary/5 border rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div className="flex items-center gap-3">
                            <UserCheck className="w-5 h-5 text-primary" />
                            <div>
                                <p className="font-semibold text-sm">
                                    {selectedStudent.prenom} {selectedStudent.nom}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Né(e) le: {selectedStudent.dateOfBirth || "N/A"} à{" "}
                                    <span className="font-medium text-foreground">
                                        {selectedStudent.lieu_naissance || "Dakar"}
                                    </span>
                                </p>
                            </div>
                        </div>
                        <div className="text-xs bg-background px-2.5 py-1 rounded border font-medium text-muted-foreground">
                            Classe: {studentClass ? `${studentClass.niveau} ${studentClass.nom}` : "N/A"}
                        </div>
                    </div>
                )}

                {/* Custom Parameters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                        <Label htmlFor="directeur-name" className="text-xs font-semibold text-muted-foreground mb-1 block">
                            Nom du Directeur des Études
                        </Label>
                        <Input
                            id="directeur-name"
                            value={directeurName}
                            onChange={(e) => setDirecteurName(e.target.value)}
                        />
                    </div>
                    <div>
                        <Label htmlFor="academic-year" className="text-xs font-semibold text-muted-foreground mb-1 block">
                            Année Scolaire
                        </Label>
                        <Input
                            id="academic-year"
                            value={academicYear}
                            onChange={(e) => setAcademicYear(e.target.value)}
                        />
                    </div>
                </div>

                <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || !selectedStudentId}
                    className="w-full sm:w-auto"
                >
                    <Download className="w-4 h-4 mr-2" />
                    {isGenerating ? "Génération..." : "Télécharger le Certificat de Scolarité (PDF)"}
                </Button>
            </CardContent>
        </Card>
    );
};

export default CertificatScolariteGenerator;
