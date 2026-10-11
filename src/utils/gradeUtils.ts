export const getAverageInterpretation = (moyenne: number | null | undefined, weakestSubject?: string | null) => {
    const progressMsg = weakestSubject ? ` — peut encore progresser en ${weakestSubject}` : "";

    if (moyenne === null || moyenne === undefined || Number.isNaN(moyenne) || moyenne === 0) {
        return { label: "Non noté", color: "text-gray-500", bg: "bg-gray-100" };
    }

    if (moyenne >= 16) return { label: "Excellent niveau", color: "text-green-600", bg: "bg-green-100" };
    if (moyenne >= 14) return { label: "Bon niveau" + progressMsg, color: "text-blue-600", bg: "bg-blue-100" };
    if (moyenne >= 12) return { label: "Niveau satisfaisant" + progressMsg, color: "text-indigo-600", bg: "bg-indigo-100" };
    if (moyenne >= 10) return { label: "Niveau moyen" + progressMsg, color: "text-orange-600", bg: "bg-orange-100" };
    return { label: "Niveau faible" + progressMsg, color: "text-red-600", bg: "bg-red-100" };
};

export const getWeakestSubject = (subjectAverages: Record<string, number>) => {
    if (!subjectAverages || Object.keys(subjectAverages).length === 0) return null;

    let weakest = null;
    let minAvg = Infinity;

    for (const [subject, avg] of Object.entries(subjectAverages)) {
        if (avg < minAvg) {
            minAvg = avg;
            weakest = subject;
        }
    }

    return minAvg < 12 ? weakest : null; // Only suggest progress if average is below 12
};

export const getAttendanceAlert = (absences: number) => {
    if (absences >= 5) return { message: "Attention : taux d'absences critique", color: "text-red-600", bg: "bg-red-50", icon: "⚠️" };
    if (absences >= 3) return { message: "Attention : absences fréquentes", color: "text-orange-600", bg: "bg-orange-50", icon: "⚠️" };
    return null;
};

/**
 * Calculates the average for a subject based on devoirs and compositions.
 * Formula: (AvgDevoirs + AvgCompo) / 2 if both exist, otherwise just the one that exists.
 */
export const calculateSubjectAverage = (devoir: number, composition: number, coefficient: number) => {
    let moyenne = 0;
    if (devoir > 0 && composition > 0) {
        moyenne = (devoir + composition) / 2;
    } else if (devoir > 0) {
        moyenne = devoir;
    } else if (composition > 0) {
        moyenne = composition;
    }

    return {
        moyenne: parseFloat(moyenne.toFixed(2)),
        moyenneCoef: parseFloat((moyenne * coefficient).toFixed(2)),
    };
};

/**
 * Calculates full stats for a student for a given period.
 */
export const calculatePeriodStats = (allGrades: any[], period: "semestre1" | "semestre2" | "all") => {
    const relevantGrades = (allGrades || []).filter((g: any) => {
        if (!g.semestre) return false;
        if (period === "all") return true;
        return period === "semestre1" ? g.semestre.includes("1") : g.semestre.includes("2");
    });

    const notesByDiscipline = new Map<string, any[]>();
    relevantGrades.forEach((n: any) => {
        const key = n.subject || n.discipline?.name || n.disciplineName || "Sans Nom";
        if (!notesByDiscipline.has(key)) notesByDiscipline.set(key, []);
        notesByDiscipline.get(key)!.push(n);
    });

    let totalCoef = 0;
    let totalMoyenneCoef = 0;
    const gradesData: any[] = [];

    notesByDiscipline.forEach((discNotes) => {
        const devoirs = discNotes.filter((n: any) => n.devoir);
        const compos = discNotes.filter((n: any) => !n.devoir || n.type === "Composition");

        const sumDevoir = devoirs.reduce((sum: number, n: any) => sum + n.grade, 0);
        const avgDevoir = devoirs.length > 0 ? sumDevoir / devoirs.length : 0;

        const sumCompo = compos.reduce((sum: number, n: any) => sum + n.grade, 0);
        const avgCompo = compos.length > 0 ? sumCompo / compos.length : 0;

        const coef = discNotes[0].coefficient || 1;

        if (devoirs.length > 0 || compos.length > 0) {
            const { moyenne, moyenneCoef } = calculateSubjectAverage(avgDevoir, avgCompo, coef);
            totalCoef += coef;
            totalMoyenneCoef += moyenneCoef;

            gradesData.push({
                discipline: discNotes[0].subject || discNotes[0].discipline?.name || "Matière",
                devoir: parseFloat(avgDevoir.toFixed(2)),
                composition: parseFloat(avgCompo.toFixed(2)),
                coefficient: coef,
                average: moyenne,
                moyenneCoef: moyenneCoef,
            });
        }
    });

    const average = totalCoef > 0 ? totalMoyenneCoef / totalCoef : 0;
    return {
        average: parseFloat(average.toFixed(2)),
        totalCoef,
        totalMoyenneCoef: parseFloat(totalMoyenneCoef.toFixed(2)),
        gradesData
    };
};

/**
 * Robustly converts any date format (string YYYY-MM-DD, DD/MM/YYYY, ISO, timestamp number, Date object)
 * into a capitalized French month name ("Octobre", "Novembre", etc.).
 */
export const getMonthNameFromDate = (dateVal: any): string => {
    if (dateVal === null || dateVal === undefined || dateVal === "") return "";
    try {
        if (typeof dateVal === "number") {
            const ms = dateVal < 10000000000 ? dateVal * 1000 : dateVal;
            const d = new Date(ms);
            if (!isNaN(d.getTime())) {
                const mName = d.toLocaleString("fr-FR", { month: "long" });
                return mName.charAt(0).toUpperCase() + mName.slice(1);
            }
            return "";
        }

        if (dateVal instanceof Date) {
            if (!isNaN(dateVal.getTime())) {
                const mName = dateVal.toLocaleString("fr-FR", { month: "long" });
                return mName.charAt(0).toUpperCase() + mName.slice(1);
            }
            return "";
        }

        const dateStr = String(dateVal).trim();
        if (!dateStr) return "";

        // Numeric string timestamp
        if (/^\d+$/.test(dateStr)) {
            const num = Number(dateStr);
            const ms = num < 10000000000 ? num * 1000 : num;
            const d = new Date(ms);
            if (!isNaN(d.getTime())) {
                const mName = d.toLocaleString("fr-FR", { month: "long" });
                return mName.charAt(0).toUpperCase() + mName.slice(1);
            }
        }

        // DD/MM/YYYY or DD-MM-YYYY
        if (dateStr.includes("/")) {
            const parts = dateStr.split("/");
            if (parts.length === 3) {
                const [d, m, y] = parts.map(Number);
                if (!isNaN(m) && m >= 1 && m <= 12) {
                    const date = new Date(y, m - 1, d || 1);
                    const mName = date.toLocaleString("fr-FR", { month: "long" });
                    return mName.charAt(0).toUpperCase() + mName.slice(1);
                }
            }
        }

        // YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
        if (dateStr.includes("-")) {
            const datePart = dateStr.split("T")[0];
            const parts = datePart.split("-");
            if (parts.length >= 2) {
                let monthIndex = -1;
                if (parts[0].length === 4) {
                    // YYYY-MM-DD
                    monthIndex = parseInt(parts[1], 10) - 1;
                } else if (parts.length === 3 && parts[2].length === 4) {
                    // DD-MM-YYYY
                    monthIndex = parseInt(parts[1], 10) - 1;
                } else {
                    monthIndex = parseInt(parts[1], 10) - 1;
                }
                if (!isNaN(monthIndex) && monthIndex >= 0 && monthIndex < 12) {
                    const date = new Date(2000, monthIndex, 1);
                    const mName = date.toLocaleString("fr-FR", { month: "long" });
                    return mName.charAt(0).toUpperCase() + mName.slice(1);
                }
            }
        }

        // Fallback: standard Date parsing
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
            const mName = parsed.toLocaleString("fr-FR", { month: "long" });
            return mName.charAt(0).toUpperCase() + mName.slice(1);
        }
    } catch {
        return "";
    }
    return "";
};

