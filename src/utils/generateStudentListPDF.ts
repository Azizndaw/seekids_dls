import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface StudentPDFData {
    id: string;
    prenom: string;
    nom: string;
    dateOfBirth?: string;
    className?: string;
    classLevel?: string;
    parentName?: string;
}

export interface ClassPDFData {
    id: string;
    nom: string;
    niveau: string;
}

export const generateStudentListPDF = (
    students: StudentPDFData[],
    filterClassName?: string,
    schoolName: string = "DAKAR LEADERS SCHOOL-DLS",
    logoUrl?: string
) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // --- Header ---
    if (logoUrl) {
        try {
            doc.addImage(logoUrl, "PNG", 15, 8, 25, 25);
        } catch (e) {
            // Ignore logo errors
        }
    }

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("République du Sénégal", 45, 10);
    doc.setFont("helvetica", "normal");
    doc.text("Ministère de l'Éducation Nationale", 45, 14);
    doc.text("INSPECTION D'ACADÉMIE DE DAKAR", 45, 18);
    doc.text("IEF DES ALMADIES", 45, 22);

    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text("Collège Lycée Privé de Référence Trilingue", 45, 27);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(schoolName, 45, 34);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Année Scolaire: 2025 - 2026`, pageWidth - 15, 15, { align: "right" });
    doc.text(`Date: ${new Date().toLocaleDateString("fr-FR")}`, pageWidth - 15, 20, { align: "right" });

    // --- Title ---
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    const title = filterClassName
        ? `LISTE DES ÉLÈVES - ${filterClassName}`
        : "LISTE DES ÉLÈVES";
    doc.text(title, pageWidth / 2, 45, { align: "center" });
    doc.setLineWidth(0.5);
    doc.line(15, 47, pageWidth - 15, 47);

    // --- Total count ---
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Effectif total: ${students.length} élève(s)`, 15, 54);

    // --- Sort students by class then by name ---
    const sortedStudents = [...students].sort((a, b) => {
        const classA = `${a.classLevel || ""} ${a.className || ""}`.trim();
        const classB = `${b.classLevel || ""} ${b.className || ""}`.trim();
        if (classA !== classB) return classA.localeCompare(classB, "fr");
        if (a.nom !== b.nom) return a.nom.localeCompare(b.nom, "fr");
        return a.prenom.localeCompare(b.prenom, "fr");
    });

    // --- Build table data grouped by class ---
    const tableData: (string | { content: string; colSpan: number; styles: any })[][] = [];
    let currentClass = "";
    let studentIndex = 0;

    for (const student of sortedStudents) {
        const studentClassLabel = student.classLevel && student.className
            ? `${student.classLevel} - ${student.className}`
            : "Non assigné";

        // Add class header row when class changes
        if (studentClassLabel !== currentClass) {
            currentClass = studentClassLabel;
            studentIndex = 0;
            tableData.push([
                {
                    content: `📚 ${currentClass}`,
                    colSpan: 5,
                    styles: {
                        fillColor: [230, 240, 250],
                        fontStyle: "bold",
                        fontSize: 10,
                        textColor: [30, 60, 120],
                        halign: "left",
                    },
                },
            ]);
        }

        studentIndex++;
        const dob = student.dateOfBirth
            ? new Date(student.dateOfBirth).toLocaleDateString("fr-FR")
            : "Non renseignée";

        tableData.push([
            String(studentIndex),
            student.prenom,
            student.nom,
            dob,
            student.parentName || "Aucun",
        ]);
    }

    // --- Table ---
    autoTable(doc, {
        startY: 58,
        head: [["N°", "Prénom", "Nom", "Date de Naissance", "Parent"]],
        body: tableData as any,
        theme: "grid",
        headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            halign: "center",
            fontStyle: "bold",
        },
        styles: {
            fontSize: 9,
            cellPadding: 3,
        },
        columnStyles: {
            0: { cellWidth: 15, halign: "center" },
            1: { cellWidth: 35 },
            2: { cellWidth: 35 },
            3: { cellWidth: 35, halign: "center" },
            4: { cellWidth: "auto" },
        },
    });

    // --- Footer ---
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        doc.text(
            `Document généré par KidSchoolLink - Page ${i} sur ${pageCount}`,
            pageWidth / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: "center" }
        );
    }

    const fileName = filterClassName
        ? `Liste_Eleves_${filterClassName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`
        : `Liste_Eleves_${new Date().toISOString().split("T")[0]}.pdf`;

    doc.save(fileName);
};
