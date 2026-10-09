import jsPDF from "jspdf";

export interface CertificatData {
    prenom: string;
    nom: string;
    dateOfBirth?: string;
    lieu_naissance?: string;
    classeName?: string;
    classeNiveau?: string;
    academicYear?: string;
    directeurName?: string;
}

// Image loader helper
const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
        img.src = url;
    });
};

export const generateCertificatScolaritePDF = async (
    data: CertificatData,
    logoUrl: string = "/assets/logos/dls-official-logo.jpg",
    flagUrl: string = "/assets/logos/senegal-official-flag.png"
) => {
    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 210mm

    // --- 1. Load Official School Logo (Top Left) ---
    try {
        const logoImg = await loadImage(logoUrl);
        // Render school logo cleanly at Left = 12mm
        doc.addImage(logoImg, "JPEG", 12, 7, 26, 22);
    } catch (e) {
        try {
            const fallbackLogo = await loadImage("/assets/logos/dakar-leaders-school.png");
            doc.addImage(fallbackLogo, "PNG", 12, 7, 24, 22);
        } catch (err) {
            console.warn("School logo could not be loaded into PDF", err);
        }
    }

    // --- 2. Load Official Senegal Flag (Top Right) ---
    try {
        const flagImg = await loadImage(flagUrl);
        // Render Senegal flag with crisp 3:2 ratio at Right = 172mm
        doc.addImage(flagImg, "PNG", 171, 9, 26, 17.3);
    } catch (e) {
        console.warn("Senegal flag image could not be loaded", e);
    }

    // --- 3. Header Center (Institutional Text) ---
    // Text constrained to center x=105mm between x=40mm and x=170mm
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(10.5);
    doc.setFont("helvetica", "normal");
    doc.text("République du Sénégal", 105, 11.5, { align: "center" });

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Ministère de l'Education Nationale", 105, 16.5, { align: "center" });

    // 7.5pt for long inspection string ensures ~10mm gap on both sides of logos
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bolditalic");
    doc.setTextColor(60, 60, 60);
    doc.text(
        "Inspection Académique Dakar - Inspection de l’éducation et de la formation des Almadies",
        105,
        21.5,
        { align: "center" }
    );

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("Autorisation : N°006564/MEN/CAB/SG/DEP", 105, 26.5, { align: "center" });

    // --- 4. Separator Line ---
    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.4);
    doc.line(15, 33, 195, 33);

    // --- 5. Title ---
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(22);
    doc.setFont("times", "bold");
    const titleText = "CERTIFICAT DE SCOLARITE";
    doc.text(titleText, 105, 62, { align: "center" });

    // Underline title directly under text
    const titleWidth = doc.getTextWidth(titleText);
    doc.setLineWidth(0.8);
    doc.line(105 - titleWidth / 2, 64.5, 105 + titleWidth / 2, 64.5);

    // --- 6. Body Paragraph Formatting ---
    const directeur = data.directeurName || "Mamadou NDOYE";
    const studentNom = (data.nom || "").toUpperCase();
    const studentPrenom = (data.prenom || "").toUpperCase();
    const studentFullName = `${studentPrenom} ${studentNom}`.trim();

    // Format Birth Date
    let dateBirthStr = "Non renseignée";
    if (data.dateOfBirth) {
        try {
            const d = new Date(data.dateOfBirth);
            if (!isNaN(d.getTime())) {
                dateBirthStr = d.toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                });
            }
        } catch (e) {
            dateBirthStr = data.dateOfBirth;
        }
    }

    const lieuBirthStr = (data.lieu_naissance || "DAKAR").toUpperCase();

    // Format Class
    const classeStr = data.classeNiveau && data.classeName
        ? `${data.classeNiveau} ${data.classeName}`
        : data.classeName || data.classeNiveau || "Classe non spécifiée";

    const yearStr = data.academicYear || localStorage.getItem("academicYear") || "2025/2026";
    const formattedYear = yearStr.replace("-", "/");

    // Construct styled text flow
    doc.setFontSize(14.5);
    doc.setFont("times", "normal");
    doc.setTextColor(0, 0, 0);

    const startX = 18;
    const startY = 88;
    const maxX = 192;
    const lineHeight = 11.5;

    interface TextSegment {
        text: string;
        bold: boolean;
    }

    const segments: TextSegment[] = [
        { text: "Je soussigné Mʳ ", bold: false },
        { text: directeur, bold: true },
        { text: ", Directeur des Etudes du Collège Lycée Privé ", bold: false },
        { text: "DAKAR LEADERS SCHOOL", bold: true },
        { text: " certifie que l’élève ", bold: false },
        { text: studentFullName, bold: true },
        { text: " Née le ", bold: false },
        { text: dateBirthStr, bold: true },
        { text: " à ", bold: false },
        { text: lieuBirthStr, bold: true },
        { text: " était inscrite dans notre établissement en classe de ", bold: false },
        { text: classeStr, bold: true },
        { text: " pour l’année scolaire ", bold: false },
        { text: formattedYear, bold: true },
        { text: ".", bold: false },
    ];

    let currentX = startX;
    let currentY = startY;

    segments.forEach((seg) => {
        doc.setFont("times", seg.bold ? "bold" : "normal");

        // Split segment into words to handle wrapping smoothly
        const words = seg.text.split(/(?<= )/);

        words.forEach((word) => {
            const wordWidth = doc.getTextWidth(word);
            if (currentX + wordWidth > maxX) {
                // Line wrap
                currentX = startX;
                currentY += lineHeight;
            }
            doc.text(word, currentX, currentY);
            currentX += wordWidth;
        });
    });

    // Second paragraph: "En foi de quoi..."
    currentY += lineHeight * 2.2;
    doc.setFont("times", "normal");
    doc.setFontSize(14.5);
    doc.text(
        "En foi de quoi, ce présent certificat lui est délivré pour servir et valoir ce que de droit.",
        startX + 12, // Indented
        currentY
    );

    // --- 7. Signoff ---
    currentY += 35;
    doc.setFont("times", "bold");
    doc.setFontSize(15);
    const signText = "Le Directeur des Etudes";
    doc.text(signText, 185, currentY, { align: "right" });

    const signWidth = doc.getTextWidth(signText);
    doc.setLineWidth(0.8);
    doc.line(185 - signWidth, currentY + 2, 185, currentY + 2);

    // --- 8. Footer ---
    const footerY = 265;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.4);
    doc.line(25, footerY, 185, footerY);

    // Header line in green
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 166, 81); // Brand green #00a651
    doc.text("COURS PRIVES « DAKAR LEADERS SCHOOL-DLS »", 105, footerY + 6, { align: "center" });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("DLS – SARL RC : SN DKR2022 B 9767 – NINEA : 009290470", 105, footerY + 11.5, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(50, 50, 50);
    doc.text(
        "Siège : Keur Gorgui, Villa N° L23 en face la Radio Sud FM Dakar",
        105,
        footerY + 16,
        { align: "center" }
    );

    doc.text(
        "Contacts : 77 583 46 35 ou 77 831 03 99 / Fixe : 33 822 02 30 / Email : dakarleadersschooldls@gmail.com",
        105,
        footerY + 20.5,
        { align: "center" }
    );

    // --- 9. Save PDF ---
    const fileName = `Certificat_Scolarite_${studentNom}_${studentPrenom}_${yearStr.replace("/", "-")}.pdf`;
    doc.save(fileName);
};
