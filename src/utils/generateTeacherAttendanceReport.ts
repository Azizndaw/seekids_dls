import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { TeacherScheduleSummary } from "./teacherSchedulePayroll";

export interface AttendanceRecord {
    id: string;
    teacherName: string;
    subject: string;
    class: string;
    date: string;
    startTime: string;
    endTime: string;
    sessionCount: number;
    courseSummary: string;
    notes: string;
    amount?: number;
}

export const isNdaw = (teacherName?: string | null): boolean => {
    return !!teacherName && teacherName.toLowerCase().includes("ndaw");
};

const getRateForClass = (classe: string) => {
    const c = (classe || "").toLowerCase().trim();
    const isExam =
        c.includes("terminal l2") ||
        c.includes("terminal s2") ||
        c.includes("terminal") ||
        c.includes("tl2") ||
        c.includes("ts2") ||
        c.startsWith("3") ||
        c.includes("3e") ||
        c.includes("3ème");
    return isExam ? 4000 : 3000;
};

const HOUR_FACTOR = 40 / 60;

// Safe formatting for numbers in PDF to avoid encoding issues with toLocaleString
const formatCurrency = (num: number) => {
    const rounded = Math.round(num);
    return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " CFA";
};

export interface SchedulePayrollReportData {
    teachers: TeacherScheduleSummary[];
    periodLabel?: string;
    totals: {
        weeklySessions: number;
        weeklyHours: number;
        weeklyPayment: number;
        monthlySessions4W: number;
        monthlyHours4W: number;
        monthlyPayment4W: number;
        calendarSessions: number;
        calendarHours: number;
        calendarPayment: number;
    };
    hasSpecificMonth?: boolean;
}

export const generateTeacherAttendanceReport = (
    records: AttendanceRecord[],
    teacherName: string,
    monthLabel: string,
    schoolName: string,
    logoUrl: string,
    stats: { totalHours: number; totalSessions: number; totalPayment: number },
    schedulePayroll?: SchedulePayrollReportData
) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    const uniqueTeachersFromRecords = [...new Set(records.map(r => r.teacherName))];
    const isMultiTeacher = uniqueTeachersFromRecords.length > 1 || teacherName === "Tous les enseignants";

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
    doc.text("DAKAR LEADERS SCHOOL-DLS", 45, 34);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Année Scolaire: 2026 - 2027`, pageWidth - 15, 15, { align: "right" });
    doc.text(`Date de génération: ${new Date().toLocaleDateString("fr-FR")}`, pageWidth - 15, 20, { align: "right" });

    // --- Title ---
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("RAPPORT D'ÉMARGEMENT", pageWidth / 2, 45, { align: "center" });
    doc.setLineWidth(0.5);
    doc.line(15, 47, pageWidth - 15, 47);

    // --- Info Section ---
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`Enseignant:`, 15, 55);
    doc.setFont("helvetica", "normal");
    doc.text(teacherName, 45, 55);

    doc.setFont("helvetica", "bold");
    doc.text(`Période:`, 15, 62);
    doc.setFont("helvetica", "normal");
    doc.text(
        schedulePayroll?.periodLabel ? `${monthLabel} (${schedulePayroll.periodLabel})` : monthLabel,
        45,
        62
    );

    // --- Stats Box ---
    const boxHeight = schedulePayroll ? 28 : 22;
    doc.setFillColor(245, 245, 245);
    doc.rect(15, 68, pageWidth - 30, boxHeight, "F");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("RÉSUMÉ GLOBAL", 20, 74);

    doc.setFont("helvetica", "normal");
    doc.text(`Séances émargées: ${stats.totalSessions}`, 20, 82);
    doc.text(`Heures émargées: ${stats.totalHours.toFixed(1)}h`, 72, 82);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(41, 128, 185);
    doc.text(`MONTANT ÉMARGÉ: ${formatCurrency(stats.totalPayment)}`, 125, 82);
    doc.setTextColor(0, 0, 0);

    if (schedulePayroll) {
        const expectedSessions = schedulePayroll.hasSpecificMonth
            ? schedulePayroll.totals.calendarSessions
            : schedulePayroll.totals.monthlySessions4W;
        const expectedHours = schedulePayroll.hasSpecificMonth
            ? schedulePayroll.totals.calendarHours
            : schedulePayroll.totals.monthlyHours4W;
        const expectedPayment = schedulePayroll.hasSpecificMonth
            ? schedulePayroll.totals.calendarPayment
            : schedulePayroll.totals.monthlyPayment4W;

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(
            `Prévu selon planning (sans absence): ${expectedSessions} séances (${expectedHours.toFixed(1)}h)`,
            20,
            90
        );
        doc.setFont("helvetica", "bold");
        doc.setTextColor(16, 124, 65);
        doc.text(`PRÉVISION SANS ABSENCE: ${formatCurrency(expectedPayment)}`, 120, 90);
        doc.setTextColor(0, 0, 0);
    }

    let currentY = 68 + boxHeight + 8;

    // --- Multi-Teacher Summary Table ---
    if (isMultiTeacher) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("RÉCAPITULATIF PAR ENSEIGNANT (PLANNING SANS ABSENCE VS ÉMARGÉ)", 15, currentY);

        const scheduleMap = new Map<string, TeacherScheduleSummary>();
        if (schedulePayroll?.teachers) {
            for (const t of schedulePayroll.teachers) {
                scheduleMap.set(t.teacherName, t);
            }
        }

        const allTeacherNames = Array.from(
            new Set([
                ...uniqueTeachersFromRecords,
                ...(schedulePayroll?.teachers.map(t => t.teacherName) || []),
            ])
        ).sort((a, b) => a.localeCompare(b));

        const teacherSummaries = allTeacherNames.map(name => {
            const teacherRecords = records.filter(r => r.teacherName === name);
            const tSessions = teacherRecords.reduce((sum, r) => sum + (r.sessionCount || 0), 0);
            const tHours = tSessions * HOUR_FACTOR;
            const tPayment = teacherRecords.reduce((sum, r) => {
                const sessions = r.sessionCount !== undefined ? r.sessionCount : 1;
                if (isNdaw(r.teacherName || name)) {
                    return sum + sessions * 4000;
                }
                const hours = sessions * HOUR_FACTOR;
                const rate = getRateForClass(r.class);
                return sum + hours * rate;
            }, 0);

            const sched = scheduleMap.get(name);
            const expSessions = sched
                ? schedulePayroll?.hasSpecificMonth
                    ? sched.calendarSessions
                    : sched.monthlySessions4W
                : 0;
            const expHours = sched
                ? schedulePayroll?.hasSpecificMonth
                    ? sched.calendarHours
                    : sched.monthlyHours4W
                : 0;
            const expPay = sched
                ? schedulePayroll?.hasSpecificMonth
                    ? sched.calendarPayment
                    : sched.monthlyPayment4W
                : 0;

            return [
                name,
                sched ? `${expSessions} s. (${expHours.toFixed(1)}h)` : "-",
                sched ? formatCurrency(expPay) : "-",
                `${tSessions} s. (${tHours.toFixed(1)}h)`,
                formatCurrency(tPayment),
            ];
        });

        autoTable(doc, {
            startY: currentY + 5,
            head: [["Enseignant", "Séances Prévues", "Prévision Sans Absence", "Émargé", "Montant Émargé"]],
            body: teacherSummaries,
            theme: "striped",
            headStyles: { fillColor: [52, 73, 94], textColor: 255 },
            styles: { fontSize: 8.5 },
            margin: { left: 15, right: 15 }
        });

        currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // --- Detailed Records Table ---
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("DÉTAIL DES ÉMARGEMENTS", 15, currentY);

    const head = isMultiTeacher
        ? [["Date", "Enseignant", "Matière", "Classe", "S.", "Heures", "Montant", "Contenu"]]
        : [["Date", "Matière", "Classe", "S.", "Heures", "Montant", "Contenu du cours"]];

    const tableData = records.map((r) => {
        const sessions = r.sessionCount !== undefined ? r.sessionCount : 1;
        const computedHours = sessions * HOUR_FACTOR;
        const rate = getRateForClass(r.class);
        const displayAmount = computedHours * rate;

        if (isMultiTeacher) {
            return [
                new Date(r.date).toLocaleDateString("fr-FR"),
                r.teacherName,
                r.subject,
                r.class,
                r.sessionCount,
                `${computedHours.toFixed(1)}h`,
                formatCurrency(displayAmount),
                r.courseSummary || "Aucun résumé"
            ];
        } else {
            return [
                new Date(r.date).toLocaleDateString("fr-FR"),
                r.subject,
                r.class,
                r.sessionCount,
                `${computedHours.toFixed(1)}h`,
                formatCurrency(displayAmount),
                r.courseSummary || "Aucun résumé"
            ];
        }
    });

    autoTable(doc, {
        startY: currentY + 5,
        head: head,
        body: tableData,
        theme: "grid",
        headStyles: { fillColor: [41, 128, 185], textColor: 255, halign: "center" },
        columnStyles: isMultiTeacher ? {
            0: { halign: "center", cellWidth: 15 },
            1: { halign: "left", cellWidth: 25 },
            2: { halign: "center", cellWidth: 20 },
            3: { halign: "center", cellWidth: 20 },
            4: { halign: "center", cellWidth: 8 },
            5: { halign: "center", cellWidth: 15 },
            6: { halign: "right", cellWidth: 25 },
            7: { halign: "left" }
        } : {
            0: { halign: "center", cellWidth: 20 },
            1: { halign: "center", cellWidth: 30 },
            2: { halign: "center", cellWidth: 25 },
            3: { halign: "center", cellWidth: 10 },
            4: { halign: "center", cellWidth: 15 },
            5: { halign: "right", cellWidth: 30 },
            6: { halign: "left" }
        },
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
    });

    // --- Footer ---
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    if (finalY < 270) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Signature de l'Administration", pageWidth - 70, finalY);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.text("Document généré automatiquement par KidSchoolLink", pageWidth / 2, 285, { align: "center" });
    }

    doc.save(`Rapport_Emargement_${teacherName.replace(/\s+/g, "_")}_${monthLabel.replace(/\s+/g, "_")}.pdf`);
};
