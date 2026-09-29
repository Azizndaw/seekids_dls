export const getAverageInterpretation = (moyenne: number, weakestSubject?: string | null) => {
    const progressMsg = weakestSubject ? ` – peut encore progresser en ${weakestSubject}` : "";

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
        const key = n.subject || n.discipline?.name || "Sans Nom";
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
