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
import { Download, Loader2, Trophy } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useToast } from "@/hooks/use-toast";
import { useGetClasseAverageOrAll } from "@/hooks/useAverage";
import { useGetSchool } from "@/hooks/useUsers";
import { useSchoolLogo } from "@/hooks/useSchoolLogo";

interface TopStudent {
    id: string;
    nom: string;
    prenom: string;
    classe: string;
    moyenne: number;
}

const isLyceeClass = (className: string) => {
    const lower = className.toLowerCase();
    return lower.includes("second") || lower.includes("2nd") || lower.includes("premi") || lower.includes("1er") || lower.includes("1èr") || lower.includes("1ere") || lower.includes("terminal") || lower.includes("tle") || lower.includes("term") || lower.includes("tl") || lower.includes("ts");
};

const TopStudentsListGenerator: React.FC = () => {
    const { toast } = useToast();

    const { data: schoolData } = useGetSchool();
    const logo = useSchoolLogo();

    // Fetch data for all classes
    const { data: allClassData, isLoading: isLoadingAllData } = useGetClasseAverageOrAll("allClass");

    const [topStudents, setTopStudents] = useState<TopStudent[]>([]);
    const [filterLevel, setFilterLevel] = useState<"tous" | "college" | "lycee">("tous");

    useEffect(() => {
        if (allClassData && Array.isArray(allClassData)) {
            processAllData(allClassData);
        } else {
            setTopStudents([]);
        }
    }, [allClassData, filterLevel]);

    const processAllData = (classes: any[]) => {
        const result: TopStudent[] = [];

        classes.forEach((classData: any) => {
            const className = classData.classe || "";
            const isLyc = isLyceeClass(className);
            const isCol = !isLyc;

            if (filterLevel === "college" && !isCol) return;
            if (filterLevel === "lycee" && !isLyc) return;

            const threshold = isLyc ? 12 : 14;

            const students = classData.studentsData || [];

            students.forEach((student: any) => {
                // Calculate general average for SEMESTRE 1 ONLY
                const s1Grades = (student.grades || []).filter((g: any) => g.semestre?.includes("1"));

                if (s1Grades.length === 0) return;

                const notesByDiscipline = new Map<string, any[]>();
                s1Grades.forEach((n: any) => {
                    const key = n.subject || n.discipline?.name || n.disciplineName || "Sans Nom";
                    if (!notesByDiscipline.has(key)) notesByDiscipline.set(key, []);
                    notesByDiscipline.get(key)!.push(n);
                });

                let totalMoyenneCoef = 0;
                let totalCoef = 0;

                notesByDiscipline.forEach((discNotes) => {
                    const devoirs = discNotes.filter((n: any) => n.devoir);
                    const compos = discNotes.filter((n: any) => !n.devoir || n.type === "Composition");

                    const avgDevoir = devoirs.length > 0 ? devoirs.reduce((s: number, n: any) => s + n.grade, 0) / devoirs.length : 0;
                    const avgCompo = compos.length > 0 ? compos.reduce((s: number, n: any) => s + n.grade, 0) / compos.length : 0;
                    const coef = discNotes[0]?.coefficient || 1;

                    totalMoyenneCoef += ((avgDevoir + avgCompo) / 2) * coef;
                    totalCoef += coef;
                });

                const avg = totalCoef > 0 ? totalMoyenneCoef / totalCoef : 0;

                if (avg >= threshold) {
                    const nom = student.lastName || "Nom Inconnu";
                    const prenom = student.firstName || "Prénom Inconnu";

                    // Exclusion demandée : HAYDARA Ahmet Saloum
                    if (nom.toUpperCase().includes("HAYDARA") && prenom.toUpperCase().includes("AHMET SALOUM")) {
                        return;
                    }

                    result.push({
                        id: student.id,
                        nom: nom,
                        prenom: prenom,
                        classe: className,
                        moyenne: parseFloat(avg.toFixed(2)),
                    });
                }
            });
        });

        // Sort by average descending
        result.sort((a, b) => b.moyenne - a.moyenne);
        setTopStudents(result);
    };

    const generatePDF = () => {
        if (topStudents.length === 0) {
            toast({
                title: "Aucun élève trouvé",
                description: "Aucun élève n'a une moyenne entre 15 et 18 pour cette période.",
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
        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        let pdfTitle = "TABLEAU D'EXCELLENCE (1er Semestre)";
        if (filterLevel === "college") pdfTitle += " - COLLÈGE";
        if (filterLevel === "lycee") pdfTitle += " - LYCÉE";

        doc.text(pdfTitle, pageWidth / 2, 34, { align: "center" });

        doc.setFontSize(10);
        doc.setFont(undefined, "italic");
        let criteriaText = "Critères : Collège (>= 14/20), Lycée (>= 12/20)";
        if (filterLevel === "college") criteriaText = "Critère : Moyenne >= 14/20";
        if (filterLevel === "lycee") criteriaText = "Critère : Moyenne >= 12/20";
        doc.text(criteriaText, pageWidth / 2, 39, { align: "center" });

        doc.line(20, 41, pageWidth - 20, 41);

        // Subtitle
        doc.setFontSize(9);
        doc.setFont(undefined, "normal");
        doc.text(`Généré le: ${new Date().toLocaleDateString("fr-FR")}`, 14, 46);

        // === TABLE ===
        const tableBody = topStudents.map((s) => [
            `${s.nom.toUpperCase()} ${s.prenom}`,
            s.classe,
            `${s.moyenne} / 20`
        ]);

        // Dynamically adjust font size for visibility while staying on one page
        const dynamicFontSize = topStudents.length > 35 ? 8 : (topStudents.length > 25 ? 9 : 10);
        const dynamicPadding = topStudents.length > 30 ? 1.5 : 2.5;

        autoTable(doc, {
            startY: 50,
            head: [['Élève (Nom & Prénoms)', 'Classe', 'Moyenne Générale']],
            body: tableBody,
            headStyles: {
                fillColor: [5, 150, 105], // Green
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
                0: { cellWidth: 100 },
                1: { cellWidth: 50, halign: 'center' },
                2: { cellWidth: 'auto', halign: 'center', textColor: [5, 150, 105] }
            },
            alternateRowStyles: {
                fillColor: [240, 253, 244]
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

        const finalY = (doc as any).lastAutoTable.finalY + 12;

        // Ensure signatures don't overflow the page
        const signatureY = finalY > 265 ? 270 : finalY;

        doc.setFontSize(10);
        doc.setFont(undefined, "bold");
        doc.text("Le Directeur des Études", 35, signatureY, { align: "center" });
        doc.text("Le Directeur Général", pageWidth - 35, signatureY, { align: "center" });

        doc.setFontSize(8);
        doc.setFont(undefined, "italic");
        //doc.text(`Total : ${topStudents.length} élèves d'excellence.`, 14, signatureY + 15);

        const fileName = `Tableau_Excellence_S1_${filterLevel}.pdf`;
        doc.save(fileName);

        toast({
            title: "Liste d'excellence générée",
            description: `${topStudents.length} élèves d'excellence pour le 1er Semestre ont été inclus.`,
        });
    };

    return (
        <Card className="bg-card border-border">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Tableau d'Excellence
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                    Générer la liste des élèves d'excellence
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="filter-level">Filtre par Niveau</Label>
                    <Select value={filterLevel} onValueChange={(v: any) => setFilterLevel(v)}>
                        <SelectTrigger id="filter-level">
                            <SelectValue placeholder="Sélectionner le niveau" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="tous">Tous (Collège & Lycée)</SelectItem>
                            <SelectItem value="college">Collège (&gt;= 14/20)</SelectItem>
                            <SelectItem value="lycee">Lycée (&gt;= 12/20)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="border border-border rounded-lg p-4 bg-muted/50">
                    <h4 className="font-medium mb-3 text-foreground">Résumé (1er Semestre) :</h4>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Nombre total d'élèves d'excellence :</span>
                            <span className="font-bold text-green-600">
                                {isLoadingAllData ? (
                                    <Loader2 className="w-3 h-3 animate-spin inline mr-1" />
                                ) : (
                                    topStudents.length
                                )}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground italic">
                            {filterLevel === "tous" && "Analyse toutes les classes (Collège >= 14, Lycée >= 12)."}
                            {filterLevel === "college" && "Analyse les classes du collège (Moyenne >= 14/20)."}
                            {filterLevel === "lycee" && "Analyse les classes du lycée (Moyenne >= 12/20)."}
                        </p>
                    </div>
                </div>

                <Button
                    onClick={generatePDF}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    size="lg"
                    disabled={isLoadingAllData || topStudents.length === 0}
                >
                    {isLoadingAllData ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Download className="w-4 h-4 mr-2" />
                    )}
                    Générer le Tableau d'Excellence
                </Button>
            </CardContent>
        </Card>
    );
};

export default TopStudentsListGenerator;
