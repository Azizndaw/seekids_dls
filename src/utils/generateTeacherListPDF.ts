import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface TeacherData {
    id: string;
    prenom: string;
    nom: string;
    telephone: string;
    email: string;
    matiere: string;
    classes: string;
}

export interface AdminData {
    id: string;
    prenom: string;
    nom: string;
    poste: string;
    telephone?: string;
}

export const generateTeacherListPDF = (
    teachers: TeacherData[],
    administration?: AdminData[],
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

    // --- Teachers Section ---
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("LISTE DES PROFESSEURS", pageWidth / 2, 45, { align: "center" });
    doc.setLineWidth(0.3);
    doc.line(15, 47, pageWidth - 15, 47);

    const teacherTableData = teachers.map((t) => [
        `${t.prenom} ${t.nom}`,
        t.telephone || "Non renseigné",
        t.matiere || "Aucune",
        t.classes || "Aucune"
    ]);

    autoTable(doc, {
        startY: 52,
        head: [["Nom Complet", "Téléphone", "Matières", "Classes"]],
        body: teacherTableData,
        theme: "grid",
        headStyles: { fillColor: [41, 128, 185], textColor: 255, halign: "center" },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 30 },
            2: { cellWidth: 50 },
            3: { cellWidth: 'auto' }
        }
    });

    let finalY = (doc as any).lastAutoTable.finalY;

    // --- Administration Section ---
    if (administration && administration.length > 0) {
        // Add some space or new page if needed
        if (finalY > 230) {
            doc.addPage();
            finalY = 20;
        } else {
            finalY += 15;
        }

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("ADMINISTRATION", pageWidth / 2, finalY, { align: "center" });
        doc.line(15, finalY + 2, pageWidth - 15, finalY + 2);

        const adminTableData = administration.map((a) => [
            `${a.prenom} ${a.nom}`,
            a.poste
        ]);

        autoTable(doc, {
            startY: finalY + 6,
            head: [["Nom Complet", "Poste / Fonction"]],
            body: adminTableData,
            theme: "grid",
            headStyles: { fillColor: [52, 73, 94], textColor: 255, halign: "center" },
            styles: { fontSize: 8, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: 80 },
                1: { cellWidth: 'auto' }
            }
        });
    }

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

    doc.save(`Liste_Personnel_${new Date().toISOString().split('T')[0]}.pdf`);
};
