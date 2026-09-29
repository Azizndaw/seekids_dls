import React, { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { Download, Loader2, ListChecks } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useToast } from "@/hooks/use-toast";
import { SchoolAverageDTO, useGetClasseAverage } from "@/hooks/useAverage";
import { useClasses, useGetSchool, useStudents } from "@/hooks/useUsers";
import { useSchoolLogo } from "@/hooks/useSchoolLogo";

interface RevisionStudent {
    id: string;
    nom: string;
    prenom: string;
    classe: string;
    matières: string[];
    moyennes: string[];
}

interface RevisionListGeneratorProps {
    averageDto: SchoolAverageDTO;
}

const RevisionListGenerator: React.FC<RevisionListGeneratorProps> = ({ averageDto }) => {
    const [selectedClass, setSelectedClass] = useState<string>("all");
    const { toast } = useToast();

    const { data: schoolData } = useGetSchool();
    const logo = useSchoolLogo();
    const classReports = averageDto?.classAverages || [];

    const { data: classAverageData, isLoading: isLoadingClassData } = useGetClasseAverage(
        selectedClass !== "all" ? selectedClass : "",
    );

    const [revisionStudents, setRevisionStudents] = useState<RevisionStudent[]>([]);

    useEffect(() => {
        if (selectedClass !== "all" && classAverageData) {
            processData(classAverageData);
        } else {
            setRevisionStudents([]);
        }
    }, [selectedClass, classAverageData]);

    const processData = (classData: any) => {
        const students = classData.studentsData || [];
        if (!students || students.length === 0) {
            setRevisionStudents([]);
            return;
        }

        const result: RevisionStudent[] = [];

        students.forEach((student: any) => {
            // FORCE SEMESTRE 1 ONLY
            const relevantGrades = (student.grades || []).filter((g: any) => {
                if (!g.semestre) return false;
                return g.semestre.includes("1"); // STRICT SEMESTRE 1
            });

            if (relevantGrades.length === 0) return;

            const notesByDiscipline = new Map<string, any[]>();
            relevantGrades.forEach((n: any) => {
                const key = n.subject || n.discipline?.name || "Sans Nom";
                if (!notesByDiscipline.has(key)) notesByDiscipline.set(key, []);
                notesByDiscipline.get(key)!.push(n);
            });

            const weakSubjects: string[] = [];
            const weakGrades: string[] = [];
            
            let totalMoyenneCoef = 0;
            let totalCoef = 0;

            notesByDiscipline.forEach((discNotes, discName) => {
                const devoirs = discNotes.filter((n: any) => n.devoir);
                const compos = discNotes.filter((n: any) => !n.devoir || n.type === "Composition");

                const sumDevoir = devoirs.reduce((sum: number, n: any) => sum + n.grade, 0);
                const avgDevoir = devoirs.length > 0 ? sumDevoir / devoirs.length : 0;

                const sumCompo = compos.reduce((sum: number, n: any) => sum + n.grade, 0);
                const avgCompo = compos.length > 0 ? sumCompo / compos.length : 0;

                const moyenneSubject = parseFloat(((avgDevoir + avgCompo) / 2).toFixed(2));
                const coef = discNotes[0]?.coefficient || 1;
                
                totalMoyenneCoef += moyenneSubject * coef;
                totalCoef += coef;

                if (moyenneSubject < 10) {
                    weakSubjects.push(discName);
                    weakGrades.push(moyenneSubject.toString());
                }
            });

            const calculatedGeneralAvg = totalCoef > 0 ? totalMoyenneCoef / totalCoef : 0;

            // EXCLUDE if general average >= 13 or no weak subjects
            if (weakSubjects.length > 0 && calculatedGeneralAvg < 13) {
                result.push({
                    id: student.id,
                    nom: student.lastName || "Nom Inconnu",
                    prenom: student.firstName || "Prénom Inconnu",
                    classe: classData.classe || "",
                    matières: weakSubjects,
                    moyennes: weakGrades,
                });
            }
        });

        setRevisionStudents(result);
    };

    const generatePDF = () => {
        if (revisionStudents.length === 0) {
            toast({
                title: "Aucun élève à retenir",
                description: "Tous les élèves ont des moyennes supérieures ou égales à 10 dans toutes les matières.",
            });
            return;
        }

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const currentYear = "2025 - 2026";

        // === HEADER COMPACT ===
        doc.setFontSize(7);
        doc.setFont(undefined, "bold");
        doc.text("République du Sénégal", 14, 10);
        doc.setFont(undefined, "normal");
        doc.text("Ministère de l'Éducation Nationale", 14, 13);
        doc.text("INSPECTION D’ACADÉMIE DE DAKAR / IEF DES ALMADIES", 14, 16);

        doc.setFontSize(8);
        doc.setFont(undefined, "italic");
        doc.text("Collège Lycée de Référence Trilingue", 14, 20);
        doc.setFont(undefined, "bold");
        doc.text("DAKAR LEADERS SCHOOL-DLS", 14, 24);

        if (logo) {
            try {
                doc.addImage(logo, "PNG", pageWidth / 2 - 10, 5, 20, 20);
            } catch (e) {
                console.error("Error adding logo:", e);
            }
        }

        // Right side
        doc.setFontSize(8);
        doc.text(`Année Scolaire: ${currentYear}`, pageWidth - 14, 10, { align: "right" });
        doc.text(`1er Semestre`, pageWidth - 14, 14, { align: "right" });

        // === TITLE COMPACT ===
        doc.setFontSize(14);
        doc.setFont(undefined, "bold");
        doc.text("LISTE DES ÉLÈVES POUR RÉVISIONS SURVEILLÉES (1er Semestre)", pageWidth / 2, 34, { align: "center" });
        doc.line(20, 36, pageWidth - 20, 36);

        // Class Info
        doc.setFontSize(10);
        doc.text(`Classe: ${revisionStudents[0]?.classe || ""}`, 14, 40);
        doc.text(`Généré le: ${new Date().toLocaleDateString("fr-FR")}`, pageWidth - 14, 40, { align: "right" });

        // === TABLE COMPACT ===
        const tableBody = revisionStudents.map((s) => [
            `${s.nom.toUpperCase()} ${s.prenom}`,
            s.matières.join(", "),
            s.moyennes.map(m => `${m}/20`).join(", ")
        ]);

        // Dynamically adjust font size
        const dynamicFontSize = revisionStudents.length > 35 ? 8 : (revisionStudents.length > 25 ? 9 : 10);
        const dynamicPadding = revisionStudents.length > 30 ? 1.5 : 2.5;

        autoTable(doc, {
            startY: 45,
            head: [['Élève (Nom & Prénoms)', 'Matières à réviser', 'Moyennes']],
            body: tableBody,
            headStyles: {
                fillColor: [31, 41, 55],
                textColor: [255, 255, 255],
                fontSize: dynamicFontSize + 1,
                fontStyle: 'bold',
                halign: 'center',
                cellPadding: dynamicPadding
            },
            bodyStyles: {
                fontSize: dynamicFontSize,
                valign: 'middle',
                cellPadding: dynamicPadding,
                lineColor: [229, 231, 235],
                lineWidth: 0.1,
                textColor: [31, 41, 55]
            },
            columnStyles: {
                0: { cellWidth: 75 },
                1: { cellWidth: 80 },
                2: { cellWidth: 'auto', halign: 'center', textColor: [185, 28, 28] }
            },
            alternateRowStyles: {
                fillColor: [249, 250, 251]
            },
            didParseCell: (data) => {
                if (data.section === 'body' && (data.column.index === 0 || data.column.index === 2)) {
                    data.cell.styles.fontStyle = 'bold';
                }
            },
            margin: { left: 14, right: 14, bottom: 25 },
            theme: 'striped',
            pageBreak: 'avoid'
        });

        // Final footer text
        const finalY = (doc as any).lastAutoTable.finalY + 12;

        const signatureY = finalY > 265 ? 270 : finalY;
        
        doc.setFontSize(10);
        doc.setFont(undefined, "bold");
        doc.text("Le Directeur des Études", 35, signatureY, { align: "center" });
        doc.text("Le Directeur Général", pageWidth - 35, signatureY, { align: "center" });

        doc.setFontSize(8);
        doc.setFont(undefined, "italic");
        doc.text(`Total : ${revisionStudents.length} élèves concernés pour le 1er Semestre.`, 14, signatureY + 15);

        const fileName = `Revision_Surveillees_${revisionStudents[0]?.classe || "Classe"}_S1.pdf`;
        doc.save(fileName);

        toast({
            title: "Liste de révision générée",
            description: `Le fichier PDF a été créé avec ${revisionStudents.length} élèves.`,
        });
    };

    return (
        <Card className="bg-card border-border">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                    <ListChecks className="w-5 h-5 text-blue-500" />
                    Liste pour Révisions Surveillées
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                    Générer la liste globale des élèves devant être retenus pour révisions (Moyenne {"<"} 10)
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <Label htmlFor="rev-class">Classe</Label>
                        <Select value={selectedClass} onValueChange={setSelectedClass}>
                            <SelectTrigger>
                                <SelectValue placeholder="Sélectionner une classe" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Choisir une classe (Requis)</SelectItem>
                                {classReports.map((classe) => (
                                    <SelectItem key={classe.classeId} value={classe.classeId}>
                                        {classe.classe}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="border border-border rounded-lg p-4 bg-muted/50">
                    <h4 className="font-medium mb-3 text-foreground">Aperçu (1er Semestre) :</h4>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Élèves concernés :</span>
                            <span className="font-bold text-blue-600">{revisionStudents.length}</span>
                        </div>
                        <p className="text-xs text-muted-foreground italic">
                            Inclut les élèves avec Moyenne Générale {"<"} 13 ET au moins une matière {"<"} 10/20.
                        </p>
                    </div>
                </div>

                <Button
                    onClick={generatePDF}
                    className="w-full"
                    size="lg"
                    disabled={selectedClass === "all" || isLoadingClassData || revisionStudents.length === 0}
                >
                    {isLoadingClassData ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Download className="w-4 h-4 mr-2" />
                    )}
                    Générer la Liste de Révisions
                </Button>
            </CardContent>
        </Card>
    );
};

export default RevisionListGenerator;
