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
import { FileText, Download, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import { useToast } from "@/hooks/use-toast";
import { SchoolAverageDTO, useGetClasseAverage } from "@/hooks/useAverage";
import { useClasses, useGetSchool, useStudents } from "@/hooks/useUsers";
import { useSchoolLogo } from "@/hooks/useSchoolLogo";
import { calculatePeriodStats, calculateSubjectAverage } from "@/utils/gradeUtils";

interface GradeData {
  discipline: string;
  devoir: number;
  composition: number;
  coefficient: number;
  appreciation: string;
  rank: number;
}

interface StudentBulletin {
  id: string;
  nom: string;
  prenom: string;
  dateNaissance: string;
  classe: string;
  classeRedoublee: number;
  nombreEleves: number;
  grades: GradeData[];
  absences: number;
  retards: number;
  moyenneGenerale: number;
  moyenneS1?: number;
  moyenneS2?: number;
  moyenneAnnuelle?: number;
  rangGeneral: number;
  totalCoef: number;
  totalMoyenneCoef: number;
}

interface BulletinGeneratorProps {
  averageDto: SchoolAverageDTO;
}

const BulletinGenerator: React.FC<BulletinGeneratorProps> = ({ averageDto }) => {
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

  const [studentsBulletins, setStudentsBulletins] = useState<StudentBulletin[]>([]);

  useEffect(() => {
    if (selectedClass !== "all" && classAverageData && classesList) {
      processData(classAverageData);
    } else {
      setStudentsBulletins([]);
    }
  }, [selectedClass, classAverageData, classesList, selectedPeriod, studentsList]);

  // Helper functions moved to gradeUtils

  const getSubjectAppreciation = (moyenne: number): string => {
    if (moyenne >= 18) return "Excellent travail";
    if (moyenne >= 16) return "Très bien";
    if (moyenne >= 14) return "Bien";
    if (moyenne >= 12) return "Assez bien";
    if (moyenne >= 10) return "Passable";
    if (moyenne >= 8) return "Insuffisant";
    return "Très insuffisant";
  };

  const processData = (classData: any) => {
    const students = classData.studentsData || [];
    if (!students || students.length === 0) {
      setStudentsBulletins([]);
      return;
    }

    const studentsWithStats = students.map((student: any) => {
      const statsS1 = calculatePeriodStats(student.grades, "semestre1");
      const statsS2 = calculatePeriodStats(student.grades, "semestre2");

      const currentStats = selectedPeriod === "semestre1" ? statsS1 : statsS2;

      let annualAvg = 0;
      if (statsS1.totalCoef > 0 && statsS2.totalCoef > 0) {
        annualAvg = (statsS1.average + statsS2.average) / 2;
      } else if (statsS1.totalCoef > 0) {
        annualAvg = statsS1.average;
      } else if (statsS2.totalCoef > 0) {
        annualAvg = statsS2.average;
      }

      const absenceDays = new Set();
      const retardDays = new Set();
      const attendanceRecords = student.attendance || student.school_attendances || student.attendances || [];
      attendanceRecords.forEach((record: any) => {
        const date = record.date ? record.date.split("T")[0] : "";
        if (record.type === "ABSCENCE") absenceDays.add(date);
        if (record.type === "RETARD") retardDays.add(date);
      });

      return {
        ...student,
        computedGeneralAvg: currentStats.average,
        computedTotalCoef: currentStats.totalCoef,
        computedTotalMoyenneCoef: currentStats.totalMoyenneCoef,
        computedGrades: currentStats.gradesData,
        computedAbsences: absenceDays.size,
        computedRetards: retardDays.size,
        moyenneS1: statsS1.average,
        moyenneS2: statsS2.average,
        moyenneAnnuelle: annualAvg,
      };
    });

    studentsWithStats.sort((a: any, b: any) => b.computedGeneralAvg - a.computedGeneralAvg);
    const subjectScores = new Map<string, number[]>();
    studentsWithStats.forEach((s: any) => {
      s.computedGrades.forEach((g: any) => {
        if (!subjectScores.has(g.discipline)) subjectScores.set(g.discipline, []);
        subjectScores.get(g.discipline)!.push(g.average);
      });
    });
    subjectScores.forEach((scores) => scores.sort((a, b) => b - a));

    const finalBulletins = studentsWithStats.map((student: any, index: number) => {
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

      const sortedGrades = [...student.computedGrades].sort((a, b) => {
        const priorityA = getPriorityIndex(a.discipline);
        const priorityB = getPriorityIndex(b.discipline);

        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        // Si ce ne sont pas des matières prioritaires, trier par coefficient (décroissant)
        if (b.coefficient !== a.coefficient) {
          return b.coefficient - a.coefficient;
        }

        // Enfin par nom
        return a.discipline.localeCompare(b.discipline);
      });

      const finalGrades = sortedGrades.map((g: any) => {
        const scores = subjectScores.get(g.discipline) || [];
        const rank = scores.indexOf(g.average) + 1;
        return {
          discipline: g.discipline,
          devoir: g.devoir,
          composition: g.composition,
          coefficient: g.coefficient,
          appreciation: getSubjectAppreciation(g.average),
          rank: rank,
        };
      });
      const studentDetails = studentsList?.find((s: any) => s.id === student.id);
      const rawDob = student.dateOfBirth || studentDetails?.dateOfBirth;

      return {
        id: student.id,
        nom: student.lastName || "Nom Inconnu",
        prenom: student.firstName || "Prénom Inconnu",
        dateNaissance: rawDob ? new Date(rawDob).toLocaleDateString() : "",
        classe: classAverageData.classe || "",
        classeRedoublee: 0,
        nombreEleves: students.length,
        grades: finalGrades,
        absences: student.computedAbsences,
        retards: student.computedRetards,
        moyenneGenerale: parseFloat(student.computedGeneralAvg.toFixed(2)),
        moyenneS1: parseFloat((student.moyenneS1 || 0).toFixed(2)),
        moyenneS2: parseFloat((student.moyenneS2 || 0).toFixed(2)),
        moyenneAnnuelle: parseFloat((student.moyenneAnnuelle || 0).toFixed(2)),
        rangGeneral: index + 1,
        totalCoef: student.computedTotalCoef,
        totalMoyenneCoef: parseFloat(student.computedTotalMoyenneCoef.toFixed(2)),
      };
    });

    setStudentsBulletins(finalBulletins);
  };

  const drawBulletin = (doc: jsPDF, student: StudentBulletin, isFirst: boolean) => {
    if (!isFirst) doc.addPage();
    const pageWidth = doc.internal.pageSize.getWidth();

    // En-tête école amélioré
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

    doc.setFontSize(9);
    doc.setFont(undefined, "normal");
    doc.text("Année Scolaire: 2025 - 2026", pageWidth - 70, 15);
    doc.text(`${selectedPeriod === "semestre1" ? "1er" : "2ème"} Semestre`, pageWidth - 70, 22);

    doc.setFontSize(14);
    doc.setFont(undefined, "bold");
    doc.text("BULLETIN DE COMPOSITION", pageWidth / 2, 40, { align: "center" });
    doc.line(20, 42, pageWidth - 20, 42);

    // Informations élève - Plus grand et Gras
    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text(`Prénoms: ${student.prenom}`, 20, 50);
    doc.text(`Nom:  ${student.nom}`, pageWidth - 90, 50);

    doc.setFont(undefined, "normal");
    doc.setFontSize(9);
    doc.text(`Né (e) le  ${student.dateNaissance}`, 20, 57);
    doc.text(`Classe:  ${student.classe}`, pageWidth - 90, 57);
    doc.text(`Nombre d'élèves  ${student.nombreEleves}`, pageWidth - 90, 64);
    doc.text(`Classe Redoublée  ${student.classeRedoublee}`, pageWidth - 90, 71);

    // Tableau des notes
    let yPos = 80;
    doc.setFont(undefined, "bold");
    doc.setFontSize(8);
    const colPositions = { discipline: 20, devoir: 70, comp: 85, moy: 100, coef: 118, moyCoef: 132, rang: 148, appreciation: 160 };
    const tableTop = yPos - 3;
    const tableLeft = 18;
    const tableRight = pageWidth - 18;

    doc.text("DISCIPLINES", colPositions.discipline, yPos);
    doc.text("Devoir", colPositions.devoir, yPos);
    doc.text("Comp", colPositions.comp, yPos);
    doc.text("Moy/20", colPositions.moy, yPos);
    doc.text("Coef", colPositions.coef, yPos);
    doc.text("Moy x", colPositions.moyCoef, yPos);
    doc.text("Rang", colPositions.rang, yPos);
    doc.text("Appréciations", colPositions.appreciation, yPos);
    doc.line(tableLeft, yPos + 2, tableRight, yPos + 2);
    yPos += 8;

    student.grades.forEach((grade, index) => {
      const { moyenne, moyenneCoef } = calculateSubjectAverage(grade.devoir, grade.composition, grade.coefficient);
      const discWidth = colPositions.devoir - colPositions.discipline - 4;
      const discLines = doc.splitTextToSize(grade.discipline, discWidth);
      const discY = yPos - (discLines.length > 1 ? (discLines.length - 1) * 1.5 : 0);

      doc.setFont(undefined, "bold"); // Disciplines en gras
      doc.text(discLines, colPositions.discipline + discWidth / 2, discY, { align: "center" });

      doc.setFont(undefined, "normal");
      doc.text(grade.devoir.toString(), colPositions.devoir, yPos);
      doc.text(grade.composition.toString(), colPositions.comp, yPos);
      doc.text(moyenne.toString(), colPositions.moy, yPos);
      doc.text(grade.coefficient.toString(), colPositions.coef, yPos);
      doc.text(moyenneCoef.toString(), colPositions.moyCoef, yPos);
      doc.text(`${grade.rank}${grade.rank === 1 ? "er" : "e"}`, colPositions.rang, yPos);

      const appreciationText = grade.appreciation || "";
      const appreciationMaxWidth = tableRight - colPositions.appreciation - 2;
      const appreciationLines = doc.splitTextToSize(appreciationText, appreciationMaxWidth);
      doc.text(appreciationLines[0] || "", colPositions.appreciation, yPos);

      const currentRowHeight = Math.max(7, discLines.length * 4);
      yPos += currentRowHeight;

      if (index < student.grades.length - 1) {
        doc.setDrawColor(200, 200, 200);
        doc.line(tableLeft, yPos - (currentRowHeight / 2), tableRight, yPos - (currentRowHeight / 2));
        doc.setDrawColor(0, 0, 0);
      }
    });

    const endDataY = yPos - 3.5;
    const verticalLines = [tableLeft, colPositions.devoir - 2, colPositions.comp - 2, colPositions.moy - 2, colPositions.coef - 2, colPositions.moyCoef - 2, colPositions.rang - 2, colPositions.appreciation - 2, tableRight];
    verticalLines.forEach((x) => doc.line(x, tableTop, x, endDataY));
    doc.line(tableLeft, tableTop, tableRight, tableTop);
    doc.line(tableLeft, endDataY, tableRight, endDataY);

    yPos += 5;
    doc.setFont(undefined, "bold");
    doc.text("TOTAL", colPositions.discipline, yPos);
    doc.rect(colPositions.coef - 2, yPos - 4, 12, 6);
    doc.text(student.totalCoef.toString(), colPositions.coef, yPos);
    doc.rect(colPositions.moyCoef - 2, yPos - 4, 14, 6);
    doc.text(student.totalMoyenneCoef.toString(), colPositions.moyCoef, yPos);

    yPos += 15;
    // --- BOXED STATS --- Plus grand
    const boxHeight = 12;
    const boxWidth = 38;
    const startX = colPositions.discipline;
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    if (selectedPeriod === "semestre2") {
      // Affichage pour le Semestre 2
      const boxWidth2 = 45;
      const s1X = startX;
      doc.rect(s1X, yPos - 6, boxWidth2, boxHeight);
      doc.text("Semestre 1:", s1X + 2, yPos + 1);
      doc.text(`${student.moyenneS1} /20`, s1X + 26, yPos + 1);

      const s2X = s1X + boxWidth2 + 4;
      doc.rect(s2X, yPos - 6, boxWidth2, boxHeight);
      doc.text("Semestre 2:", s2X + 2, yPos + 1);
      doc.text(`${student.moyenneS2} /20`, s2X + 26, yPos + 1);

      const generalX = s2X + boxWidth2 + 4;
      const generalBoxWidth = 50;
      doc.rect(generalX, yPos - 6, generalBoxWidth, boxHeight);
      doc.text("Moyenne Annuelle:", generalX + 2, yPos + 1);
      doc.text(`${student.moyenneAnnuelle} /20`, generalX + 34, yPos + 1);

      const rangX2 = generalX + generalBoxWidth + 4;
      doc.rect(rangX2, yPos - 6, boxWidth2 - 15, boxHeight);
      doc.text("Rang:", rangX2 + 2, yPos + 1);
      doc.text(`${student.rangGeneral}${student.rangGeneral === 1 ? "er" : "ème"}`, rangX2 + 15, yPos + 1);

      yPos += boxHeight + 2;
      const retardsX2 = startX;
      doc.rect(retardsX2, yPos - 6, boxWidth, boxHeight);
      doc.text("Retards:", retardsX2 + 2, yPos + 1);
      doc.text(`${student.retards}`, retardsX2 + 22, yPos + 1);

      const absencesX2 = retardsX2 + boxWidth + 4;
      doc.rect(absencesX2, yPos - 6, boxWidth, boxHeight);
      doc.text("Absences:", absencesX2 + 2, yPos + 1);
      doc.text(`${student.absences}`, absencesX2 + 24, yPos + 1);
    } else {
      // Affichage standard pour le Semestre 1
      doc.rect(startX, yPos - 6, boxWidth, boxHeight);
      doc.text("Moyenne:", startX + 2, yPos + 1);
      doc.text(`${student.moyenneGenerale} /20`, startX + 22, yPos + 1);

      const rangX = startX + boxWidth + 5;
      doc.rect(rangX, yPos - 6, boxWidth - 8, boxHeight);
      doc.text("Rang:", rangX + 2, yPos + 1);
      doc.text(`${student.rangGeneral}${student.rangGeneral === 1 ? "er" : "ème"}`, rangX + 17, yPos + 1);

      const retardsX = rangX + boxWidth - 8 + 5;
      doc.rect(retardsX, yPos - 6, boxWidth - 5, boxHeight);
      doc.text("Retards:", retardsX + 2, yPos + 1);
      doc.text(`${student.retards}`, retardsX + 22, yPos + 1);

      const absencesX = retardsX + boxWidth - 5 + 5;
      doc.rect(absencesX, yPos - 6, boxWidth - 2, boxHeight);
      doc.text("Absences:", absencesX + 2, yPos + 1);
      doc.text(`${student.absences}`, absencesX + 24, yPos + 1);
    }

    yPos += 20;
    doc.setFontSize(8);
    const checkBoxHeight = 6;
    const textColWidth = 50;
    const checkColWidth = 8;
    const leftItems = selectedPeriod === "semestre2"
      ? ["Admis(e) en classe supérieure", "Autorisé(e) à redoubler", "Exclusion"]
      : ["Satisfaisant, doit continuer", "Peut mieux faire", "Passable", "Insuffisant"];
    const rightItems = ["Félicitations", "Encouragements", "Tableau d'honneur", "Avertissement", "Blâme"];

    const drawChecklistTable = (x: number, y: number, items: string[]) => {
      items.forEach((item, i) => {
        const curY = y + i * checkBoxHeight;
        doc.rect(x, curY, textColWidth, checkBoxHeight);
        doc.text(item, x + 2, curY + 4);
        doc.rect(x + textColWidth, curY, checkColWidth, checkBoxHeight);
      });
    };

    drawChecklistTable(20, yPos, leftItems);
    drawChecklistTable(pageWidth - 70, yPos, rightItems);

    yPos += Math.max(leftItems.length, rightItems.length) * checkBoxHeight + 10;
    doc.setFont(undefined, "bold");
    doc.text("Observations du conseil des professeurs", 20, yPos);
    doc.rect(20, yPos + 3, 90, 20);

    // Case d'observations vide

    doc.setFontSize(8);
    doc.setFont(undefined, "bold");
    doc.text("Le Directeur Des Etudes", pageWidth - 70, yPos);
  };

  const drawClassStatistics = (doc: jsPDF, bulletins: StudentBulletin[]) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // En-tête (similaire aux bulletins)
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text("DAKAR LEADERS SCHOOL-DLS", 20, 20);
    doc.setFontSize(14);
    doc.text("RAPPORT STATISTIQUE DE LA CLASSE", pageWidth / 2, 35, { align: "center" });
    doc.line(20, 38, pageWidth - 20, 38);

    const className = bulletins.length > 0 ? bulletins[0].classe : "";
    doc.setFontSize(12);
    doc.text(`Classe: ${className}`, 20, 50);
    doc.text(`Effectif Total: ${bulletins.length}`, 20, 58);

    const successCount = bulletins.filter((s) => s.moyenneGenerale >= 10).length;
    const successRate = ((successCount / bulletins.length) * 100).toFixed(2);
    doc.text(`Taux de réussite: ${successRate}% (${successCount} admis)`, 20, 66);

    // Statistiques par tranches de notes
    const ranges = [
      { label: ">= 16", filter: (m: number) => m >= 16 },
      { label: "15 - 15.99", filter: (m: number) => m >= 15 && m < 16 },
      { label: "14 - 14.99", filter: (m: number) => m >= 14 && m < 15 },
      { label: "13 - 13.99", filter: (m: number) => m >= 13 && m < 14 },
      { label: "12 - 12.99", filter: (m: number) => m >= 12 && m < 13 },
      { label: "11 - 11.99", filter: (m: number) => m >= 11 && m < 12 },
      { label: "10 - 10.99", filter: (m: number) => m >= 10 && m < 11 },
      { label: "< 10", filter: (m: number) => m < 10 },
    ];

    let yPos = 85;
    doc.setFontSize(11);
    doc.text("Répartition des moyennes générales :", 20, yPos);
    yPos += 10;

    // Tableau des stats
    doc.setFontSize(10);
    doc.rect(20, yPos, 60, 10);
    doc.text("Tranche", 25, yPos + 7);
    doc.rect(80, yPos, 40, 10);
    doc.text("Nombre", 85, yPos + 7);
    doc.rect(120, yPos, 50, 10);
    doc.text("Pourcentage", 125, yPos + 7);
    yPos += 10;

    ranges.forEach((range) => {
      const count = bulletins.filter((s) => range.filter(s.moyenneGenerale)).length;
      const percent = ((count / bulletins.length) * 100).toFixed(2);

      doc.rect(20, yPos, 60, 10);
      doc.text(range.label, 25, yPos + 7);
      doc.rect(80, yPos, 40, 10);
      doc.text(count.toString(), 85, yPos + 7);
      doc.rect(120, yPos, 50, 10);
      doc.text(`${percent}%`, 125, yPos + 7);
      yPos += 10;
    });

    // Signature
    yPos += 30;
    doc.setFont(undefined, "bold");
    doc.text("Fait à Dakar, le " + new Date().toLocaleDateString(), pageWidth - 80, yPos);
    doc.text("Le Directeur des Études", pageWidth - 80, yPos + 10);
  };

  const generateAllBulletins = () => {
    if (studentsBulletins.length === 0) {
      toast({ title: "Aucun bulletin à générer", description: "Données manquantes.", variant: "destructive" });
      return;
    }
    const doc = new jsPDF();

    // Page de statistiques en premier
    drawClassStatistics(doc, studentsBulletins);

    // Ensuite les bulletins individuels
    studentsBulletins.forEach((student) => drawBulletin(doc, student, false));

    doc.save(`Rapport_Complet_${selectedClass}_${selectedPeriod}.pdf`);
    toast({ title: "Documents générés", description: "Le rapport statistique et les bulletins ont été générés." });
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <FileText className="w-5 h-5" /> Génération de Bulletins
        </CardTitle>
        <CardDescription className="text-muted-foreground">Créer et télécharger les bulletins de notes complets</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="period">Période</Label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="semestre1">1er Semestre</SelectItem>
                <SelectItem value="semestre2">2ème Semestre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="class">Classe</Label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger><SelectValue placeholder="Sélectionner une classe" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Choisir une classe (Requis)</SelectItem>
                {classReports.map((classe) => (
                  <SelectItem key={classe.classeId} value={classe.classeId}>{classe.classe}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="border border-border rounded-lg p-4 bg-muted/50">
          <h4 className="font-medium mb-3 text-foreground">Contenu du bulletin :</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><Badge variant="outline">Informations élève</Badge><p className="text-xs text-muted-foreground mt-1">Nom, prénom, classe, rang</p></div>
            <div><Badge variant="outline">Notes détaillées</Badge><p className="text-xs text-muted-foreground mt-1">Devoirs et compositions</p></div>
            <div><Badge variant="outline">Moyennes</Badge><p className="text-xs text-muted-foreground mt-1">Par matière et générale</p></div>
            <div><Badge variant="outline">Rang</Badge><p className="text-xs text-muted-foreground mt-1">Classement par matière et général</p></div>
          </div>
        </div>
        <Button onClick={generateAllBulletins} className="w-full" size="lg" disabled={selectedClass === "all" || isLoadingClassData || studentsBulletins.length === 0}>
          {isLoadingClassData ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />} Générer les Bulletins PDF
        </Button>
      </CardContent>
    </Card>
  );
};

export default BulletinGenerator;
