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
import { AlertTriangle, Download, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import { useToast } from "@/hooks/use-toast";
import { SchoolAverageDTO, useGetClasseAverage } from "@/hooks/useAverage";
import { useClasses, useGetSchool, useStudents } from "@/hooks/useUsers";
import { useSchoolLogo } from "@/hooks/useSchoolLogo";

interface DifficultyGrade {
    discipline: string;
    devoir: number;
    composition: number;
    moyenne: number;
    coefficient: number;
    moyenneCoef: number;
    rank: number;
    accompagnement: string;
}

interface DifficultyStudent {
    id: string;
    nom: string;
    prenom: string;
    dateNaissance: string;
    classe: string;
    nombreEleves: number;
    classeRedoublee: number;
    weakGrades: DifficultyGrade[];
    absences: number;
    retards: number;
    moyenneGenerale: number;
    rangGeneral: number;
    totalCoef: number;
    totalMoyenneCoef: number;
    dominantSubjects: string[];
}

interface DifficultyReportGeneratorProps {
    averageDto: SchoolAverageDTO;
}

const getAccompagnement = (discipline: string, moyenne: number): string => {
    const lower = discipline.toLowerCase();

    if (moyenne < 5) {
        if (lower.includes("math")) return "Niveau très critique. Reprise obligatoire des fondamentaux de l'arithmétique et des techniques calculatoires de base.";
        if (lower.includes("français") || lower.includes("orthographe") || lower.includes("grammaire"))
            return "Lacunes profondes en syntaxe et orthographe. Séances intensives de remédiation linguistique et lecture dirigée.";
        if (lower.includes("anglais")) return "Incompréhension structurelle. Nécessité de reconstruire les bases grammaticales et phonologiques.";
        if (lower.includes("philo")) return "Difficultés d'abstraction majeures. Travail de fond sur l'analyse conceptuelle et la structure de l'argumentation.";
        if (lower.includes("physi") || lower.includes("chimie") || lower.includes("pc"))
            return "Graves lacunes conceptuelles. Reprise des principes fondamentaux et des protocoles expérimentaux élémentaires.";
        if (lower.includes("svt") || lower.includes("bio")) return "Niveau très insuffisant. Renforcement impératif des connaissances biologiques de base et des méthodes d'observation.";
        if (lower.includes("histoire") || lower.includes("géo") || lower.includes("hg"))
            return "Déficit important de connaissances et de repères temporels/spatiaux. Travail de mémorisation structurée requis.";
        return "Niveau critique. Plan d'urgence requis : tutorat individuel et reprise systématique des bases de la discipline.";
    }

    if (moyenne < 8) {
        if (lower.includes("math")) return "Fragilité méthodologique. Besoin de renforcer la rigueur dans la résolution d'exercices d'application.";
        if (lower.includes("français") || lower.includes("orthographe") || lower.includes("grammaire"))
            return "Difficultés d'expression et de structuration. Travail sur la cohérence textuelle et l'enrichissement lexical.";
        if (lower.includes("anglais")) return "Compétences linguistiques limitées. Entraînement ciblé sur la compréhension orale et la syntaxe de base.";
        if (lower.includes("philo")) return "Bases méthodologiques fragiles. Entraînement à la problématisation et à l'exercice de la dissertation.";
        if (lower.includes("physi") || lower.includes("chimie") || lower.includes("pc"))
            return "Difficultés dans l'utilisation de l'outil mathématique et le raisonnement scientifique. Exercices pratiques requis.";
        if (lower.includes("svt") || lower.includes("bio")) return "Analyse insuffisante. Travail sur l'interprétation des données scientifiques et la rédaction de synthèses.";
        if (lower.includes("histoire") || lower.includes("géo") || lower.includes("hg"))
            return "Manque de précision dans l'analyse de documents. Renforcement de la méthodologie du commentaire et de la cartographie.";
        return "Lacunes méthodologiques identifiées. Soutien pédagogique recommandé pour stabiliser les acquis fondamentaux.";
    }

    // 8 <= moyenne < 10
    if (lower.includes("math")) return "Résultats insuffisants mais perfectibles. Consolidation nécessaire des acquis par une pratique régulière des exercices.";
    if (lower.includes("français") || lower.includes("orthographe") || lower.includes("grammaire"))
        return "Niveau juste. Amélioration attendue par une lecture plus soutenue et un soin particulier porté à la rédaction.";
    if (lower.includes("anglais")) return "Performance à améliorer. Pratique de l'expression écrite et enrichissement du vocabulaire idiômatique.";
    if (lower.includes("philo")) return "Efforts de reflexion à intensifier. Meilleure appropriation des concepts et des auteurs du programme.";
    if (lower.includes("physi") || lower.includes("chimie") || lower.includes("pc"))
        return "Acquis fragiles. Plus de rigueur dans l'apprentissage des lois et des formules est demandée.";
    if (lower.includes("svt") || lower.includes("bio")) return "Résultats à consolider. Amélioration souhaitée dans la rigueur du raisonnement biologique.";
    if (lower.includes("histoire") || lower.includes("géo") || lower.includes("hg"))
        return "Connaissances à approfondir. Travail sur la structuration des réponses et la précisison des localisations.";
    return "Proche de la moyenne. Un investissement plus régulier et une meilleure organisation du travail permettront de progresser.";
};

const DifficultyReportGenerator: React.FC<DifficultyReportGeneratorProps> = ({ averageDto }) => {
    const [selectedClass, setSelectedClass] = useState<string>("all");
    const [selectedPeriod, setSelectedPeriod] = useState<string>("semestre1");
    const { toast } = useToast();

    const { data: classesList } = useClasses();
    const { data: schoolData } = useGetSchool();
    const logo = useSchoolLogo();
    const { data: studentsList } = useStudents();
    const classReports = averageDto?.classAverages || [];

    const { data: classAverageData, isLoading: isLoadingClassData } = useGetClasseAverage(
        selectedClass !== "all" ? selectedClass : "",
    );

    const [difficultyStudents, setDifficultyStudents] = useState<DifficultyStudent[]>([]);

    useEffect(() => {
        if (selectedClass !== "all" && classAverageData && classesList) {
            processData(classAverageData);
        } else {
            setDifficultyStudents([]);
        }
    }, [selectedClass, classAverageData, classesList, selectedPeriod, studentsList]);

    const processData = (classData: any) => {
        const students = classData.studentsData || [];
        if (!students || students.length === 0) {
            setDifficultyStudents([]);
            return;
        }

        const isSemestre1 = selectedPeriod === "semestre1";

        // Process all students to compute averages
        const allStudentsProcessed = students.map((student: any) => {
            const relevantGrades = (student.grades || []).filter((g: any) => {
                if (!g.semestre) return false;
                return isSemestre1 ? g.semestre.includes("1") : g.semestre.includes("2");
            });

            const notesByDiscipline = new Map<string, any[]>();
            relevantGrades.forEach((n: any) => {
                const key = n.subject || n.discipline?.name || "Sans Nom";
                if (!notesByDiscipline.has(key)) notesByDiscipline.set(key, []);
                notesByDiscipline.get(key)!.push(n);
            });

            let totalCoef = 0;
            let totalMoyenneCoef = 0;
            const allGrades: DifficultyGrade[] = [];

            notesByDiscipline.forEach((discNotes, discName) => {
                const devoirs = discNotes.filter((n: any) => n.devoir);
                const compos = discNotes.filter((n: any) => !n.devoir || n.type === "Composition");

                const sumDevoir = devoirs.reduce((sum: number, n: any) => sum + n.grade, 0);
                const avgDevoir = devoirs.length > 0 ? sumDevoir / devoirs.length : 0;

                const sumCompo = compos.reduce((sum: number, n: any) => sum + n.grade, 0);
                const avgCompo = compos.length > 0 ? sumCompo / compos.length : 0;

                const coef = discNotes[0].coefficient || 1;

                if (devoirs.length > 0 || compos.length > 0) {
                    const moyenne = parseFloat(((avgDevoir + avgCompo) / 2).toFixed(2));
                    const moyenneCoef = parseFloat((moyenne * coef).toFixed(2));

                    totalCoef += coef;
                    totalMoyenneCoef += moyenneCoef;

                    allGrades.push({
                        discipline: discNotes[0].subject || "Matière",
                        devoir: parseFloat(avgDevoir.toFixed(2)),
                        composition: parseFloat(avgCompo.toFixed(2)),
                        moyenne,
                        coefficient: coef,
                        moyenneCoef,
                        rank: 0,
                        accompagnement: getAccompagnement(discNotes[0].subject || "", moyenne),
                    });
                }
            });

            const generalAvg = totalCoef > 0 ? parseFloat((totalMoyenneCoef / totalCoef).toFixed(2)) : 0;

            const absenceDays = new Set();
            const retardDays = new Set();
            (student.attendance || []).forEach((record: any) => {
                const date = record.date ? record.date.split("T")[0] : "";
                if (record.type === "ABSCENCE") absenceDays.add(date);
                if (record.type === "RETARD") retardDays.add(date);
            });

            return {
                ...student,
                computedGeneralAvg: generalAvg,
                computedTotalCoef: totalCoef,
                computedTotalMoyenneCoef: parseFloat(totalMoyenneCoef.toFixed(2)),
                computedGrades: allGrades,
                computedAbsences: absenceDays.size,
                computedRetards: retardDays.size,
            };
        });

        // Sort by general average for rank
        allStudentsProcessed.sort((a: any, b: any) => {
            if (b.computedGeneralAvg !== a.computedGeneralAvg) {
                return b.computedGeneralAvg - a.computedGeneralAvg;
            }
            return (a.lastName + a.firstName).localeCompare(b.lastName + b.firstName);
        });

        // Compute subject ranks
        const subjectScores = new Map<string, number[]>();
        allStudentsProcessed.forEach((s: any) => {
            s.computedGrades.forEach((g: DifficultyGrade) => {
                if (!subjectScores.has(g.discipline)) subjectScores.set(g.discipline, []);
                subjectScores.get(g.discipline)!.push(g.moyenne);
            });
        });
        subjectScores.forEach((scores) => scores.sort((a, b) => b - a));

        // Filter students with at least one subject < 10 and build data
        const result: DifficultyStudent[] = [];
        allStudentsProcessed.forEach((student: any, index: number) => {
            const prioritySubjects = [
                "recitation",
                "dictée",
                "orth-gramm",
                "orthographe",
                "grammaire",
                "tsq",
                "production ecrite",
                "production écrite",
            ];

            const getPriorityIndex = (discipline: string) => {
                const lowerDisc = discipline.toLowerCase();
                if (lowerDisc.includes("recitation") || lowerDisc.includes("récitation")) return 0;
                if (lowerDisc.includes("dictée")) return 1;
                if (lowerDisc.includes("orth") || lowerDisc.includes("gramm")) return 2;
                if (lowerDisc.includes("tsq")) return 3;
                if (lowerDisc.includes("production")) return 4;
                return 100;
            };

            const weakGrades = student.computedGrades
                .filter((g: DifficultyGrade) => g.moyenne < 10)
                .map((g: DifficultyGrade) => {
                    const scores = subjectScores.get(g.discipline) || [];
                    const rank = scores.indexOf(g.moyenne) + 1;
                    return {
                        ...g,
                        rank,
                        accompagnement: getAccompagnement(g.discipline, g.moyenne)
                    };
                })
                .sort((a, b) => {
                    const priorityA = getPriorityIndex(a.discipline);
                    const priorityB = getPriorityIndex(b.discipline);

                    if (priorityA !== priorityB) {
                        return priorityA - priorityB;
                    }

                    if (b.coefficient !== a.coefficient) {
                        return b.coefficient - a.coefficient;
                    }

                    return a.discipline.localeCompare(b.discipline);
                });

            if (weakGrades.length === 0) return;

            // Dominant subjects: Français + top 3 by coefficient among strong subjects
            const strongSubjects = student.computedGrades
                .filter((g: DifficultyGrade) => g.moyenne >= 10)
                .sort((a: DifficultyGrade, b: DifficultyGrade) => b.coefficient - a.coefficient);

            const dominants: string[] = [];
            const hasFrench = student.computedGrades.find(
                (g: DifficultyGrade) =>
                    g.moyenne >= 10 &&
                    (g.discipline.toLowerCase().includes("français") ||
                        g.discipline.toLowerCase().includes("francais"))
            );
            if (hasFrench) dominants.push(hasFrench.discipline);
            strongSubjects.forEach((g: DifficultyGrade) => {
                if (dominants.length < 4 && !dominants.includes(g.discipline)) {
                    dominants.push(g.discipline);
                }
            });

            const studentDetails = studentsList?.find((s: any) => s.id === student.id);
            const rawDob = student.dateOfBirth || studentDetails?.dateOfBirth;

            result.push({
                id: student.id,
                nom: student.lastName || "Nom Inconnu",
                prenom: student.firstName || "Prénom Inconnu",
                dateNaissance: rawDob ? new Date(rawDob).toLocaleDateString("fr-FR") : "",
                classe: classAverageData?.classe || "",
                nombreEleves: students.length,
                classeRedoublee: 0,
                weakGrades,
                absences: student.computedAbsences,
                retards: student.computedRetards,
                moyenneGenerale: student.computedGeneralAvg,
                rangGeneral: index + 1,
                totalCoef: weakGrades.reduce((s: number, g: DifficultyGrade) => s + g.coefficient, 0),
                totalMoyenneCoef: parseFloat(
                    weakGrades.reduce((s: number, g: DifficultyGrade) => s + g.moyenneCoef, 0).toFixed(2)
                ),
                dominantSubjects: dominants,
            });
        });

        setDifficultyStudents(result);
    };

    const formattedSchoolName = schoolData?.name
        ?.split("-")
        .map((word: string) => word[0]?.toUpperCase() + word.slice(1))
        .join(" ");

    const drawDifficultyReport = (doc: jsPDF, student: DifficultyStudent, isFirst: boolean) => {
        if (!isFirst) doc.addPage();

        const pageWidth = doc.internal.pageSize.getWidth();

        // === HEADER ===
        doc.setFontSize(8);
        doc.setFont(undefined, "bold");
        doc.text("République du Sénégal", 20, 10);
        doc.setFont(undefined, "normal");
        doc.text("Ministère de l'Éducation Nationale", 20, 14);
        doc.text("INSPECTION D’ACADÉMIE DE DAKAR", 20, 18);
        doc.text("IEF DES ALMADIES", 20, 22);

        doc.setFontSize(9);
        doc.setFont(undefined, "italic");
        doc.text("Collège Lycée Privé de Référence Trilingue", 20, 27);

        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.text("DAKAR LEADERS SCHOOL-DLS", 20, 32);

        if (logo) {
            try {
                doc.addImage(logo, "PNG", pageWidth / 2 - 15, 5, 30, 30);
            } catch (e) {
                console.error("Error adding logo:", e);
            }
        }

        // Right side
        doc.setFontSize(9);
        doc.setFont(undefined, "normal");
        doc.text("Année Scolaire: 2025 - 2026", pageWidth - 70, 15);
        doc.text(`${selectedPeriod === "semestre1" ? "1er" : "2ème"} Semestre`, pageWidth - 70, 22);

        // === TITLE ===
        doc.setFontSize(14);
        doc.setFont(undefined!, "bold");
        doc.text("RAPPORT DE SUIVI - ÉLÈVES EN DIFFICULTÉ", pageWidth / 2, 58, { align: "center" });
        doc.setDrawColor(0);
        doc.line(20, 60, pageWidth - 20, 60);

        // === STUDENT INFO ===
        let yPos = 70;
        doc.setFontSize(13);
        doc.setFont(undefined!, "bold");
        doc.text(`Prénoms:  ${student.prenom}`, 20, yPos);
        doc.text(`Nom:  ${student.nom}`, pageWidth - 80, yPos);


        yPos += 6;
        doc.setFontSize(9);
        doc.setFont(undefined!, "normal");
        doc.text(`Né(e) le: ${student.dateNaissance}`, 20, yPos);
        doc.text(`Classe:  ${student.classe}`, pageWidth - 80, yPos);

        yPos += 6;
        doc.text(`Nombre d'élèves:  ${student.nombreEleves}`, pageWidth - 80, yPos);

        yPos += 6;
        doc.text(`Classe Redoublée:  ${student.classeRedoublee}`, pageWidth - 80, yPos);

        // === RED SUBTITLE ===
        yPos += 10;
        doc.setTextColor(200, 0, 0);
        doc.setFontSize(9);
        doc.setFont(undefined!, "bold");
        doc.text("LISTE DES MATIÈRES AVEC MOYENNE INFÉRIEURE À 10/20", pageWidth / 2, yPos, {
            align: "center",
        });
        doc.setTextColor(0, 0, 0);

        // === TABLE ===
        yPos += 5;
        const tableLeft = 18;
        const tableRight = pageWidth - 18;
        const tableTop = yPos;

        const numGrades = student.weakGrades.length;
        const baseRowHeight = 10;
        const maxTableHeight = 100;
        const rowHeight =
            numGrades * baseRowHeight > maxTableHeight ? maxTableHeight / numGrades : baseRowHeight;
        const tableFontSize = rowHeight < 7 ? 7 : 8;

        const col = {
            discipline: 20,
            devoir: 68,
            comp: 83,
            moy: 98,
            coef: 113,
            moyx: 128,
            rang: 143,
            accomp: 156,
        };

        // Column midpoints for centering
        const colMid = {
            discipline: (col.discipline + col.devoir - 2) / 2,
            devoir: (col.devoir - 2 + col.comp - 2) / 2,
            comp: (col.comp - 2 + col.moy - 2) / 2,
            moy: (col.moy - 2 + col.coef - 2) / 2,
            coef: (col.coef - 2 + col.moyx - 2) / 2,
            moyx: (col.moyx - 2 + col.rang - 2) / 2,
            rang: (col.rang - 2 + col.accomp - 2) / 2,
            accomp: (col.accomp - 2 + tableRight) / 2,
        };

        // Header row
        doc.setFont(undefined!, "bold");
        doc.setFontSize(tableFontSize);
        doc.text("DISCIPLINES", colMid.discipline, yPos + 4, { align: "center" });
        doc.text("Devoir", colMid.devoir, yPos + 4, { align: "center" });
        doc.text("Comp", colMid.comp, yPos + 4, { align: "center" });
        doc.text("Moy/20", colMid.moy, yPos + 4, { align: "center" });
        doc.text("Coef", colMid.coef, yPos + 4, { align: "center" });
        doc.text("Moy x", colMid.moyx, yPos + 4, { align: "center" });
        doc.text("Rang", colMid.rang, yPos + 4, { align: "center" });
        doc.text("PLAN D'ACCOMPAGNEMENT", colMid.accomp, yPos + 4, { align: "center" });

        doc.line(tableLeft, yPos + 6, tableRight, yPos + 6);
        yPos += 6 + 2;

        // Data rows
        doc.setFont(undefined!, "normal");
        student.weakGrades.forEach((grade, idx) => {
            doc.setFont(undefined!, "bold"); // Bold for subjects
            const maxDiscWidth = col.devoir - col.discipline - 4;
            const discLines = doc.splitTextToSize(grade.discipline, maxDiscWidth);
            const discY = yPos + rowHeight / 2 - (discLines.length > 1 ? (discLines.length - 1) * 2 : 0);
            doc.text(discLines, colMid.discipline, discY, { align: "center" });

            doc.setFont(undefined!, "normal");
            
            // Add numerical values to columns
            const midY = yPos + rowHeight / 2 + 1;
            doc.text(grade.devoir.toString(), colMid.devoir, midY, { align: "center" });
            doc.text(grade.composition.toString(), colMid.comp, midY, { align: "center" });
            doc.text(grade.moyenne.toString(), colMid.moy, midY, { align: "center" });
            doc.text(grade.coefficient.toString(), colMid.coef, midY, { align: "center" });
            doc.text(grade.moyenneCoef.toString(), colMid.moyx, midY, { align: "center" });
            doc.text(`${grade.rank}${grade.rank === 1 ? "er" : "e"}`, colMid.rang, midY, { align: "center" });

            // Accompaniment text (wrap within column)
            const maxAccompWidth = tableRight - col.accomp - 3;
            const accompLines = doc.splitTextToSize(grade.accompagnement, maxAccompWidth);
            doc.setFontSize(tableFontSize - 1);
            const lineHeight = tableFontSize < 8 ? 3 : 3.5;
            const startAccompY = yPos + 2;
            accompLines.slice(0, 3).forEach((line: string, li: number) => {
                doc.text(line, col.accomp, startAccompY + li * lineHeight);
            });
            doc.setFontSize(tableFontSize);

            yPos += rowHeight;

            if (idx < student.weakGrades.length - 1) {
                doc.setDrawColor(200, 200, 200);
                doc.line(tableLeft, yPos, tableRight, yPos);
                doc.setDrawColor(0, 0, 0);
            }
        });

        const dataEndY = yPos;

        // Vertical lines
        const verticals = [
            tableLeft,
            col.devoir - 2,
            col.comp - 2,
            col.moy - 2,
            col.coef - 2,
            col.moyx - 2,
            col.rang - 2,
            col.accomp - 2,
            tableRight,
        ];
        verticals.forEach((x) => doc.line(x, tableTop, x, dataEndY));
        doc.line(tableLeft, tableTop, tableRight, tableTop);
        doc.line(tableLeft, dataEndY, tableRight, dataEndY);

        // === TOTAL ROW ===
        yPos += 6;
        doc.setFont(undefined!, "bold");
        doc.setFontSize(10);
        doc.text("TOTAL", col.discipline, yPos);

        // Total boxes
        doc.rect(col.coef - 2, yPos - 5, 15, 7);
        doc.text(student.totalCoef.toString(), col.coef + 5, yPos, { align: "center" });

        doc.rect(col.moyx - 2, yPos - 5, 18, 7);
        doc.text(student.totalMoyenneCoef.toString(), col.moyx + 7, yPos, { align: "center" });

        // === STAT BOXES ===
        yPos += 14;
        const boxHeight = 14;
        const boxWidth = 38;
        const statsGap = 4;

        const drawStatBox = (label: string, value: string, x: number, width: number) => {
            doc.rect(x, yPos - 8, width, boxHeight);
            doc.setFontSize(8);
            doc.text(label, x + width / 2, yPos - 3, { align: "center" });
            doc.setFontSize(10);
            doc.text(value, x + width / 2, yPos + 3, { align: "center" });
        };

        doc.setFont(undefined!, "bold");
        let currentX = col.discipline;
        const largeBoxHeight = 12;
        const largeBoxWidth = 38;

        const drawLargeStatBox = (label: string, value: string, x: number, width: number) => {
            doc.rect(x, yPos - 8, width, largeBoxHeight);
            doc.setFontSize(10); // Larger stats
            doc.text(label, x + 2, yPos + 1);
            doc.text(value, x + width - 12, yPos + 1, { align: "right" });
        };

        drawLargeStatBox("Moyenne:", `${student.moyenneGenerale}`, currentX, largeBoxWidth);
        currentX += largeBoxWidth + statsGap;
        drawLargeStatBox(
            "Rang:",
            `${student.rangGeneral}${student.rangGeneral === 1 ? "er" : "ème"}`,
            currentX,
            largeBoxWidth - 6
        );
        currentX += largeBoxWidth - 6 + statsGap;
        drawLargeStatBox("Retards:", `${student.retards}`, currentX, largeBoxWidth - 4);
        currentX += largeBoxWidth - 4 + statsGap;
        drawLargeStatBox("Absences:", `${student.absences}`, currentX, largeBoxWidth - 4);


        // === PLAN D'ACCOMPAGNEMENT ===
        yPos += 16;
        doc.setFont(undefined!, "bold");
        doc.setFontSize(11);
        doc.text("PLAN D'ACCOMPAGNEMENT PÉDAGOGIQUE ET RECOMMANDATIONS", pageWidth / 2, yPos, {
            align: "center",
        });

        yPos += 8;
        doc.setFont(undefined!, "normal");
        doc.setFontSize(9);

        const recommendations = [
            "• Renforcement des prérequis par des séances de soutien ciblé.",
            "• Mise en place d'un planning de révision structuré (30min/matière difficile).",
            "• Dialogue constant entre l'école et la famille pour monitorer les progrès.",
            "• Participation active aux séances de tutorat organisées par l'école.",
        ];

        recommendations.forEach((rec) => {
            doc.text(rec, 22, yPos);
            yPos += 6;
        });

        // === SIGNATURES ===
        yPos += 10;
        doc.setFont(undefined!, "bold");
        doc.setFontSize(9);
        doc.text('Signature du Parent (avec la mention « lu et approuvé »)', 20, yPos);
        doc.text("Le Directeur Des Etudes", pageWidth - 70, yPos);

        yPos += 3;
        doc.rect(20, yPos, 80, 20);

        // === NB ===
        yPos += 26;
        doc.setFont(undefined!, "bold");
        const nbSubjects =
            student.dominantSubjects.length > 0
                ? student.dominantSubjects.join(", ")
                : "les matières principales";
        doc.setTextColor(0, 0, 0);
        const nbText = `NB : L'élève sera retenu à la fin des cours pour des séances de révision surveillées dans les matières en question (${nbSubjects}).`;
        const nbLines = doc.splitTextToSize(nbText, pageWidth - 44);
        doc.text(nbLines, 22, yPos);
    };

    const generateReport = () => {
        if (difficultyStudents.length === 0) {
            toast({
                title: "Aucun élève en difficulté",
                description: "Aucun élève n'a de moyenne inférieure à 10/20 dans cette classe.",
            });
            return;
        }

        const doc = new jsPDF();
        difficultyStudents.forEach((student, index) => {
            drawDifficultyReport(doc, student, index === 0);
        });

        const className = classReports.find((c) => c.classeId === selectedClass)?.classe || selectedClass;
        doc.save(`Rapport_Difficulte_${className}_${selectedPeriod}.pdf`);

        toast({
            title: "Rapport généré",
            description: `${difficultyStudents.length} fiche(s) d'élèves en difficulté générée(s).`,
        });
    };

    return (
        <Card className="bg-card border-border">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    Rapport de Suivi - Élèves en Difficulté
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                    Générer le rapport PDF des élèves ayant une moyenne inférieure à 10/20 dans au moins une
                    matière
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="difficulty-period">Période</Label>
                        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="semestre1">1er Semestre</SelectItem>
                                <SelectItem value="semestre2">2ème Semestre</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label htmlFor="difficulty-class">Classe</Label>
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

                {/* Summary */}
                <div className="border border-border rounded-lg p-4 bg-muted/50">
                    <h4 className="font-medium mb-3 text-foreground">Contenu du rapport :</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div>
                            <Badge variant="outline">Matières {"<"} 10</Badge>
                            <p className="text-xs text-muted-foreground mt-1">Liste des matières en difficulté</p>
                        </div>
                        <div>
                            <Badge variant="outline">Plan d'accompagnement</Badge>
                            <p className="text-xs text-muted-foreground mt-1">Conseils personnalisés</p>
                        </div>
                        <div>
                            <Badge variant="outline">Statistiques</Badge>
                            <p className="text-xs text-muted-foreground mt-1">Moyenne, rang, assiduité</p>
                        </div>
                        <div>
                            <Badge variant="outline">Signatures</Badge>
                            <p className="text-xs text-muted-foreground mt-1">Parent + Chef d'établissement</p>
                        </div>
                    </div>
                </div>

                {/* Action */}
                <Button
                    onClick={generateReport}
                    className="w-full"
                    size="lg"
                    disabled={selectedClass === "all" || isLoadingClassData || difficultyStudents.length === 0}
                >
                    {isLoadingClassData ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Download className="w-4 h-4 mr-2" />
                    )}
                    Générer le Rapport Difficulté PDF
                </Button>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-border">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-orange-500">{difficultyStudents.length}</div>
                        <div className="text-sm text-muted-foreground">Élèves en difficulté</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                            {selectedClass !== "all"
                                ? classReports.find((c) => c.classeId === selectedClass)?.students || "-"
                                : "-"}
                        </div>
                        <div className="text-sm text-muted-foreground">Total élèves</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                            {selectedClass !== "all" && difficultyStudents.length > 0
                                ? `${Math.round(
                                    (difficultyStudents.length /
                                        (classReports.find((c) => c.classeId === selectedClass)?.students || 1)) *
                                    100
                                )}%`
                                : "-"}
                        </div>
                        <div className="text-sm text-muted-foreground">Taux de difficulté</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default DifficultyReportGenerator;
