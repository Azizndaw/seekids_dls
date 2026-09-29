import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ClasseAverageDTO } from "@/hooks/useAverage";
import { calculatePeriodStats as calcStats } from "@/utils/gradeUtils";

export const generateClassGradeReport = (
  classeReport: ClasseAverageDTO,
  logoUrl: string,
  options?: { studentId?: string; role?: "admin" | "parent" }
) => {
  const doc = new jsPDF();
  // If specific student requested, filter but keep original for rank calc if needed,
  // though rank calc relies on index in sorted array.
  // Actually, we must calc ranks based on ALL students first.
  const allStudents = classeReport.studentsData;
  const classeName = classeReport.classe;

  // Hardcoded school name for Dakar Leaders School
  const schoolName = "Dakar Leaders School";
  // Initial sort by general average descending for rank
  const sortedStudents = [...allStudents].map(s => ({
    ...s,
    computedAverage: calcStats(s.grades, "all").average // Use "all" or specific semester if passed?
  })).sort((a, b) => b.computedAverage - a.computedAverage);

  const getRank = (studentId: string) => {
    return sortedStudents.findIndex((s) => s.id === studentId) + 1;
  };

  // Filter students to print
  const studentsToPrint = options?.studentId
    ? sortedStudents.filter((s) => s.id === options.studentId)
    : sortedStudents;

  studentsToPrint.forEach((student, index) => {
    // Add new page for each student except the first one
    if (index > 0) {
      doc.addPage();
    }

    const pageWidth = doc.internal.pageSize.getWidth();

    // --- Header ---
    doc.addImage(logoUrl, "PNG", 15, 10, 25, 25);

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("République du Sénégal", 45, 10);
    doc.setFont("helvetica", "normal");
    doc.text("Ministère de l'Éducation Nationale", 45, 14);
    doc.text("INSPECTION D’ACADÉMIE DE DAKAR", 45, 18);
    doc.text("IEF DES ALMADIES", 45, 22);

    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text("Collège Lycée Privé de Référence Trilingue", 45, 27);

    // Place school name near the logo
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("DAKAR LEADERS SCHOOL-DLS", 45, 34);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Année Scolaire: 2025 - 2026", pageWidth - 15, 15, { align: "right" });
    // Assuming Semestre 1 for now or pass it as arg
    doc.text("1er Semestre", pageWidth - 15, 20, { align: "right" });

    // --- Title ---
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("CARNET DE NOTES", pageWidth / 2, 40, { align: "center" });
    doc.line(15, 42, pageWidth - 15, 42);

    // --- Student Info ---
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");

    // Left side
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13); // Larger for name
    doc.text(`Prénom: ${student.firstName}`, 20, 52);
    doc.text(`Nom: ${student.lastName}`, 20, 60);
    // doc.text(`Né(e) le: ${new Date().toLocaleDateString()}`, 20, 64); // Date of birth missing in StudentData interface

    // Right side
    doc.text(`Classe: ${classeName}`, pageWidth - 80, 52);
    doc.text(`Effectif: ${allStudents.length}`, pageWidth - 80, 58); // Use allStudents.length for total effectif

    // Middle/Highlighted stats
    doc.setFillColor(240, 240, 240);
    doc.rect(20, 70, pageWidth - 40, 15, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12); // Larger for highlights
    doc.text(`Moyenne Générale: ${(student.computedAverage || 0).toFixed(2)}/20`, 30, 80);
    doc.text(`Rang: ${getRank(student.id)} / ${allStudents.length}`, pageWidth - 80, 80);

    // --- Grades Table ---
    const tableData = Object.entries(student.subjectAverages).map(([subject, average]) => {
      // Find subject coefficient if possible, otherwise mock or omit
      // For now, simple list
      let appreciation = "";
      const avgVal = average || 0;
      if (avgVal >= 16) appreciation = "Très Bien";
      else if (avgVal >= 14) appreciation = "Bien";
      else if (avgVal >= 12) appreciation = "Assez Bien";
      else if (avgVal >= 10) appreciation = "Passable";
      else appreciation = "Insuffisant";

      return [subject, `${avgVal.toFixed(2)}`, appreciation];
    });

    autoTable(doc, {
      startY: 95,
      head: [["Matière", "Moyenne / 20", "Appréciation"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 90, halign: "center", fontStyle: "bold" }, // Matière en gras
        1: { cellWidth: 35, halign: "center" }, // Moyenne
        2: { cellWidth: 55, halign: "center" }, // Appréciation
      },
    });

    // Footer signatures
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    const isParent = options?.role === "parent";

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    if (!isParent) {
      doc.text("Le Directeur des Études", pageWidth - 50, finalY);
    }
    // doc.text("Le Professeur Principal", 20, finalY); // Removed as per request
  });

  doc.save(`Carnet_Notes_${classeName}.pdf`);
};
