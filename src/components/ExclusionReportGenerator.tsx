import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2, UserX, FileText, ChevronDown, ChevronUp } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, AlignmentType, BorderStyle, HeadingLevel } from "docx";
import { useToast } from "@/hooks/use-toast";
import { useGetClasseAverageOrAll } from "@/hooks/useAverage";
import { useGetSchool } from "@/hooks/useUsers";
import { useSchoolLogo } from "@/hooks/useSchoolLogo";
import { calculatePeriodStats } from "@/utils/gradeUtils";

// ─── Constants ───────────────────────────────────────────────────────────────

const MOTIFS = [
    { id: "sous_moyenne", label: "Moyenne générale insuffisante" },
    { id: "perturbation", label: "Perturbation répétée de la classe" },
    { id: "non_participation", label: "Ne participe pas en classe" },
    { id: "mauvais_comportement", label: "Mauvais comportement général" },
    { id: "influence_negative", label: "Influence négative sur les autres élèves" },
    { id: "absenteisme", label: "Absentéisme répété et injustifié" },
    { id: "retards", label: "Retards répétés et injustifiés" },
] as const;

type MotifId = (typeof MOTIFS)[number]["id"];

const ABS_THRESHOLD = 4;
const RETARD_THRESHOLD = 5;

// ─── Hardcoded Non-Repris list ────────────────────────────────────────────────

const NON_REPRIS_SOURCE = [
    { prenom: "Alla", nom: "Sène", moyS1: 12.61, moyS2: 12.33, moyAn: 12.47, decision: "Admis en classe supérieure", entretienRequis: true },
    { prenom: "Abdoul Djalil", nom: "Souradji", moyS1: 11.02, moyS2: 11.21, moyAn: 11.12, decision: "Admis en classe supérieure", entretienRequis: true },
    { prenom: "Cheikh A. Mbacké", nom: "Ndiouck", moyS1: 11.49, moyS2: 11.00, moyAn: 11.25, decision: "Admis en classe supérieure", entretienRequis: true },
    { prenom: "Massamba", nom: "Kamara", moyS1: 11.12, moyS2: 10.85, moyAn: 10.98, decision: "Admis en classe supérieure", entretienRequis: true, classeOverride: "5ème" },
    { prenom: "Daour", nom: "Ndiaye", moyS1: 9.70, moyS2: 9.61, moyAn: 9.65, decision: "Autorisé à redoubler", entretienRequis: false, classeOverride: "5ème" },
    { prenom: "Ismaila", nom: "Barry", moyS1: 12.47, moyS2: 10.43, moyAn: 11.45, decision: "Admis en classe supérieure", entretienRequis: false },
    { prenom: "Ibrahima Der", nom: "Diallo", moyS1: 10.57, moyS2: 10.94, moyAn: 10.75, decision: "Admis en classe supérieure", entretienRequis: false },
    { prenom: "Salif", nom: "Diao", moyS1: 10.19, moyS2: 10.39, moyAn: 10.29, decision: "Admis en classe supérieure", entretienRequis: false },
    { prenom: "Alioune Oumar", nom: "Mbaye", moyS1: 8.41, moyS2: 9.50, moyAn: 8.96, decision: "Autorisé à redoubler L2", entretienRequis: false },
    { prenom: "Pape Amadou", nom: "Touré", moyS1: 13.78, moyS2: 11.57, moyAn: 12.68, decision: "Admis en classe supérieure", entretienRequis: true },
    { prenom: "Saliou", nom: "Ndiaye", moyS1: 8.48, moyS2: 8.26, moyAn: 8.37, decision: "Autorisé à redoubler", entretienRequis: false },
    { prenom: "Badiène Aly", nom: "Ngoné", moyS1: 11.15, moyS2: 8.87, moyAn: 10.01, decision: "Admise en classe supérieure", entretienRequis: false },
    { prenom: "Adja Ngoné", nom: "Niang", moyS1: 10.87, moyS2: 8.97, moyAn: 9.58, decision: "Autorisée à redoubler", entretienRequis: false },
    { prenom: "Fatim", nom: "Dieng", moyS1: 10.36, moyS2: 8.97, moyAn: 9.66, decision: "Autorisée à redoubler", entretienRequis: false },
    { prenom: "Mouhamed J.", nom: "Blain", moyS1: 7.92, moyS2: 7.58, moyAn: 7.75, decision: "Autorisé à redoubler", entretienRequis: false },
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface StudentExclusion {
    id: string;
    nom: string;
    prenom: string;
    classe: string;
    moyS1: number;
    moyS2: number;
    moyAn: number;
    decision: string;
    absences: number;
    retards: number;
    included: boolean;
    motifs: MotifId[];
    observation: string;
    showDetails: boolean;
    entretienRequis?: boolean;
}

// ─── Motifs Customization Helpers ───────────────────────────────────────────────

const isMassamba = (s: StudentExclusion) => s.nom.toLowerCase() === "kamara" && s.prenom.toLowerCase() === "massamba";
const isDaour = (s: StudentExclusion) => s.nom.toLowerCase() === "ndiaye" && s.prenom.toLowerCase() === "daour";
const isAlla = (s: StudentExclusion) => (s.nom.toLowerCase() === "sène" || s.nom.toLowerCase() === "sene") && s.prenom.toLowerCase() === "alla";
const isIsmaila = (s: StudentExclusion) => s.nom.toLowerCase() === "barry" && s.prenom.toLowerCase() === "ismaila";

// ─── Motif arguments ──────────────────────────────────────────────────────────

const MOTIF_ARGUMENTS: Record<MotifId, (s: StudentExclusion) => string> = {
    sous_moyenne: (s) => {
        if (isDaour(s)) {
            return `Votre enfant présente une moyenne générale annuelle de ${s.moyAn}/20 (1er Semestre : ${s.moyS1}/20 - 2e Semestre : ${s.moyS2}/20). Malgré les efforts d'accompagnement de l'équipe pédagogique, le niveau académique ne permet pas d'envisager une progression satisfaisante dans le cycle moyen, il a beaucoup de l'acune  accumulé dans les classes précédente`;
        }
        return `Votre enfant présente une moyenne générale annuelle de ${s.moyAn}/20 (1er Semestre : ${s.moyS1}/20 - 2e Semestre : ${s.moyS2}/20), inférieure au seuil minimum de 10/20 requis. Malgré les efforts d'accompagnement de l'équipe pédagogique, le niveau académique ne permet pas d'envisager une progression satisfaisante dans le cycle suivant.`;
    },
    perturbation: (s) =>
        `${s.prenom} ${s.nom.toUpperCase()} a fait l'objet de signalements répétés de la part des enseignants pour perturbation du déroulement des cours. Les interventions intempestives, les bavardages persistants et les comportements dérangeants ont nui au bon déroulement des activités pédagogiques et à la concentration des autres élèves.`,
    non_participation: (s) => {
        const isCheikh = s.nom.toLowerCase() === "ndiouck";
        if (isMassamba(s)) {
            return `L'équipe enseignante a constaté tout au long de l'année un manque de volonté manifeste dans le travail de ${s.prenom} ${s.nom.toUpperCase()} : refus de participer aux activités, absence de réponses lors des sollicitations orales, pas d'initiative dans les travaux de groupe, ne participe pas au cours, se couche sur la table, cahiers non tenus à jour. Ce manque d'implication et de motivation au travail traduisent une attitude négative vis-à-vis des apprentissages.`;
        }
        if (isDaour(s)) {
            return `L'équipe enseignante a constaté tout au long de l'année un manque de volonté manifeste dans le travail de ${s.prenom} ${s.nom.toUpperCase()} : ne participer pas aux activités, pas d'initiative dans les travaux de groupe. Ce manque d'implication et de motivation au travail traduisent une attitude négative vis-à-vis des apprentissages.`;
        }
        if (isCheikh) {
            return `L'équipe enseignante a constaté tout au long de l'année un manque de volonté manifeste au travail de ${s.prenom} ${s.nom.toUpperCase()} : pas d'initiative dans les travaux de groupe. Ce manque d'implication et de motivation au travail traduisent une attitude préoccupante vis-à-vis des apprentissages.`;
        }
        return `L'équipe enseignante a constaté tout au long de l'année un manque de volonté manifeste au travail de ${s.prenom} ${s.nom.toUpperCase()} : refus de participer aux activités, absence de réponses lors des sollicitations orales, pas d'initiative dans les travaux de groupe. Ce manque d'implication et de motivation au travail traduisent une attitude préoccupante vis-à-vis des apprentissages.`;
    },
    mauvais_comportement: (s) => {
        return `Le comportement général de ${s.prenom} ${s.nom.toUpperCase()} a été jugé peu correct. Des manquements répétés au règlement intérieur ont été relevés. Ces comportements, malgré les avertissements donnés, n'ont pas connu d'amélioration notable.`;
    },
    influence_negative: (s) => {
        if (isMassamba(s)) {
            return `${s.prenom} ${s.nom.toUpperCase()} exerce une influence néfaste sur ses camarades. Les bavardages qui déconcentrent ses camarades de sa part. Cette dynamique nuit à la cohésion et au travail collectif de la classe.`;
        }
        return `${s.prenom} ${s.nom.toUpperCase()} exerce une influence néfaste sur ses camarades. Cette dynamique nuit à la cohésion et au travail collectif de la classe.`;
    },
    absenteisme: (s) => {
        if (isMassamba(s)) {
            return `Un total de ${s.absences} journée(s) d'absence a été enregistré par les professeurs au cours de l'année scolaire 2025-2026. Ces absences répétées ont engendré des lacunes importantes dans le suivi du programme et compromettent la continuité des apprentissages, ce qui a impacté négativement ses performances scolaires.`;
        }
        return `Un total de ${s.absences} journée(s) d'absence a été enregistré par les professeurs au cours de l'année scolaire 2025-2026. Ces absences répétées, non justifiées, ont engendré des lacunes importantes dans le suivi du programme et compromettent la continuité des apprentissages.`;
    },
    retards: (s) => {
        if (isDaour(s)) {
            return `Beaucoup de retards ont été signalés par les enseignants`;
        }
        return `Beaucoup de retards ont été signalés par les enseignants. Ces retards répétés perturbent les cours, nuisent à l'organisation de la classe et témoignent d'un manque de rigueur dans l'organisation personnelle de l'élève.\nCe sont ces raisons qui expliquent les performances moyennes de ${s.prenom} ${s.nom.toUpperCase()} alors qu'il peut exceller dans beaucoup de matières.`;
    },
};

// ─── Auto-motif assignment ────────────────────────────────────────────────────

const autoMotifs = (s: { moyAn: number; absences: number; retards: number }): MotifId[] => {
    const motifs: MotifId[] = [];
    if (s.moyAn < 10) motifs.push("sous_moyenne");
    motifs.push("non_participation");
    motifs.push("mauvais_comportement");
    motifs.push("influence_negative");
    if (s.absences >= ABS_THRESHOLD) motifs.push("absenteisme");
    if (s.retards >= RETARD_THRESHOLD) motifs.push("retards");
    return motifs;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const normalize = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

const computeAvg = (grades: any[], period: "semestre1" | "semestre2"): number => {
    const stats = calculatePeriodStats(grades, period);
    return stats.totalCoef > 0 ? stats.average : 0;
};

const getTargetClass = (currentClass: string, decision: string) => {
    if (!currentClass) return "votre classe";
    const lowerD = (decision || "").toLowerCase();
    if (lowerD.includes("redouble") || lowerD.includes("autorise à redoubler") || lowerD.includes("autorisée à redoubler") || lowerD.includes("autorise a redoubler")) {
        return currentClass;
    }
    const maps: Record<string, string> = {
        "6ème": "5ème", "5ème": "4ème", "4ème": "3ème", "3ème": "Seconde",
        "Seconde": "Première", "Première": "Terminale",
        "6eme": "5ème", "5eme": "4ème", "4eme": "3ème", "3eme": "Seconde"
    };
    for (const [k, v] of Object.entries(maps)) {
        if (currentClass.includes(k)) {
            return currentClass.replace(k, v);
        }
    }
    return currentClass;
};

// ─── Component ───────────────────────────────────────────────────────────────

const ExclusionReportGenerator: React.FC = () => {
    const { toast } = useToast();
    const { data: schoolData } = useGetSchool();
    const logo = useSchoolLogo();

    const [selectedClassId, setSelectedClassId] = useState<string>("none");
    const [selectedPeriod, setSelectedPeriod] = useState<"semestre1" | "semestre2">("semestre1");
    const [dynStudents, setDynStudents] = useState<StudentExclusion[]>([]);
    const [nonReprisStudents, setNonReprisStudents] = useState<StudentExclusion[]>([]);

    const { data: allClassData, isLoading } = useGetClasseAverageOrAll("allClass");

    // ── Enrich non-repris from DB attendance ─────────────────────────────────
    useEffect(() => {
        const base: StudentExclusion[] = NON_REPRIS_SOURCE.map((src, i) => ({
            id: `nr-${i}`,
            nom: src.nom,
            prenom: src.prenom,
            classe: (src as any).classeOverride || "",
            moyS1: src.moyS1,
            moyS2: src.moyS2,
            moyAn: src.moyAn,
            decision: src.decision,
            absences: 0,
            retards: 0,
            included: true,
            motifs: autoMotifs({ moyAn: src.moyAn, absences: 0, retards: 0 }),
            observation: "",
            showDetails: false,
            entretienRequis: src.entretienRequis,
        }));

        if (!allClassData || !Array.isArray(allClassData)) { setNonReprisStudents(base); return; }

        const enriched = base.map((student) => {
            const normNom = normalize(student.nom);
            const normPrenom = normalize(student.prenom.split(" ")[0]);

            for (const classData of allClassData as any[]) {
                const found = (classData.studentsData || []).find((s: any) => {
                    const dbNom = normalize(s.lastName || "");
                    const dbPrenom = normalize((s.firstName || "").split(" ")[0]);
                    return dbNom === normNom ||
                        (dbPrenom === normPrenom && normNom.length >= 4 && dbNom.includes(normNom.substring(0, 4)));
                });
                if (found) {
                    const absSet = new Set<string>();
                    const retSet = new Set<string>();
                    (found.attendance || []).forEach((r: any) => {
                        const d = (r.date || "").split("T")[0];
                        if (r.type === "ABSCENCE") absSet.add(d);
                        if (r.type === "RETARD") retSet.add(d);
                    });
                    const absences = absSet.size;
                    const retards = retSet.size;
                    return {
                        ...student, id: found.id || student.id, classe: student.classe || classData.classe || "", absences, retards,
                        motifs: autoMotifs({ moyAn: student.moyAn, absences, retards })
                    };
                }
            }
            return student;
        });
        setNonReprisStudents(enriched);
    }, [allClassData]);

    // ── Build dynamic list ────────────────────────────────────────────────────
    useEffect(() => {
        if (!allClassData || !Array.isArray(allClassData) || selectedClassId === "none") { setDynStudents([]); return; }
        const classData = (allClassData as any[]).find((c) => c.classeId === selectedClassId);
        if (!classData) { setDynStudents([]); return; }

        const withStats = (classData.studentsData || []).map((s: any) => {
            const moyS1 = parseFloat(computeAvg(s.grades || [], "semestre1").toFixed(2));
            const moyS2 = parseFloat(computeAvg(s.grades || [], "semestre2").toFixed(2));
            const moyAn = parseFloat(((moyS1 + moyS2) / 2).toFixed(2));
            const absSet = new Set<string>();
            const retSet = new Set<string>();
            (s.attendance || []).forEach((r: any) => {
                const d = (r.date || "").split("T")[0];
                if (r.type === "ABSCENCE") absSet.add(d);
                if (r.type === "RETARD") retSet.add(d);
            });
            const absences = absSet.size;
            const retards = retSet.size;
            return {
                id: s.id,
                nom: s.lastName || "Nom Inconnu",
                prenom: s.firstName || "Prenom Inconnu",
                classe: classData.classe || "",
                moyS1, moyS2, moyAn, decision: "",
                absences, retards,
                included: moyAn < 10,
                motifs: autoMotifs({ moyAn, absences, retards }),
                observation: "", showDetails: false,
                entretienRequis: false,
            };
        });
        withStats.sort((a: any, b: any) => b.moyAn - a.moyAn);
        setDynStudents(withStats.filter((s: any) => s.moyAn < 10));
    }, [allClassData, selectedClassId, selectedPeriod]);

    // ── Helpers ───────────────────────────────────────────────────────────────

    const makeHelpers = (setter: React.Dispatch<React.SetStateAction<StudentExclusion[]>>) => ({
        toggleIncluded: (id: string) =>
            setter((prev) => prev.map((s) => s.id === id ? { ...s, included: !s.included } : s)),
        toggleMotif: (id: string, motif: MotifId) =>
            setter((prev) => prev.map((s) => {
                if (s.id !== id) return s;
                const has = s.motifs.includes(motif);
                return { ...s, motifs: has ? s.motifs.filter((m) => m !== motif) : [...s.motifs, motif] };
            })),
        setObservation: (id: string, value: string) =>
            setter((prev) => prev.map((s) => s.id === id ? { ...s, observation: value } : s)),
        toggleDetails: (id: string) =>
            setter((prev) => prev.map((s) => s.id === id ? { ...s, showDetails: !s.showDetails } : s)),
    });

    // ── PDF header ────────────────────────────────────────────────────────────

    const drawHeader = (doc: jsPDF, title: string) => {
        const pw = doc.internal.pageSize.getWidth();
        const schoolName = schoolData?.nom || "DAKAR LEADERS SCHOOL-DLS";
        doc.setFontSize(7); doc.setFont(undefined, "bold");
        doc.text("Republique du Senegal", 14, 10);
        doc.setFont(undefined, "normal");
        doc.text("Ministere de l'Education Nationale", 14, 13);
        doc.text("INSPECTION D'ACADEMIE DE DAKAR / IEF DES ALMADIES", 14, 16);
        doc.setFontSize(7.5); doc.setFont(undefined, "italic");
        doc.text("College Lycee de Reference Trilingue", 14, 20);
        doc.setFont(undefined, "bold");
        doc.text(schoolName, 14, 24);
        if (logo) { try { doc.addImage(logo, "PNG", pw / 2 - 10, 4, 20, 20); } catch (_) { } }
        doc.setFontSize(8); doc.setFont(undefined, "normal");
        doc.text("Annee Scolaire: 2025 - 2026", pw - 14, 10, { align: "right" });
        doc.text(`Genere le: ${new Date().toLocaleDateString("fr-FR")}`, pw - 14, 14, { align: "right" });
        doc.setFontSize(12); doc.setFont(undefined, "bold");
        doc.text(title, pw / 2, 32, { align: "center" });
        doc.setDrawColor(185, 28, 28); doc.setLineWidth(0.5);
        doc.line(14, 34, pw - 14, 34);
        doc.setDrawColor(0); doc.setLineWidth(0.2);
    };

    // ── PDF 1: Rapport institutionnel détaillé ───────────────────────────────

    const generateRapportPDF = (list: StudentExclusion[], label: string) => {
        const included = list.filter((s) => s.included);
        if (!included.length) { toast({ title: "Aucun eleve selectionne", variant: "destructive" }); return; }

        const doc = new jsPDF();
        const pw = doc.internal.pageSize.getWidth();
        drawHeader(doc, "RAPPORT DES ELEVES NON REPRIS / PROPOSES AU RENVOI");
        doc.setFontSize(9); doc.setFont(undefined, "normal");
        doc.text(`Effectif : ${included.length} eleve(s)  -  Annee Scolaire : 2025-2026`, 14, 40);

        autoTable(doc, {
            startY: 43,
            head: [["N", "Nom & Prenoms", "Classe", "Moy.1er Semestre", "Moy.2e Semestre", "Moy.An", "Decision", "Ass."]],
            body: included.map((s, idx) => [
                `${idx + 1}`, `${s.nom.toUpperCase()} ${s.prenom}`, s.classe || "-",
                `${s.moyS1}`, `${s.moyS2}`, `${s.moyAn}`, s.decision || "Non repris",
                [s.absences > 0 ? `Abs:${s.absences}j` : null, s.retards > 0 ? `Ret:${s.retards}` : null].filter(Boolean).join(" / ") || "-",
            ]),
            headStyles: { fillColor: [185, 28, 28], textColor: 255, fontSize: 7, fontStyle: "bold", halign: "center", cellPadding: 1.5 },
            bodyStyles: { fontSize: 7, cellPadding: 1.5, lineColor: [220, 220, 220], lineWidth: 0.1 },
            columnStyles: {
                0: { cellWidth: 6, halign: "center" }, 1: { cellWidth: 44, fontStyle: "bold" },
                2: { cellWidth: 20 }, 3: { cellWidth: 14, halign: "center" }, 4: { cellWidth: 14, halign: "center" },
                5: { cellWidth: 14, halign: "center", textColor: [185, 28, 28], fontStyle: "bold" },
                6: { cellWidth: 36 }, 7: { cellWidth: "auto", halign: "center" },
            },
            alternateRowStyles: { fillColor: [254, 242, 242] },
            margin: { left: 7, right: 7 },
            theme: "striped",
        });

        let y: number = (doc as any).lastAutoTable?.finalY + 10 || 120;

        included.forEach((s, idx) => {
            if (y > 230) { doc.addPage(); y = 20; }
            doc.setFontSize(10); doc.setFont(undefined, "bold");
            doc.setFillColor(254, 236, 236);
            doc.rect(7, y - 1, pw - 14, 8, "F");
            doc.text(`${idx + 1}. ${s.nom.toUpperCase()} ${s.prenom}  -  Classe : ${s.classe || "-"}  -  Moy. An. : ${s.moyAn}/20`, 10, y + 5);
            y += 10;

            s.motifs.forEach((mid) => {
                const motifLabel = MOTIFS.find((m) => m.id === mid)?.label || mid;
                const argText = MOTIF_ARGUMENTS[mid]?.(s) || "";
                if (y > 255) { doc.addPage(); y = 20; }
                doc.setFontSize(8.5); doc.setFont(undefined, "bold");
                doc.setTextColor(185, 28, 28);
                doc.text(`>> ${motifLabel}`, 12, y);
                doc.setTextColor(0);
                y += 5;
                if (argText) {
                    doc.setFont(undefined, "normal"); doc.setFontSize(8);
                    const lines = doc.splitTextToSize(argText, pw - 26);
                    if (y + lines.length * 4.5 > 270) { doc.addPage(); y = 20; }
                    doc.text(lines, 16, y);
                    y += lines.length * 4.5 + 2;
                }
            });

            if (s.observation.trim()) {
                if (y > 260) { doc.addPage(); y = 20; }
                doc.setFont(undefined, "italic"); doc.setFontSize(8);
                const obsLines = doc.splitTextToSize(`Obs. : ${s.observation}`, pw - 26);
                doc.text(obsLines, 16, y);
                y += obsLines.length * 4.5 + 2;
            }
            y += 5;
        });

        if (y > 250) { doc.addPage(); y = 20; }
        y += 10;
        doc.setFontSize(10); doc.setFont(undefined, "bold");
        doc.text("Le Directeur des Etudes", pw / 4, y, { align: "center" });
        doc.text("Le Directeur General", (pw * 3) / 4, y, { align: "center" });
        doc.setFont(undefined, "normal"); doc.setFontSize(8);
        doc.line(pw / 4 - 28, y + 18, pw / 4 + 28, y + 18);
        doc.line((pw * 3) / 4 - 28, y + 18, (pw * 3) / 4 + 28, y + 18);
        doc.text("Signature & Cachet", pw / 4, y + 21, { align: "center" });
        doc.text("Signature & Cachet", (pw * 3) / 4, y + 21, { align: "center" });

        doc.save(`Rapport_Non_Repris_${label}_2025-2026.pdf`);
        toast({ title: "Rapport genere", description: `${included.length} eleve(s) inclus.` });
    };

    // ── PDF 2: Lettres parents — UNE PAGE PAR ELEVE ──────────────────────────

    // ── PDF 2: Lettres parents — UNE PAGE PAR ELEVE ──────────────────────────

    const generateLettresPDF = (list: StudentExclusion[], label: string, type: "all" | "exclusion" | "entretien" = "all") => {
        let included = list.filter((s) => s.included);
        if (type === "exclusion") included = included.filter((s) => !s.entretienRequis);
        if (type === "entretien") included = included.filter((s) => s.entretienRequis);

        if (!included.length) { toast({ title: "Aucun eleve concerné", variant: "destructive" }); return; }

        const doc = new jsPDF();
        const pw = doc.internal.pageSize.getWidth();
        const ph = doc.internal.pageSize.getHeight(); // 297mm
        const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

        included.forEach((student, i) => {
            if (i > 0) doc.addPage();

            const schoolName = schoolData?.nom || "DAKAR LEADERS SCHOOL-DLS";

            if (isAlla(student)) {
                doc.setFontSize(7); doc.setFont(undefined, "bold");
                doc.text("République du Sénégal", 14, 10);
                doc.setFont(undefined, "normal");
                doc.text("Min. Éducation Nationale", 14, 14);
                doc.text("IA de DAKAR | IEF ALMADIES", 14, 18);
                doc.setFont(undefined, "italic");
                doc.text("Collège Lycée de Référence Trilingue", 14, 22);
                doc.setFont(undefined, "bold");
                doc.text(schoolName, 14, 26);
                if (logo) { try { doc.addImage(logo, "PNG", pw / 2 - 10, 6, 18, 18); } catch (_) { } }
                doc.setFontSize(7.5); doc.setFont(undefined, "normal");
                doc.text("Année Scolaire : 2025-2026", pw - 50, 10);
                doc.text("Dakar, le 15 juillet 2026", pw - 50, 14);

                doc.setFontSize(10); doc.setFont(undefined, "bold");
                doc.setFillColor(185, 28, 28);
                doc.rect(14, 32, pw - 28, 8, "F");
                doc.setTextColor(255, 255, 255);
                doc.text("LETTRE DE NON-RÉINSCRIPTION - NOTIFICATION AUX PARENTS / TUTEURS", pw / 2, 37.5, { align: "center" });
                doc.setTextColor(0);

                let y = 44;
                doc.setFillColor(254, 242, 242);
                doc.rect(14, y, pw - 28, 18, "F");
                doc.setDrawColor(185, 28, 28); doc.rect(14, y, pw - 28, 18, "S"); doc.setDrawColor(0);
                doc.setFontSize(10); doc.setFont(undefined, "bold");
                doc.text("Élève : SÈNE Alla", 18, y + 6);
                doc.setFont(undefined, "normal"); doc.setFontSize(8.5);
                doc.text("Classe :  5ème   |   Moy. 1er Semestre : 12.61/20   |   Moy. 2e Semestre : 12.33/20   |   Moy.An : 12.47/20", 18, y + 12);
                doc.text("Absences : 2 jours   |   Décision : Admis en classe supérieure", 18, y + 16.5);
                y += 24;

                doc.setFont(undefined, "bold"); doc.setFontSize(10);
                doc.text("Madame, Monsieur,", 14, y); y += 7;

                doc.setFont(undefined, "normal"); doc.setFontSize(9.5);
                const introLines = doc.splitTextToSize("Nous vous informons que, suite aux délibérations du conseil de classe de l'année scolaire 2025-2026, la réinscription de votre enfant Alla SÈNE en classe de  4ème est soumise à condition. Bien que l'exclusion définitive ne soit pas prononcée, l'élève et ses parents doivent obligatoirement passer et valider un entretien avec l'administration pour que son maintien soit accepté, pour les raisons suivantes :", pw - 28);
                doc.text(introLines, 14, y);
                y += introLines.length * 5 + 4;

                const mData = [
                    { t: "- Ne participe pas en classe :", d: "L'équipe enseignante a constaté tout au long de l'année un manque de volonté manifeste au travail de Alla SÈNE : refus de participer aux activités, absence de réponses lors des sollicitations orales, pas d'initiative dans les travaux de groupe. Ce manque d'implication et de motivation au travail traduisent une attitude préoccupante vis-à-vis des apprentissages." },
                    { t: "- Mauvais comportement général :", d: "Le comportement général de Alla SÈNE a été jugé peu correct. Des manquements répétés au règlement intérieur ont été relevés : irrespect envers les adultes, attitude provocatrice et refus d'autorité. Ces comportements, malgré les avertissements donnés, n'ont pas connu d'amélioration notable." },
                    { t: "- Influence négative sur les autres élèves :", d: "Alla SÈNE exerce une influence néfaste sur ses camarades.Il bavarde et déconcentre ses camarades, s'amuse beaucoup en classe." },
                ];
                mData.forEach(m => {
                    doc.setFont(undefined, "bold"); doc.setFontSize(9.5);
                    doc.setTextColor(185, 28, 28);
                    doc.text(m.t, 16, y);
                    doc.setTextColor(0);
                    y += 5.5;
                    doc.setFont(undefined, "normal"); doc.setFontSize(9);
                    const aLines = doc.splitTextToSize(m.d, pw - 34);
                    doc.text(aLines, 20, y);
                    y += aLines.length * 4.8 + 3;
                });

                y += 3;
                doc.setFont(undefined, "normal"); doc.setFontSize(9);
                const p2Lines = doc.splitTextToSize("Vous pouvez contacter le secrétariat de notre établissement dans un délai de dix (10) jours ouvrables à compter de la réception de la présente lettre.", pw - 28);
                doc.text(p2Lines, 14, y); y += p2Lines.length * 4.8 + 4;
                doc.text("Merci de votre compréhension.", 14, y); y += 12.8;

                const sigY = Math.min(y, ph - 45);
                doc.setFont(undefined, "bold"); doc.setFontSize(10);
                doc.text("Le Directeur des Études", pw / 4, sigY, { align: "center" });
                doc.text("Signature du Parent / Tuteur", (pw * 3) / 4, sigY, { align: "center" });
                doc.setFont(undefined, "normal"); doc.setFontSize(8);
                doc.text("(précédée de << Lu et approuvé >>)", (pw * 3) / 4, sigY + 5, { align: "center" });

                return;
            }

            if (isIsmaila(student)) {
                doc.setFontSize(7); doc.setFont(undefined, "bold");
                doc.text("République du Sénégal", 14, 10);
                doc.setFont(undefined, "normal");
                doc.text("Min. Éducation Nationale", 14, 14);
                doc.text("IA de DAKAR | IEF ALMADIES", 14, 18);
                doc.setFont(undefined, "italic");
                doc.text("Collège Lycée de Référence Trilingue", 14, 22);
                doc.setFont(undefined, "bold");
                doc.text(schoolName, 14, 26);
                if (logo) { try { doc.addImage(logo, "PNG", pw / 2 - 10, 6, 18, 18); } catch (_) { } }
                doc.setFontSize(7.5); doc.setFont(undefined, "normal");
                doc.text("Année Scolaire : 2025-2026", pw - 50, 10);
                doc.text("Dakar, le 15 juillet 2026", pw - 50, 14);

                doc.setFontSize(10); doc.setFont(undefined, "bold");
                doc.setFillColor(185, 28, 28);
                doc.rect(14, 32, pw - 28, 8, "F");
                doc.setTextColor(255, 255, 255);
                doc.text("LETTRE DE NON-RÉINSCRIPTION - NOTIFICATION AUX PARENTS / TUTEURS", pw / 2, 37.5, { align: "center" });
                doc.setTextColor(0);

                let y = 44;
                doc.setFillColor(254, 242, 242);
                doc.rect(14, y, pw - 28, 18, "F");
                doc.setDrawColor(185, 28, 28); doc.rect(14, y, pw - 28, 18, "S"); doc.setDrawColor(0);
                doc.setFontSize(10); doc.setFont(undefined, "bold");
                doc.text("Élève : BARRY Ismaila", 18, y + 6);
                doc.setFont(undefined, "normal"); doc.setFontSize(8.5);
                doc.text("Classe :  1er L2   |   Moy. 1er Semestre : 12.47/20   |   Moy. 2e Semestre : 10.43/20   |   Moy.An : 11.45/20", 18, y + 12);
                doc.text("Absences : 13 jours   |   Retards : 2   |   Décision : Admis en classe supérieure", 18, y + 16.5);
                y += 24;

                doc.setFont(undefined, "bold"); doc.setFontSize(10);
                doc.text("Madame, Monsieur,", 14, y); y += 7;

                doc.setFont(undefined, "normal"); doc.setFontSize(9.5);
                const introLines = doc.splitTextToSize("Nous vous informons que, suite aux délibérations du conseil de classe de l'année scolaire 2025-2026, la direction de notre établissement a décidé de ne pas procéder à la réinscription de votre enfant Ismaila BARRY, élève en classe de  1er L2, pour les raisons suivantes :", pw - 28);
                doc.text(introLines, 14, y);
                y += introLines.length * 5 + 4;

                const mData = [
                    { t: "- Mauvais comportement général :", d: "Le comportement général de Ismaila BARRY a été jugé peu correct. Des manquements répétés au règlement intérieur ont été relevés. Ces comportements, malgré les avertissements donnés, n'ont pas connu d'amélioration notable." },
                    { t: "- Influence négative sur les autres élèves :", d: "Ismaila BARRY exerce une influence néfaste sur ses camarades. Cette dynamique nuit à la cohésion et au travail collectif de la classe." },
                    { t: "- Absentéisme répété et injustifié :", d: "Un total de 13 journée(s) d'absence a été enregistré par les professeurs au cours de l'année scolaire 2025-2026. Ces absences répétées, non justifiées, ont engendré des lacunes importantes dans le suivi du programme et compromettent la continuité des apprentissages." },
                    { t: "- Perturbation répétée de la classe :", d: "Ismaila BARRY a fait l’objet de signalement répétés de la part des enseignants pour perturbation du déroulement des cours. Les interventions intempestives, les bavardages persistants et les comportements dérangeants ont nui au bon déroulement des activités pédagogiques et à la concentration des autres élèves." }
                ];
                mData.forEach(m => {
                    doc.setFont(undefined, "bold"); doc.setFontSize(9.5);
                    doc.setTextColor(185, 28, 28);
                    doc.text(m.t, 16, y);
                    doc.setTextColor(0);
                    y += 5.5;
                    doc.setFont(undefined, "normal"); doc.setFontSize(9);
                    const aLines = doc.splitTextToSize(m.d, pw - 34);
                    doc.text(aLines, 20, y);
                    y += aLines.length * 4.8 + 3;
                });

                y += 2;
                doc.setFont(undefined, "normal"); doc.setFontSize(9);
                const obsLines = doc.splitTextToSize("Au total le comportement de Ismaila BARRY ne cadre pas avec les valeurs et les ambitions de notre école.", pw - 28);
                doc.text(obsLines, 14, y); y += obsLines.length * 4.8 + 4;

                const p2Lines = doc.splitTextToSize("Vous pouvez contacter le secrétariat de notre établissement dans un délai de dix (10) jours ouvrables à compter de la réception de la présente lettre.", pw - 28);
                doc.text(p2Lines, 14, y); y += p2Lines.length * 4.8 + 4;
                doc.text("Merci de votre compréhension.", 14, y); y += 12.8;

                const sigY = Math.min(y, ph - 45);
                doc.setFont(undefined, "bold"); doc.setFontSize(10);
                doc.text("Le Directeur des Études", pw / 4, sigY, { align: "center" });
                doc.text("Signature du Parent / Tuteur", (pw * 3) / 4, sigY, { align: "center" });
                doc.setFont(undefined, "normal"); doc.setFontSize(8);
                doc.text("(précédée de << Lu et approuvé >>)", (pw * 3) / 4, sigY + 5, { align: "center" });

                return;
            }

            // Header (slightly larger and aligned correctly)
            doc.setFontSize(7); doc.setFont(undefined, "bold");
            doc.text("République du Sénégal", 14, 10);
            doc.setFont(undefined, "normal");
            doc.text("Min. Éducation Nationale", 14, 14);
            doc.text("IA de DAKAR | IEF ALMADIES", 14, 18);
            doc.setFont(undefined, "italic");
            doc.text("Collège Lycée de Référence Trilingue", 14, 22);
            doc.setFont(undefined, "bold");
            doc.text(schoolName, 14, 26);

            if (logo) { try { doc.addImage(logo, "PNG", pw / 2 - 10, 6, 18, 18); } catch (_) { } }

            doc.setFontSize(7.5); doc.setFont(undefined, "normal");
            doc.text("Année Scolaire : 2025-2026", pw - 50, 10);
            doc.text(`Dakar, le ${today}`, pw - 50, 14);

            // Title bar
            doc.setFontSize(10); doc.setFont(undefined, "bold");
            doc.setFillColor(185, 28, 28);
            doc.rect(14, 32, pw - 28, 8, "F");
            doc.setTextColor(255, 255, 255);
            let titleText = student.entretienRequis
                ? "CONVOCATION À UN ENTRETIEN PRÉALABLE DE RÉINSCRIPTION"
                : "LETTRE DE NON-RÉINSCRIPTION - NOTIFICATION AUX PARENTS / TUTEURS";
            if (isMassamba(student)) titleText = "DÉCISION NOTIFIÉE AUX PARENTS / TUTEURS";
            if (isAlla(student)) titleText = "LETTRE DE NON-RÉINSCRIPTION - NOTIFICATION AUX PARENTS / TUTEURS";

            doc.text(titleText, pw / 2, 37.5, { align: "center" });
            doc.setTextColor(0);

            // Info box
            let y = 44;
            doc.setFillColor(254, 242, 242);
            doc.rect(14, y, pw - 28, 18, "F");
            doc.setDrawColor(185, 28, 28); doc.rect(14, y, pw - 28, 18, "S"); doc.setDrawColor(0);
            doc.setFontSize(10); doc.setFont(undefined, "bold");
            doc.text(`Élève : ${student.nom.toUpperCase()} ${student.prenom}`, 18, y + 6);
            doc.setFont(undefined, "normal"); doc.setFontSize(8.5);
            const infoA = [student.classe && `Classe : ${student.classe}`, `Moy. 1er Semestre : ${student.moyS1}/20`, `Moy. 2e Semestre : ${student.moyS2}/20`, `Moy.An : ${student.moyAn}/20`].filter(Boolean).join("   |   ");
            const infoB = [student.absences > 0 && `Absences : ${student.absences} jours`, student.retards > 0 && `Retards : ${student.retards}`, `Décision : ${student.decision}`].filter(Boolean).join("   |   ");
            doc.text(infoA, 18, y + 12);
            doc.text(infoB, 18, y + 16.5);
            y += 24;

            // Salutation
            doc.setFont(undefined, "bold"); doc.setFontSize(10);
            doc.text("Madame, Monsieur,", 14, y); y += 7;

            // Intro
            doc.setFont(undefined, "normal"); doc.setFontSize(9.5);
            const targetClass = getTargetClass(student.classe, student.decision);
            const intro = student.entretienRequis
                ? `Nous vous informons que, suite aux délibérations du conseil de classe de l'année scolaire 2025-2026, la réinscription de votre enfant ${student.prenom} ${student.nom.toUpperCase()} en classe de ${targetClass} est soumise à condition. Bien que l'exclusion définitive ne soit pas prononcée, l'élève et ses parents doivent obligatoirement passer et valider un entretien avec l'administration pour que son maintien soit accepté, pour les raisons suivantes :`
                : `Nous vous informons que, suite aux délibérations du conseil de classe de l'année scolaire 2025-2026, la direction de notre établissement a décidé de ne pas procéder à la réinscription de votre enfant ${student.prenom} ${student.nom.toUpperCase()}, élève en classe de ${student.classe || "votre classe"}, pour les raisons suivantes :`;
            const introLines = doc.splitTextToSize(intro, pw - 28);
            doc.text(introLines, 14, y);
            y += introLines.length * 5 + 4;

            // Motifs + arguments
            student.motifs.forEach((mid) => {
                const motifLabel = MOTIFS.find((m) => m.id === mid)?.label || mid;
                const argText = MOTIF_ARGUMENTS[mid]?.(student) || "";

                doc.setFont(undefined, "bold"); doc.setFontSize(9.5);
                doc.setTextColor(185, 28, 28);
                doc.text(`- ${motifLabel} :`, 16, y);
                doc.setTextColor(0);
                y += 5.5;

                if (argText) {
                    doc.setFont(undefined, "normal"); doc.setFontSize(9);
                    const argLines = doc.splitTextToSize(argText, pw - 34);
                    doc.text(argLines, 20, y);
                    y += argLines.length * 4.8 + 3;
                }
            });

            // Observation
            if (student.observation.trim()) {
                y += 1;
                doc.setFont(undefined, "bold"); doc.setFontSize(9);
                doc.text("Observations :", 14, y); y += 4.5;
                doc.setFont(undefined, "italic");
                const obsLines = doc.splitTextToSize(student.observation, pw - 28);
                doc.text(obsLines, 18, y);
                y += obsLines.length * 4.8 + 3;
            }

            // Contact
            y += 3;
            doc.setFont(undefined, "normal"); doc.setFontSize(9);

            let para2 = `Vous pouvez contacter le secrétariat de notre établissement dans un délai de dix (10) jours ouvrables à compter de la réception de la présente lettre.`;
            if (isMassamba(student)) {
                para2 = `Vous pouvez contacter le secrétariat de notre établissement dans un délai de dix (10) jours ouvrables à compter de la réception de la présente lettre. Il y va de l'intérêt de l'enfant.`;
            } else if (isDaour(student)) {
                para2 = `Vous pouvez contacter le secrétariat de notre établissement dans un délai de dix (10) jours ouvrables à compter de la réception de la présente lettre.`;
            }

            const p2Lines = doc.splitTextToSize(para2, pw - 28);
            doc.text(p2Lines, 14, y); y += p2Lines.length * 4.8 + 4;

            // Formule de politesse
            let closing = `Merci de votre compréhension.`;
            const cLines = doc.splitTextToSize(closing, pw - 28);
            doc.text(cLines, 14, y); y += cLines.length * 4.8 + 8;

            // Signatures
            const sigY = Math.min(y, ph - 45); // Keep away from the bottom tear off
            doc.setFont(undefined, "bold"); doc.setFontSize(10);
            doc.text("Le Directeur des Études", pw / 4, sigY, { align: "center" });
            doc.text("Signature du Parent / Tuteur", (pw * 3) / 4, sigY, { align: "center" });
            doc.setFont(undefined, "normal"); doc.setFontSize(8);
            doc.text("(précédée de << Lu et approuvé >>)", (pw * 3) / 4, sigY + 5, { align: "center" });
            doc.line(pw / 4 - 30, sigY + 18, pw / 4 + 30, sigY + 18);
            doc.line((pw * 3) / 4 - 35, sigY + 18, (pw * 3) / 4 + 35, sigY + 18);

        });

        doc.save(`Lettres_Non_Repris_${label}_2025-2026.pdf`);
        toast({ title: "Lettres generees", description: `${included.length} lettre(s) - une page par eleve.` });
    };

    // ── WORD 1: Rapport institutionnel détaillé ───────────────────────────────

    const generateRapportWord = async (list: StudentExclusion[], label: string) => {
        const included = list.filter((s) => s.included);
        if (!included.length) { toast({ title: "Aucun eleve selectionne", variant: "destructive" }); return; }

        const schoolName = schoolData?.nom || "DAKAR LEADERS SCHOOL-DLS";

        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Republique du Senegal\n", bold: true, size: 14 }),
                            new TextRun({ text: "Ministere de l'Education Nationale\n", size: 14 }),
                            new TextRun({ text: "INSPECTION D'ACADEMIE DE DAKAR / IEF DES ALMADIES\n", size: 14 }),
                            new TextRun({ text: "College Lycee de Reference Trilingue\n", italics: true, size: 15 }),
                            new TextRun({ text: schoolName, bold: true, size: 16 }),
                        ],
                        alignment: AlignmentType.LEFT,
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Annee Scolaire: 2025 - 2026\n", size: 16 }),
                            new TextRun({ text: `Genere le: ${new Date().toLocaleDateString("fr-FR")}`, size: 16 }),
                        ],
                        alignment: AlignmentType.RIGHT,
                    }),
                    new Paragraph({
                        text: "RAPPORT DES ELEVES NON REPRIS / PROPOSES AU RENVOI",
                        heading: HeadingLevel.HEADING_2,
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 400, after: 400 }
                    }),
                    new Paragraph({
                        text: `Effectif : ${included.length} eleve(s)  -  Annee Scolaire : 2025-2026`,
                        spacing: { after: 200 }
                    }),
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: [
                            new TableRow({
                                children: ["N", "Nom & Prenoms", "Classe", "Moy.1er S.", "Moy.2e S.", "Moy.An", "Decision", "Ass."].map(t => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, size: 14 })] })] }))
                            }),
                            ...included.map((s, idx) => new TableRow({
                                children: [
                                    `${idx + 1}`,
                                    `${s.nom.toUpperCase()} ${s.prenom}`,
                                    s.classe || "-",
                                    `${s.moyS1}`,
                                    `${s.moyS2}`,
                                    `${s.moyAn}`,
                                    s.decision || "Non repris",
                                    [s.absences > 0 ? `Abs:${s.absences}j` : null, s.retards > 0 ? `Ret:${s.retards}` : null].filter(Boolean).join(" / ") || "-"
                                ].map(t => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t, size: 14 })] })] }))
                            }))
                        ]
                    }),
                    ...included.flatMap((s, idx) => {
                        const content = [
                            new Paragraph({
                                children: [new TextRun({ text: `${idx + 1}. ${s.nom.toUpperCase()} ${s.prenom}  -  Classe : ${s.classe || "-"}  -  Moy. An. : ${s.moyAn}/20`, bold: true, size: 20 })],
                                spacing: { before: 400, after: 200 }
                            }),
                            ...s.motifs.flatMap(mid => {
                                const motifLabel = MOTIFS.find((m) => m.id === mid)?.label || mid;
                                const argText = MOTIF_ARGUMENTS[mid]?.(s) || "";
                                return [
                                    new Paragraph({ children: [new TextRun({ text: `>> ${motifLabel}`, bold: true, color: "B91C1C", size: 18 })] }),
                                    new Paragraph({ children: [new TextRun({ text: argText, size: 16 })], spacing: { after: 200 } })
                                ];
                            })
                        ];
                        if (s.observation.trim()) {
                            content.push(new Paragraph({ children: [new TextRun({ text: `Obs. : ${s.observation}`, italics: true, size: 16 })], spacing: { after: 200 } }));
                        }
                        return content;
                    })
                ]
            }]
        });

        const blob = await Packer.toBlob(doc);
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Rapport_Non_Repris_${label}_2025-2026.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast({ title: "Rapport Word genere", description: `${included.length} eleve(s) inclus.` });
    };

    // ── WORD 2: Lettres parents ──────────────────────────────────────────────

    const generateLettresWord = async (list: StudentExclusion[], label: string, type: "all" | "exclusion" | "entretien" = "all") => {
        let included = list.filter((s) => s.included);
        if (type === "exclusion") included = included.filter((s) => !s.entretienRequis);
        if (type === "entretien") included = included.filter((s) => s.entretienRequis);

        if (!included.length) { toast({ title: "Aucun eleve concerné", variant: "destructive" }); return; }

        const schoolName = schoolData?.nom || "DAKAR LEADERS SCHOOL-DLS";
        const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

        const doc = new Document({
            sections: included.map((student) => {
                const targetClass = getTargetClass(student.classe, student.decision);

                if (isAlla(student)) {
                    return {
                        properties: {},
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({ text: "République du Sénégal\n", bold: true, size: 14 }),
                                    new TextRun({ text: "Min. Éducation Nationale\n", size: 14 }),
                                    new TextRun({ text: "IA de DAKAR | IEF ALMADIES\n", size: 14 }),
                                    new TextRun({ text: "Collège Lycée de Référence Trilingue\n", italics: true, size: 15 }),
                                    new TextRun({ text: schoolName, bold: true, size: 16 }),
                                ],
                                alignment: AlignmentType.LEFT,
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: "Année Scolaire : 2025-2026\n", size: 15 }),
                                    new TextRun({ text: "Dakar, le 15 juillet 2026", size: 15 }),
                                ],
                                alignment: AlignmentType.RIGHT,
                            }),
                            new Paragraph({
                                text: "LETTRE DE NON-RÉINSCRIPTION - NOTIFICATION AUX PARENTS / TUTEURS",
                                heading: HeadingLevel.HEADING_3,
                                alignment: AlignmentType.CENTER,
                                spacing: { before: 400, after: 400 }
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: "Élève : SÈNE Alla\n", bold: true, size: 18 }),
                                    new TextRun({ text: "Classe :  5ème   |   Moy. 1er Semestre : 12.61/20   |   Moy. 2e Semestre : 12.33/20   |   Moy.An : 12.47/20\n", size: 16 }),
                                    new TextRun({ text: "Absences : 2 jours   |   Décision : Admis en classe supérieure", size: 16 })
                                ],
                                spacing: { after: 400 }
                            }),
                            new Paragraph({ children: [new TextRun({ text: "Madame, Monsieur,", bold: true, size: 18 })], spacing: { after: 200 } }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: "Nous vous informons que, suite aux délibérations du conseil de classe de l'année scolaire 2025-2026, la réinscription de votre enfant Alla SÈNE en classe de  4ème est soumise à condition. Bien que l'exclusion définitive ne soit pas prononcée, l'élève et ses parents doivent obligatoirement passer et valider un entretien avec l'administration pour que son maintien soit accepté, pour les raisons suivantes :", size: 18 })
                                ],
                                spacing: { after: 200 }
                            }),
                            new Paragraph({ children: [new TextRun({ text: "- Ne participe pas en classe :", bold: true, color: "B91C1C", size: 18 })] }),
                            new Paragraph({ children: [new TextRun({ text: "L'équipe enseignante a constaté tout au long de l'année un manque de volonté manifeste au travail de Alla SÈNE : refus de participer aux activités, absence de réponses lors des sollicitations orales, pas d'initiative dans les travaux de groupe. Ce manque d'implication et de motivation au travail traduisent une attitude préoccupante vis-à-vis des apprentissages.", size: 18 })], spacing: { after: 200 } }),
                            new Paragraph({ children: [new TextRun({ text: "- Mauvais comportement général :", bold: true, color: "B91C1C", size: 18 })] }),
                            new Paragraph({ children: [new TextRun({ text: "Le comportement général de Alla SÈNE a été jugé peu correct. Des manquements répétés au règlement intérieur ont été relevés : irrespect envers les adultes, attitude provocatrice et refus d'autorité. Ces comportements, malgré les avertissements donnés, n'ont pas connu d'amélioration notable.", size: 18 })], spacing: { after: 200 } }),
                            new Paragraph({ children: [new TextRun({ text: "- Influence négative sur les autres élèves :", bold: true, color: "B91C1C", size: 18 })] }),
                            new Paragraph({ children: [new TextRun({ text: "Alla SÈNE exerce une influence néfaste sur ses camarades.Il bavarde et déconcentre ses camarades, s'amuse beaucoup en classe.", size: 18 })], spacing: { after: 200 } }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: "Vous pouvez contacter le secrétariat de notre établissement dans un délai de dix (10) jours ouvrables à compter de la réception de la présente lettre.", size: 18 })
                                ],
                                spacing: { after: 200 }
                            }),
                            new Paragraph({ children: [new TextRun({ text: "Merci de votre compréhension.", size: 18 })], spacing: { after: 600 } }),
                            new Table({
                                width: { size: 100, type: WidthType.PERCENTAGE },
                                borders: { top: { style: BorderStyle.NONE, size: 0 }, bottom: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 }, insideHorizontal: { style: BorderStyle.NONE, size: 0 }, insideVertical: { style: BorderStyle.NONE, size: 0 } },
                                rows: [
                                    new TableRow({
                                        children: [
                                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Le Directeur des Études", bold: true, size: 18 })], alignment: AlignmentType.CENTER })] }),
                                            new TableCell({
                                                children: [
                                                    new Paragraph({ children: [new TextRun({ text: "Signature du Parent / Tuteur", bold: true, size: 18 })], alignment: AlignmentType.CENTER }),
                                                    new Paragraph({ children: [new TextRun({ text: "(précédée de << Lu et approuvé >>)", size: 16 })], alignment: AlignmentType.CENTER })
                                                ]
                                            })
                                        ]
                                    })
                                ]
                            })
                        ]
                    };
                }

                if (isIsmaila(student)) {
                    return {
                        properties: {},
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({ text: "République du Sénégal\n", bold: true, size: 14 }),
                                    new TextRun({ text: "Min. Éducation Nationale\n", size: 14 }),
                                    new TextRun({ text: "IA de DAKAR | IEF ALMADIES\n", size: 14 }),
                                    new TextRun({ text: "Collège Lycée de Référence Trilingue\n", italics: true, size: 15 }),
                                    new TextRun({ text: schoolName, bold: true, size: 16 }),
                                ],
                                alignment: AlignmentType.LEFT,
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: "Année Scolaire : 2025-2026\n", size: 15 }),
                                    new TextRun({ text: "Dakar, le 15 juillet 2026", size: 15 }),
                                ],
                                alignment: AlignmentType.RIGHT,
                            }),
                            new Paragraph({
                                text: "LETTRE DE NON-RÉINSCRIPTION - NOTIFICATION AUX PARENTS / TUTEURS",
                                heading: HeadingLevel.HEADING_3,
                                alignment: AlignmentType.CENTER,
                                spacing: { before: 400, after: 400 }
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: "Élève : BARRY Ismaila\n", bold: true, size: 18 }),
                                    new TextRun({ text: "Classe :  1er L2   |   Moy. 1er Semestre : 12.47/20   |   Moy. 2e Semestre : 10.43/20   |   Moy.An : 11.45/20\n", size: 16 }),
                                    new TextRun({ text: "Absences : 13 jours   |   Retards : 2   |   Décision : Admis en classe supérieure", size: 16 })
                                ],
                                spacing: { after: 400 }
                            }),
                            new Paragraph({ children: [new TextRun({ text: "Madame, Monsieur,", bold: true, size: 18 })], spacing: { after: 200 } }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: "Nous vous informons que, suite aux délibérations du conseil de classe de l'année scolaire 2025-2026, la direction de notre établissement a décidé de ne pas procéder à la réinscription de votre enfant Ismaila BARRY, élève en classe de  1er L2, pour les raisons suivantes :", size: 18 })
                                ],
                                spacing: { after: 200 }
                            }),
                            new Paragraph({ children: [new TextRun({ text: "- Mauvais comportement général :", bold: true, color: "B91C1C", size: 18 })] }),
                            new Paragraph({ children: [new TextRun({ text: "Le comportement général de Ismaila BARRY a été jugé peu correct. Des manquements répétés au règlement intérieur ont été relevés. Ces comportements, malgré les avertissements donnés, n'ont pas connu d'amélioration notable.", size: 18 })], spacing: { after: 200 } }),
                            new Paragraph({ children: [new TextRun({ text: "- Influence négative sur les autres élèves :", bold: true, color: "B91C1C", size: 18 })] }),
                            new Paragraph({ children: [new TextRun({ text: "Ismaila BARRY exerce une influence néfaste sur ses camarades. Cette dynamique nuit à la cohésion et au travail collectif de la classe.", size: 18 })], spacing: { after: 200 } }),
                            new Paragraph({ children: [new TextRun({ text: "- Absentéisme répété et injustifié :", bold: true, color: "B91C1C", size: 18 })] }),
                            new Paragraph({ children: [new TextRun({ text: "Un total de 13 journée(s) d'absence a été enregistré par les professeurs au cours de l'année scolaire 2025-2026. Ces absences répétées, non justifiées, ont engendré des lacunes importantes dans le suivi du programme et compromettent la continuité des apprentissages.", size: 18 })], spacing: { after: 200 } }),
                            new Paragraph({ children: [new TextRun({ text: "- Perturbation répétée de la classe :", bold: true, color: "B91C1C", size: 18 })] }),
                            new Paragraph({ children: [new TextRun({ text: "Ismaila BARRY a fait l’objet de signalement répétés de la part des enseignants pour perturbation du déroulement des cours. Les interventions intempestives, les bavardages persistants et les comportements dérangeants ont nui au bon déroulement des activités pédagogiques et à la concentration des autres élèves.", size: 18 })], spacing: { after: 200 } }),
                            new Paragraph({ children: [new TextRun({ text: "Au total le comportement de Ismaila BARRY ne cadre pas avec les valeurs et les ambitions de notre école.", size: 18 })], spacing: { after: 400 } }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: "Vous pouvez contacter le secrétariat de notre établissement dans un délai de dix (10) jours ouvrables à compter de la réception de la présente lettre.", size: 18 })
                                ],
                                spacing: { after: 200 }
                            }),
                            new Paragraph({ children: [new TextRun({ text: "Merci de votre compréhension.", size: 18 })], spacing: { after: 600 } }),
                            new Table({
                                width: { size: 100, type: WidthType.PERCENTAGE },
                                borders: { top: { style: BorderStyle.NONE, size: 0 }, bottom: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 }, insideHorizontal: { style: BorderStyle.NONE, size: 0 }, insideVertical: { style: BorderStyle.NONE, size: 0 } },
                                rows: [
                                    new TableRow({
                                        children: [
                                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Le Directeur des Études", bold: true, size: 18 })], alignment: AlignmentType.CENTER })] }),
                                            new TableCell({
                                                children: [
                                                    new Paragraph({ children: [new TextRun({ text: "Signature du Parent / Tuteur", bold: true, size: 18 })], alignment: AlignmentType.CENTER }),
                                                    new Paragraph({ children: [new TextRun({ text: "(précédée de << Lu et approuvé >>)", size: 16 })], alignment: AlignmentType.CENTER })
                                                ]
                                            })
                                        ]
                                    })
                                ]
                            })
                        ]
                    };
                }

                return {
                    properties: {},
                    children: [
                        new Paragraph({
                            children: [
                                new TextRun({ text: "République du Sénégal\n", bold: true, size: 14 }),
                                new TextRun({ text: "Min. Éducation Nationale\n", size: 14 }),
                                new TextRun({ text: "IA de DAKAR | IEF ALMADIES\n", size: 14 }),
                                new TextRun({ text: "Collège Lycée de Référence Trilingue\n", italics: true, size: 15 }),
                                new TextRun({ text: schoolName, bold: true, size: 16 }),
                            ],
                            alignment: AlignmentType.LEFT,
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: "Année Scolaire : 2025-2026\n", size: 15 }),
                                new TextRun({ text: `Dakar, le ${today}`, size: 15 }),
                            ],
                            alignment: AlignmentType.RIGHT,
                        }),
                        new Paragraph({
                            text: isMassamba(student) ? "DÉCISION NOTIFIÉE AUX PARENTS / TUTEURS" :
                                isAlla(student) ? "LETTRE DE NON-RÉINSCRIPTION - NOTIFICATION AUX PARENTS / TUTEURS" :
                                    (student.entretienRequis ? "CONVOCATION À UN ENTRETIEN PRÉALABLE DE RÉINSCRIPTION" : "LETTRE DE NON-RÉINSCRIPTION - NOTIFICATION AUX PARENTS / TUTEURS"),
                            heading: HeadingLevel.HEADING_3,
                            alignment: AlignmentType.CENTER,
                            spacing: { before: 400, after: 400 }
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: `Élève : ${student.nom.toUpperCase()} ${student.prenom}\n`, bold: true, size: 18 }),
                                new TextRun({ text: [student.classe && `Classe : ${student.classe}`, `Moy. 1er Semestre : ${student.moyS1}/20`, `Moy. 2e Semestre : ${student.moyS2}/20`, `Moy.An : ${student.moyAn}/20`].filter(Boolean).join("   |   ") + "\n", size: 16 }),
                                new TextRun({ text: [student.absences > 0 && `Absences : ${student.absences} jours`, student.retards > 0 && `Retards : ${student.retards}`, `Décision : ${student.decision}`].filter(Boolean).join("   |   "), size: 16 })
                            ],
                            spacing: { after: 400 }
                        }),
                        new Paragraph({ children: [new TextRun({ text: "Madame, Monsieur,", bold: true, size: 18 })], spacing: { after: 200 } }),
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: student.entretienRequis
                                        ? `Nous vous informons que, suite aux délibérations du conseil de classe de l'année scolaire 2025-2026, la réinscription de votre enfant ${student.prenom} ${student.nom.toUpperCase()} en classe de ${targetClass} est soumise à condition. Bien que l'exclusion définitive ne soit pas prononcée, l'élève et ses parents doivent obligatoirement passer et valider un entretien avec l'administration pour que son maintien soit accepté, pour les raisons suivantes :`
                                        : `Nous vous informons que, suite aux délibérations du conseil de classe de l'année scolaire 2025-2026, la direction de notre établissement a décidé de ne pas procéder à la réinscription de votre enfant ${student.prenom} ${student.nom.toUpperCase()}, élève en classe de ${student.classe || "votre classe"}, pour les raisons suivantes :`, size: 18
                                })
                            ],
                            spacing: { after: 200 }
                        }),
                        ...student.motifs.flatMap(mid => {
                            const motifLabel = MOTIFS.find((m) => m.id === mid)?.label || mid;
                            const argText = MOTIF_ARGUMENTS[mid]?.(student) || "";
                            return [
                                new Paragraph({ children: [new TextRun({ text: `- ${motifLabel} :`, bold: true, color: "B91C1C", size: 18 })] }),
                                new Paragraph({ children: [new TextRun({ text: argText, size: 18 })], spacing: { after: 200 } })
                            ];
                        }),
                        ...(student.observation.trim() ? [
                            new Paragraph({ children: [new TextRun({ text: "Observations :", bold: true, size: 18 })] }),
                            new Paragraph({ children: [new TextRun({ text: student.observation, italics: true, size: 18 })], spacing: { after: 200 } })
                        ] : []),
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: isMassamba(student)
                                        ? `Vous pouvez contacter le secrétariat de notre établissement dans un délai de dix (10) jours ouvrables à compter de la réception de la présente lettre. Il y va de l'intérêt de l'enfant.`
                                        : `Vous pouvez contacter le secrétariat de notre établissement dans un délai de dix (10) jours ouvrables à compter de la réception de la présente lettre.`, size: 18
                                })
                            ],
                            spacing: { after: 200 }
                        }),
                        new Paragraph({ children: [new TextRun({ text: "Merci de votre compréhension.", size: 18 })], spacing: { after: 600 } }),
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            borders: {
                                top: { style: BorderStyle.NONE, size: 0 },
                                bottom: { style: BorderStyle.NONE, size: 0 },
                                left: { style: BorderStyle.NONE, size: 0 },
                                right: { style: BorderStyle.NONE, size: 0 },
                                insideHorizontal: { style: BorderStyle.NONE, size: 0 },
                                insideVertical: { style: BorderStyle.NONE, size: 0 }
                            },
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Le Directeur des Études", bold: true, size: 18 })], alignment: AlignmentType.CENTER })] }),
                                        new TableCell({
                                            children: [
                                                new Paragraph({ children: [new TextRun({ text: "Signature du Parent / Tuteur", bold: true, size: 18 })], alignment: AlignmentType.CENTER }),
                                                new Paragraph({ children: [new TextRun({ text: "(précédée de << Lu et approuvé >>)", size: 16 })], alignment: AlignmentType.CENTER })
                                            ]
                                        })
                                    ]
                                })
                            ]
                        })
                    ]
                };
            })
        });

        const blob = await Packer.toBlob(doc);
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Lettres_Non_Repris_${label}_2025-2026_${type}.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast({ title: "Lettres Word generees", description: `${included.length} lettre(s).` });
    };

    // ── Student List UI ───────────────────────────────────────────────────────

    const StudentListUI = ({
        students,
        setter,
        showMoyAn = false,
    }: {
        students: StudentExclusion[];
        setter: React.Dispatch<React.SetStateAction<StudentExclusion[]>>;
        showMoyAn?: boolean;
    }) => {
        const h = makeHelpers(setter);
        const included = students.filter((s) => s.included);
        if (!students.length) return null;

        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-foreground text-sm">{students.length} élève(s)</h4>
                    <Badge variant="destructive">{included.length} sélectionné(s)</Badge>
                </div>

                <div className="space-y-2">
                    {students.map((student) => (
                        <div
                            key={student.id}
                            className={`border rounded-lg overflow-hidden transition-all ${student.included
                                ? "border-red-300 bg-red-50/50 dark:bg-red-950/20"
                                : "border-border bg-muted/20 opacity-50"
                                }`}
                        >
                            <div className="flex items-center gap-3 px-4 py-3">
                                <Checkbox
                                    checked={student.included}
                                    onCheckedChange={() => h.toggleIncluded(student.id)}
                                    className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-foreground text-sm truncate">
                                        {student.nom.toUpperCase()} {student.prenom}
                                        {student.classe && <span className="text-muted-foreground font-normal ml-2 text-xs">— {student.classe}</span>}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                                        {student.entretienRequis && (
                                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-[10px] px-1.5 py-0 h-4">
                                                Entretien Requis
                                            </Badge>
                                        )}
                                        {showMoyAn && (
                                            <>
                                                <span className="text-xs text-muted-foreground">S1: <strong>{student.moyS1}</strong></span>
                                                <span className="text-xs text-muted-foreground">S2: <strong>{student.moyS2}</strong></span>
                                                <span className={`text-xs font-bold ${student.moyAn < 10 ? "text-red-600" : "text-orange-500"}`}>An: {student.moyAn}/20</span>
                                            </>
                                        )}
                                        {student.absences > 0 && <span className="text-xs text-orange-600 font-medium">Abs: {student.absences}j</span>}
                                        {student.retards > 0 && <span className="text-xs text-yellow-600 font-medium">Ret: {student.retards}x</span>}
                                        {student.decision && <span className="text-xs text-muted-foreground italic">{student.decision}</span>}
                                    </div>
                                </div>
                                {student.included && (
                                    <button onClick={() => h.toggleDetails(student.id)} className="text-muted-foreground hover:text-foreground p-1 transition-colors">
                                        {student.showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                )}
                            </div>

                            {student.included && student.showDetails && (
                                <div className="border-t border-red-200 dark:border-red-900 px-4 py-3 space-y-3 bg-white/60 dark:bg-black/20">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Motifs (modifiables)</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {MOTIFS.map((motif) => (
                                            <label key={motif.id} className="flex items-start gap-2 cursor-pointer group">
                                                <Checkbox
                                                    checked={student.motifs.includes(motif.id)}
                                                    onCheckedChange={() => h.toggleMotif(student.id, motif.id)}
                                                    className="mt-0.5 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                                                />
                                                <span className="text-sm text-foreground leading-snug group-hover:text-red-700 transition-colors">
                                                    {motif.label}
                                                    {motif.id === "absenteisme" && student.absences > 0 && <span className="ml-1 text-orange-500 text-xs">({student.absences}j)</span>}
                                                    {motif.id === "retards" && student.retards > 0 && <span className="ml-1 text-yellow-500 text-xs">({student.retards}x)</span>}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">Observations complémentaires</Label>
                                        <Textarea
                                            value={student.observation}
                                            onChange={(e) => h.setObservation(student.id, e.target.value)}
                                            placeholder="Ex: Comportement observé depuis le début de l'année…"
                                            className="text-sm resize-none h-16"
                                        />
                                    </div>
                                </div>
                            )}

                            {student.included && !student.showDetails && student.motifs.length > 0 && (
                                <div className="px-4 pb-3 flex flex-wrap gap-1">
                                    {student.motifs.map((m) => (
                                        <Badge key={m} variant="outline" className="text-xs text-red-700 border-red-300">
                                            {MOTIFS.find((mo) => mo.id === m)?.label}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm flex items-center justify-between">
                    <span className="text-muted-foreground">Sélectionnés :</span>
                    <span className="font-bold text-red-600">{included.length} / {students.length}</span>
                </div>
            </div>
        );
    };

    // ── Render ────────────────────────────────────────────────────────────────

    const nrIncluded = nonReprisStudents.filter((s) => s.included);
    const dynIncluded = dynStudents.filter((s) => s.included);
    const dynClassName = Array.isArray(allClassData)
        ? (allClassData as any[]).find((c) => c.classeId === selectedClassId)?.classe || ""
        : "";

    return (
        <Card className="bg-card border-border">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                    <UserX className="w-5 h-5 text-red-600" />
                    Rapport d'Exclusion / Élèves Non Repris
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                    Rapport institutionnel détaillé et lettres de notification aux parents (une page par élève).
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
                <Tabs defaultValue="non_repris">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="non_repris">
                            Liste Non Repris
                            <Badge variant="secondary" className="ml-2">{nonReprisStudents.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="sous_moyenne">Par classe (sous-moyenne)</TabsTrigger>
                    </TabsList>

                    <TabsContent value="non_repris" className="space-y-4 mt-4">
                        <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 px-4 py-2 text-sm text-amber-800 dark:text-amber-200">
                            <strong>11 élèves non reconduits</strong> — Conseil de classe 2025-2026.
                            Motifs auto-assignés : sous-moyenne si &lt; 10, absentéisme ≥ {ABS_THRESHOLD}j, retards ≥ {RETARD_THRESHOLD}x. Modifiables via ▼.
                        </div>
                        {isLoading && (
                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                <Loader2 className="w-4 h-4 animate-spin" /> Chargement des absences…
                            </div>
                        )}
                        <StudentListUI students={nonReprisStudents} setter={setNonReprisStudents} showMoyAn />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="flex flex-col gap-2">
                                <Button onClick={() => generateRapportPDF(nonReprisStudents, "Non_Repris")} disabled={!nrIncluded.length} className="bg-red-700 hover:bg-red-800 text-white" size="sm">
                                    <FileText className="w-4 h-4 mr-2" /> Rapport détaillé (PDF)
                                </Button>
                                <Button onClick={() => generateRapportWord(nonReprisStudents, "Non_Repris")} disabled={!nrIncluded.length} className="bg-blue-700 hover:bg-blue-800 text-white" size="sm">
                                    <FileText className="w-4 h-4 mr-2" /> Rapport détaillé (Word)
                                </Button>
                            </div>
                            <div className="flex flex-col gap-2">
                                <Button onClick={() => generateLettresPDF(nonReprisStudents, "Non_Repris", "exclusion")} disabled={!nrIncluded.some(s => !s.entretienRequis)} variant="outline" className="border-red-600 text-red-700 hover:bg-red-50 dark:hover:bg-red-950" size="sm">
                                    <Download className="w-4 h-4 mr-2" /> Lettres Exclusion (PDF)
                                </Button>
                                <Button onClick={() => generateLettresWord(nonReprisStudents, "Non_Repris", "exclusion")} disabled={!nrIncluded.some(s => !s.entretienRequis)} variant="outline" className="border-blue-600 text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950" size="sm">
                                    <Download className="w-4 h-4 mr-2" /> Lettres Exclusion (Word)
                                </Button>
                            </div>
                            <div className="flex flex-col gap-2">
                                <Button onClick={() => generateLettresPDF(nonReprisStudents, "Non_Repris", "entretien")} disabled={!nrIncluded.some(s => s.entretienRequis)} variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950" size="sm">
                                    <Download className="w-4 h-4 mr-2" /> Lettres Entretien (PDF)
                                </Button>
                                <Button onClick={() => generateLettresWord(nonReprisStudents, "Non_Repris", "entretien")} disabled={!nrIncluded.some(s => s.entretienRequis)} variant="outline" className="border-indigo-500 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950" size="sm">
                                    <Download className="w-4 h-4 mr-2" /> Lettres Entretien (Word)
                                </Button>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="sous_moyenne" className="space-y-4 mt-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label>Classe</Label>
                                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                                    <SelectTrigger><SelectValue placeholder="Sélectionner une classe" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">— Choisir une classe —</SelectItem>
                                        {Array.isArray(allClassData) && (allClassData as any[]).map((c) => (
                                            <SelectItem key={c.classeId} value={c.classeId}>{c.classe}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>Semestre</Label>
                                <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as any)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="semestre1">1er Semestre</SelectItem>
                                        <SelectItem value="semestre2">2ème Semestre</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        {isLoading && <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>}
                        {!isLoading && selectedClassId !== "none" && !dynStudents.length && (
                            <div className="text-center py-6 text-muted-foreground text-sm border border-dashed rounded-lg">Aucun élève sous la moyenne dans cette classe.</div>
                        )}
                        <StudentListUI students={dynStudents} setter={setDynStudents} showMoyAn />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="flex flex-col gap-2">
                                <Button onClick={() => generateRapportPDF(dynStudents, dynClassName.replace(/\s/g, "_") || "Classe")} disabled={isLoading || !dynIncluded.length} className="bg-red-700 hover:bg-red-800 text-white" size="sm">
                                    <FileText className="w-4 h-4 mr-2" /> Rapport détaillé (PDF)
                                </Button>
                                <Button onClick={() => generateRapportWord(dynStudents, dynClassName.replace(/\s/g, "_") || "Classe")} disabled={isLoading || !dynIncluded.length} className="bg-blue-700 hover:bg-blue-800 text-white" size="sm">
                                    <FileText className="w-4 h-4 mr-2" /> Rapport détaillé (Word)
                                </Button>
                            </div>
                            <div className="flex flex-col gap-2">
                                <Button onClick={() => generateLettresPDF(dynStudents, dynClassName.replace(/\s/g, "_") || "Classe", "exclusion")} disabled={isLoading || !dynIncluded.some(s => !s.entretienRequis)} variant="outline" className="border-red-600 text-red-700 hover:bg-red-50 dark:hover:bg-red-950" size="sm">
                                    <Download className="w-4 h-4 mr-2" /> Lettres Exclusion (PDF)
                                </Button>
                                <Button onClick={() => generateLettresWord(dynStudents, dynClassName.replace(/\s/g, "_") || "Classe", "exclusion")} disabled={isLoading || !dynIncluded.some(s => !s.entretienRequis)} variant="outline" className="border-blue-600 text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950" size="sm">
                                    <Download className="w-4 h-4 mr-2" /> Lettres Exclusion (Word)
                                </Button>
                            </div>
                            <div className="flex flex-col gap-2">
                                <Button onClick={() => generateLettresPDF(dynStudents, dynClassName.replace(/\s/g, "_") || "Classe", "entretien")} disabled={isLoading || !dynIncluded.some(s => s.entretienRequis)} variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950" size="sm">
                                    <Download className="w-4 h-4 mr-2" /> Lettres Entretien (PDF)
                                </Button>
                                <Button onClick={() => generateLettresWord(dynStudents, dynClassName.replace(/\s/g, "_") || "Classe", "entretien")} disabled={isLoading || !dynIncluded.some(s => s.entretienRequis)} variant="outline" className="border-indigo-500 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950" size="sm">
                                    <Download className="w-4 h-4 mr-2" /> Lettres Entretien (Word)
                                </Button>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
};

export default ExclusionReportGenerator;
