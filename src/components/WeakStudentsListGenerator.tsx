import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Download, Loader2, AlertTriangle } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useToast } from "@/hooks/use-toast";
import { useGetClasseAverageOrAll } from "@/hooks/useAverage";
import { useGetSchool } from "@/hooks/useUsers";
import { useSchoolLogo } from "@/hooks/useSchoolLogo";

interface WeakStudent {
    id: string;
    nom: string;
    prenom: string;
    classe: string;
    moyenne: number;
}

const WeakStudentsListGenerator: React.FC = () => {
    const { toast } = useToast();
    const { data: schoolData } = useGetSchool();
    const logo = useSchoolLogo();
    const { data: allClassData, isLoading: isLoadingAllData } = useGetClasseAverageOrAll("allClass");
    const [weakStudents, setWeakStudents] = useState<WeakStudent[]>([]);

    useEffect(() => {
        if (allClassData && Array.isArray(allClassData)) {
            processAllData(allClassData);
        } else {
            setWeakStudents([]);
        }
    }, [allClassData]);

    const processAllData = (classes: any[]) => {
        const result: WeakStudent[] = [];

        // Manual students requested by the user
        const manualStudentsList = [
            { nom: "CARVALHO", prenom: "", classe: "Seconde", moyenne: 11 },
            { nom: "GADIAGA", prenom: "Sokhna Walo", classe: "Seconde", moyenne: 11 },
            { nom: "BLECK", prenom: "Ousmane", classe: "3ème", moyenne: 11 },
            { nom: "SOCÉ", prenom: "Awa", classe: "3ème", moyenne: 11 },
            { nom: "SALIH", prenom: "Ali", classe: "6ème", moyenne: 11 },
            { nom: "IBRAHIMA", prenom: "", classe: "TL2", moyenne: 11 },
            { nom: "BAH", prenom: "Ousmane", classe: "TL2", moyenne: 11 },
            { nom: "WADE", prenom: "", classe: "TL2", moyenne: 11 },
            { nom: "DIOP", prenom: "Aissatou", classe: "TS2", moyenne: 11 },
        ];

        const existingClasses = classes.map(c => c?.classe).filter(Boolean);

        // Map manual students to existing classes if possible
        const mappedManualStudents = manualStudentsList.map(ms => {
            // Find a class that starts with or contains the manual class name (e.g., "Seconde" matches "Seconde A")
            const matchedClass = existingClasses.find(c => {
                if (!c || typeof c !== 'string' || !ms.classe) return false;
                return c.toLowerCase().includes(ms.classe.toLowerCase()) ||
                    ms.classe.toLowerCase().includes(c.toLowerCase());
            });
            return {
                ...ms,
                classe: matchedClass || ms.classe // Use matched class or fallback to manual name
            };
        });

        classes.forEach((classData: any) => {
            const students = classData.studentsData || [];
            const currentClassName = classData.classe;

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

                // FILTER: Average <= 11
                if (avg <= 11) {
                    // Check if this student is already in manual list to avoid duplicates
                    // We check by name and mapped class
                    const isManual = mappedManualStudents.some(m =>
                    (m.nom.toUpperCase() === (student.lastName || "").toUpperCase() &&
                        m.prenom.toUpperCase() === (student.firstName || "").toUpperCase() &&
                        m.classe === currentClassName)
                    );

                    if (!isManual) {
                        result.push({
                            id: student.id,
                            nom: student.lastName || "Nom Inconnu",
                            prenom: student.firstName || "Prénom Inconnu",
                            classe: currentClassName,
                            moyenne: parseFloat(avg.toFixed(2)),
                        });
                    }
                }
            });
        });

        // Add manual students if they were not already added by logic
        mappedManualStudents.forEach(ms => {
            result.push({
                id: `manual-${ms.nom}-${ms.classe}`,
                ...ms
            });
        });

        // Sort by class then by name
        result.sort((a, b) => {
            if (a.classe !== b.classe) return a.classe.localeCompare(b.classe);
            return a.nom.localeCompare(b.nom);
        });

        setWeakStudents(result);
    };

    const generatePDF = () => {
        if (weakStudents.length === 0) {
            toast({
                title: "Aucun élève trouvé",
                description: "Aucun élève n'a une moyenne inférieure ou égale à 11 pour le 1er Semestre.",
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
            try { doc.addImage(logo, "PNG", pageWidth / 2 - 10, 5, 20, 20); } catch (e) { }
        }

        doc.setFontSize(8);
        doc.setFont(undefined, "normal");
        doc.text(`Année Scolaire: ${currentYear}`, pageWidth - 14, 10, { align: "right" });
        doc.text(`1er Semestre`, pageWidth - 14, 14, { align: "right" });

        // === TITLE ===
        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.text("LISTE DES ÉLÈVES EN DIFFICULTÉ (MOYENNE <= 11)", pageWidth / 2, 34, { align: "center" });
        doc.line(20, 36, pageWidth - 20, 36);

        doc.setFontSize(9);
        doc.text(`1er Semestre - Généré le: ${new Date().toLocaleDateString("fr-FR")}`, 14, 42);

        // Group by class
        const studentsByClass: { [key: string]: WeakStudent[] } = {};
        weakStudents.forEach(s => {
            if (!studentsByClass[s.classe]) studentsByClass[s.classe] = [];
            studentsByClass[s.classe].push(s);
        });

        let currentY = 48;
        const classes = Object.keys(studentsByClass).sort();

        classes.forEach((className, index) => {
            const classStudents = studentsByClass[className];

            // Add Class Title
            doc.setFontSize(10);
            doc.setFont(undefined, "bold");
            doc.text(`CLASSE : ${className}`, 14, currentY);
            currentY += 4;

            const tableBody = classStudents.map((s) => [
                `${s.nom.toUpperCase()} ${s.prenom}`,
                `${s.moyenne} / 20`
            ]);

            const dynamicFontSize = weakStudents.length > 35 ? 8 : 10;
            const dynamicPadding = weakStudents.length > 35 ? 1.5 : 2.5;

            autoTable(doc, {
                startY: currentY,
                head: [['Élève (Nom & Prénoms)', 'Moyenne Générale']],
                body: tableBody,
                headStyles: {
                    fillColor: [185, 28, 28],
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
                    lineWidth: 0.1
                },
                columnStyles: {
                    0: { cellWidth: 140 },
                    1: { cellWidth: 'auto', halign: 'center', textColor: [185, 28, 28] }
                },
                alternateRowStyles: {
                    fillColor: [254, 242, 242]
                },
                didParseCell: (data) => {
                    if (data.section === 'body' && (data.column.index === 0 || data.column.index === 1)) {
                        data.cell.styles.fontStyle = 'bold';
                    }
                },
                margin: { left: 14, right: 14, bottom: 10 },
                theme: 'striped',
                pageBreak: 'avoid'
            });

            currentY = (doc as any).lastAutoTable.finalY + 8;

            // If nearing end of page, and not last class, add page break
            if (currentY > 250 && index < classes.length - 1) {
                doc.addPage();
                currentY = 20;
            }
        });

        const signatureY = currentY > 265 ? 270 : currentY + 10;

        doc.setFontSize(10);
        doc.setFont(undefined, "bold");
        doc.text("Le Directeur des Études", 35, signatureY, { align: "center" });
        doc.text("Le Directeur Général", pageWidth - 35, signatureY, { align: "center" });

        doc.setFontSize(8);
        doc.setFont(undefined, "italic");
        doc.text(`Total : ${weakStudents.length} élèves en difficulté.`, 14, signatureY + 15);
        doc.save(`Eleves_en_Difficulte_S1_Moins_11.pdf`);
        toast({ title: "Liste générée", description: `${weakStudents.length} élèves inclus.` });
    };

    return (
        <Card className="bg-card border-border">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    Élèves en Difficulté ({"<="} 11)
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                    Liste globale des élèves avec une moyenne générale inférieure ou égale à 11
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="border border-border rounded-lg p-4 bg-muted/50">
                    <h4 className="font-medium mb-3 text-foreground">Résumé (1er Semestre) :</h4>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Nombre total d'élèves :</span>
                            <span className="font-bold text-red-600">
                                {isLoadingAllData ? (
                                    <Loader2 className="w-3 h-3 animate-spin inline mr-1" />
                                ) : (
                                    weakStudents.length
                                )}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground italic">
                            Analyse toutes les classes pour identifier les élèves ayant une moyenne de 11 ou moins.
                        </p>
                    </div>
                </div>

                <Button
                    onClick={generatePDF}
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                    size="lg"
                    disabled={isLoadingAllData || weakStudents.length === 0}
                >
                    {isLoadingAllData ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Download className="w-4 h-4 mr-2" />
                    )}
                    Générer la Liste des Difficultés
                </Button>
            </CardContent>
        </Card>
    );
};

export default WeakStudentsListGenerator;
