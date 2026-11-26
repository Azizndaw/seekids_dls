import { Cours } from "@/hooks/useCours";

export const SESSION_MINUTES = 40;
export const HOUR_FACTOR = SESSION_MINUTES / 60; // 40 / 60

export const isNdawTeacher = (teacherName?: string | null, teacherId?: string | null): boolean => {
  if (teacherId === "d8a08b24-1da8-4583-847b-547588c3c1ed") return true;
  return !!teacherName && teacherName.toLowerCase().includes("ndaw");
};

export const isUnpaidSubjectOrTeacher = (
  disciplineName?: string | null,
  teacherName?: string | null
): boolean => {
  const norm = (s?: string | null) =>
    (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const d = norm(disciplineName);
  const t = norm(teacherName);

  if (
    d.includes("entrepreneuriat") ||
    d.includes("leadership") ||
    d.includes("developpement personnel")
  ) {
    return true;
  }

  if (t.includes("entrepreneurs") || t.includes("faye & sylla") || t.includes("tijani")) {
    return true;
  }

  return false;
};

export const getRateForClass = (classe: string): number => {
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

export interface ParsedScheduleSlot {
  key: string;
  jour: string;
  normalizedDay: string;
  startRaw: string;
  endRaw: string;
  displayTime: string;
  durationMinutes: number;
  sessions: number;
  hours: number;
  classDisplay: string;
  classNames: string[];
  classIds: string[];
  disciplineId: string;
  disciplineName: string;
  rate: number;
  weeklyPayment: number;
  monthlyPayment4W: number;
  calendarOccurrences: number;
  calendarSessions: number;
  calendarPayment: number;
}

export interface MonthPeriodForecast {
  sessions: number;
  hours: number;
  payment: number;
}

export interface TeacherScheduleSummary {
  teacherId: string;
  teacherName: string;
  isNdaw: boolean;
  subjects: string[];
  classes: string[];
  slots: ParsedScheduleSlot[];
  weeklySessions: number;
  weeklyHours: number;
  weeklyPayment: number;
  monthlySessions4W: number;
  monthlyHours4W: number;
  monthlyPayment4W: number;
  calendarSessions: number;
  calendarHours: number;
  calendarPayment: number;
  bySpecialMonth: {
    october: MonthPeriodForecast; // 12 - 31 oct
    november: MonthPeriodForecast; // 1 - 30 nov
    december: MonthPeriodForecast; // 1 - 23 déc
    january: MonthPeriodForecast; // 6 - 31 janv
  };
}

export const normalizeDayName = (day: string): string => {
  return (day || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
};

export const parseCourseTimeAndSessions = (heureRaw: string) => {
  const parseTimePart = (t: string) => {
    const clean = (t || "").toLowerCase().replace("h", ":").trim();
    let h = 0;
    let m = 0;
    if (clean.includes(":")) {
      const parts = clean.split(":");
      h = parseInt(parts[0], 10) || 0;
      m = parseInt(parts[1], 10) || 0;
    } else {
      const val = parseInt(clean, 10);
      if (val >= 24) {
        h = Math.floor(val / 100);
        m = val % 100;
      } else {
        h = val || 0;
        m = 0;
      }
    }
    return { h, m };
  };

  const cleanHeure = (heureRaw || "").replace(/\s/g, "");
  let startH = 0;
  let startM = 0;
  let endH = 0;
  let endM = 0;

  if (cleanHeure.includes("-")) {
    const [startStr, endStr] = cleanHeure.split("-");
    const start = parseTimePart(startStr);
    const end = parseTimePart(endStr);
    startH = start.h;
    startM = start.m;
    endH = end.h;
    endM = end.m;
  } else {
    const start = parseTimePart(cleanHeure);
    startH = start.h;
    startM = start.m;
    endH = startH + 1;
    endM = startM;
  }

  const formatTime = (h: number, m: number) =>
    `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;

  const startRaw = formatTime(startH, startM);
  const endRaw = formatTime(endH, endM);
  const durationMinutes = Math.max(0, endH * 60 + endM - (startH * 60 + startM));

  let calculatedSessions = 1;
  if (durationMinutes > 260) {
    calculatedSessions = Math.round(durationMinutes / 45);
  } else if (durationMinutes > 215) {
    calculatedSessions = 5;
  } else if (durationMinutes > 155) {
    calculatedSessions = 4;
  } else if (durationMinutes > 115) {
    calculatedSessions = 3;
  } else if (durationMinutes > 55) {
    calculatedSessions = 2;
  } else {
    calculatedSessions = 1;
  }

  return {
    startRaw,
    endRaw,
    displayTime: `${startRaw} - ${endRaw}`,
    durationMinutes,
    calculatedSessions,
  };
};

/**
 * Retourne la plage de jours de cours actifs pour un mois donné ("YYYY-MM") :
 * - Octobre (-10) : du 12 au 31 octobre (rentrée le 12 octobre)
 * - Novembre (-11) : du 1er au 30 novembre (mois complet)
 * - Décembre (-12) : du 1er au 23 décembre (arrêt des cours le 23 décembre)
 * - Janvier (-01) : du 6 au 31 janvier (reprise des cours le 6 janvier)
 * - Autres mois : du 1er au dernier jour du mois
 */
export const getActiveSchoolDaysBounds = (
  year: number,
  monthNumber: number // 1-12
): { startDay: number; endDay: number; note: string } => {
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  if (monthNumber === 10) {
    return {
      startDay: 12,
      endDay: daysInMonth,
      note: `Du 12 au ${daysInMonth} Octobre (début des cours le 12 oct.)`,
    };
  }
  if (monthNumber === 12) {
    return {
      startDay: 1,
      endDay: Math.min(23, daysInMonth),
      note: "Du 1er au 23 Décembre (arrêt des cours le 23 déc.)",
    };
  }
  if (monthNumber === 1) {
    return {
      startDay: 6,
      endDay: daysInMonth,
      note: `Du 6 au ${daysInMonth} Janvier (reprise des cours le 6 janv.)`,
    };
  }
  const monthNames = [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre",
  ];
  return {
    startDay: 1,
    endDay: daysInMonth,
    note: `Du 1er au ${daysInMonth} ${monthNames[monthNumber - 1]} (mois complet)`,
  };
};

export const getMonthSchoolPeriodLabel = (monthYear?: string): string => {
  if (!monthYear || monthYear === "all" || !/^\d{4}-\d{2}$/.test(monthYear)) {
    return "Base mensuelle (4 semaines)";
  }
  const [yearStr, monthStr] = monthYear.split("-");
  const year = parseInt(yearStr, 10);
  const monthNumber = parseInt(monthStr, 10);
  if (isNaN(year) || isNaN(monthNumber) || monthNumber < 1 || monthNumber > 12) {
    return "Base mensuelle (4 semaines)";
  }
  return getActiveSchoolDaysBounds(year, monthNumber).note;
};

/**
 * Compte le nombre d'occurrences de chaque jour de la semaine ('lundi', 'mardi', etc.)
 * dans la période active de cours d'un mois donné au format "YYYY-MM".
 * Si aucun mois valide n'est fourni, retourne 4 occurrences par jour (base standard 4 semaines).
 */
export const getWeekdayOccurrencesInMonth = (monthYear?: string): Record<string, number> => {
  const defaultCounts: Record<string, number> = {
    dimanche: 4,
    lundi: 4,
    mardi: 4,
    mercredi: 4,
    jeudi: 4,
    vendredi: 4,
    samedi: 4,
  };

  if (!monthYear || monthYear === "all" || !/^\d{4}-\d{2}$/.test(monthYear)) {
    return defaultCounts;
  }

  const [yearStr, monthStr] = monthYear.split("-");
  const year = parseInt(yearStr, 10);
  const monthNumber = parseInt(monthStr, 10); // 1-12
  if (isNaN(year) || isNaN(monthNumber) || monthNumber < 1 || monthNumber > 12) {
    return defaultCounts;
  }

  const { startDay, endDay } = getActiveSchoolDaysBounds(year, monthNumber);
  const monthIndex = monthNumber - 1;

  const counts: Record<string, number> = {
    dimanche: 0,
    lundi: 0,
    mardi: 0,
    mercredi: 0,
    jeudi: 0,
    vendredi: 0,
    samedi: 0,
  };

  const dayNames = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

  for (let d = startDay; d <= endDay; d++) {
    const weekday = new Date(year, monthIndex, d).getDay();
    counts[dayNames[weekday]] += 1;
  }

  return counts;
};

const DAY_ORDER: Record<string, number> = {
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6,
  dimanche: 7,
};

/**
 * Calcule pour chaque professeur son emploi du temps théorique hebdomadaire et mensuel (sans absence),
 * en tenant compte des dates réelles de cours pour chaque mois (Octobre dès le 12, Décembre jusqu'au 23, Janvier dès le 6).
 */
export const calculateTeachersSchedulePayroll = (
  allCourses: Cours[] | undefined | null,
  selectedMonth?: string,
  options?: {
    selectedTeacher?: string;
    searchTerm?: string;
    selectedClass?: string;
  }
): {
  teachers: TeacherScheduleSummary[];
  periodLabel: string;
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
    bySpecialMonth: {
      october: MonthPeriodForecast;
      november: MonthPeriodForecast;
      december: MonthPeriodForecast;
      january: MonthPeriodForecast;
    };
  };
} => {
  const emptyMonth = (): MonthPeriodForecast => ({ sessions: 0, hours: 0, payment: 0 });
  const emptyTotals = {
    weeklySessions: 0,
    weeklyHours: 0,
    weeklyPayment: 0,
    monthlySessions4W: 0,
    monthlyHours4W: 0,
    monthlyPayment4W: 0,
    calendarSessions: 0,
    calendarHours: 0,
    calendarPayment: 0,
    bySpecialMonth: {
      october: emptyMonth(),
      november: emptyMonth(),
      december: emptyMonth(),
      january: emptyMonth(),
    },
  };

  const periodLabel = getMonthSchoolPeriodLabel(selectedMonth);

  if (!allCourses || allCourses.length === 0) {
    return { teachers: [], periodLabel, totals: emptyTotals };
  }

  const weekdayOccurrences = getWeekdayOccurrencesInMonth(selectedMonth);
  const octOccurrences = getWeekdayOccurrencesInMonth("2026-10");
  const novOccurrences = getWeekdayOccurrencesInMonth("2026-11");
  const decOccurrences = getWeekdayOccurrencesInMonth("2026-12");
  const janOccurrences = getWeekdayOccurrencesInMonth("2027-01");

  // Grouper les cours par professeur
  const coursesByTeacher = new Map<
    string,
    { teacherId: string; teacherName: string; courses: Cours[] }
  >();

  for (const c of allCourses) {
    const prenom = c.professeur?.prenom || c.professeurPrenom || "";
    const nom = c.professeur?.nom || c.professeurNom || "";
    const teacherName = [prenom, nom].filter(Boolean).join(" ").trim() || "Inconnu";
    const teacherId = c.professeurId || teacherName;
    const disciplineName = c.disciplineName || c.discipline?.name || "";

    // Exclure des prévisions les professeurs / matières non rémunérés (Initiation à l'entrepreneuriat & Leadership et Développement Personnel)
    if (isUnpaidSubjectOrTeacher(disciplineName, teacherName)) {
      continue;
    }

    if (
      options?.selectedTeacher &&
      options.selectedTeacher !== "all" &&
      teacherName !== options.selectedTeacher
    ) {
      continue;
    }

    const key = teacherName;
    if (!coursesByTeacher.has(key)) {
      coursesByTeacher.set(key, { teacherId, teacherName, courses: [] });
    }
    coursesByTeacher.get(key)!.courses.push(c);
  }

  const summaries: TeacherScheduleSummary[] = [];

  for (const [, group] of coursesByTeacher.entries()) {
    const { teacherId, teacherName, courses } = group;
    const isNdaw = isNdawTeacher(teacherName, teacherId);

    // Regrouper les classes réunies sur le même créneau (même jour, même horaire, même matière)
    // Sauf pour M. Ndaw où chaque classe compte séparément
    const slotMap = new Map<
      string,
      {
        jour: string;
        normalizedDay: string;
        startRaw: string;
        endRaw: string;
        displayTime: string;
        durationMinutes: number;
        sessions: number;
        classNames: string[];
        classIds: string[];
        disciplineId: string;
        disciplineName: string;
      }
    >();

    courses.forEach((c, idx) => {
      const parsed = parseCourseTimeAndSessions(c.heure || "");
      const normDay = normalizeDayName(c.jour || "");
      const rawClassName =
        [(c as any).classeNiveau || c.classe?.niveau || "", c.classeName || c.classe?.nom || ""]
          .filter(Boolean)
          .join(" ")
          .trim() || "Classe";
      const disciplineName = c.disciplineName || c.discipline?.name || "Matière";
      const disciplineId = c.disciplineId || disciplineName;

      const slotKey = isNdaw
        ? `${idx}_${c.id}`
        : `${normDay}|${parsed.startRaw}-${parsed.endRaw}|${disciplineId}`;

      if (!slotMap.has(slotKey)) {
        slotMap.set(slotKey, {
          jour: c.jour || "",
          normalizedDay: normDay,
          startRaw: parsed.startRaw,
          endRaw: parsed.endRaw,
          displayTime: parsed.displayTime,
          durationMinutes: parsed.durationMinutes,
          sessions: parsed.calculatedSessions,
          classNames: [rawClassName],
          classIds: c.classeId ? [c.classeId] : [],
          disciplineId,
          disciplineName,
        });
      } else {
        const existing = slotMap.get(slotKey)!;
        if (!existing.classNames.includes(rawClassName)) {
          existing.classNames.push(rawClassName);
        }
        if (c.classeId && !existing.classIds.includes(c.classeId)) {
          existing.classIds.push(c.classeId);
        }
      }
    });

    const slots: ParsedScheduleSlot[] = [];
    const subjectsSet = new Set<string>();
    const classesSet = new Set<string>();

    for (const [slotKey, s] of slotMap.entries()) {
      const classDisplay = s.classNames.join(" + ");

      if (options?.searchTerm) {
        const q = options.searchTerm.toLowerCase();
        const matchesSubject = s.disciplineName.toLowerCase().includes(q);
        const matchesClass = classDisplay.toLowerCase().includes(q);
        if (!matchesSubject && !matchesClass) {
          continue;
        }
      }

      if (options?.selectedClass && options.selectedClass !== "all") {
        const targetClass = options.selectedClass.toLowerCase().trim();
        const matchesSelectedClass =
          classDisplay.toLowerCase().includes(targetClass) ||
          s.classNames.some((cn) => cn.toLowerCase().trim() === targetClass) ||
          s.classIds.includes(options.selectedClass);
        if (!matchesSelectedClass) {
          continue;
        }
      }

      const hours = s.sessions * HOUR_FACTOR;
      // Affichage du tarif identique à tous les professeurs (3000 CFA/h non-examen, 4000 CFA/h examen)
      // Mais calcul interne maintenu à 4000 CFA par séance pour M. Ndaw
      const rate = getRateForClass(classDisplay);
      const weeklyPayment = isNdaw ? s.sessions * 4000 : hours * rate;
      const monthlyPayment4W = weeklyPayment * 4;
      const calendarOccurrences = weekdayOccurrences[s.normalizedDay] ?? 0;

      subjectsSet.add(s.disciplineName);
      s.classNames.forEach((cn) => classesSet.add(cn));

      slots.push({
        key: slotKey,
        jour: s.jour,
        normalizedDay: s.normalizedDay,
        startRaw: s.startRaw,
        endRaw: s.endRaw,
        displayTime: s.displayTime,
        durationMinutes: s.durationMinutes,
        sessions: s.sessions,
        hours,
        classDisplay,
        classNames: s.classNames,
        classIds: s.classIds,
        disciplineId: s.disciplineId,
        disciplineName: s.disciplineName,
        rate,
        weeklyPayment,
        monthlyPayment4W,
        calendarOccurrences,
        calendarSessions: s.sessions * calendarOccurrences,
        calendarPayment: weeklyPayment * calendarOccurrences,
      });
    }

    if (slots.length === 0) continue;

    slots.sort((a, b) => {
      const dA = DAY_ORDER[a.normalizedDay] || 99;
      const dB = DAY_ORDER[b.normalizedDay] || 99;
      if (dA !== dB) return dA - dB;
      return a.startRaw.localeCompare(b.startRaw);
    });

    let weeklySessions = 0;
    let weeklyHours = 0;
    let weeklyPayment = 0;
    let calendarSessions = 0;
    let calendarHours = 0;
    let calendarPayment = 0;

    const octForecast = emptyMonth();
    const novForecast = emptyMonth();
    const decForecast = emptyMonth();
    const janForecast = emptyMonth();

    for (const slot of slots) {
      weeklySessions += slot.sessions;
      weeklyHours += slot.hours;
      weeklyPayment += slot.weeklyPayment;

      const occurrences = weekdayOccurrences[slot.normalizedDay] ?? 0;
      calendarSessions += slot.sessions * occurrences;
      calendarHours += slot.hours * occurrences;
      calendarPayment += slot.weeklyPayment * occurrences;

      const nOct = octOccurrences[slot.normalizedDay] ?? 0;
      octForecast.sessions += slot.sessions * nOct;
      octForecast.hours += slot.hours * nOct;
      octForecast.payment += slot.weeklyPayment * nOct;

      const nNov = novOccurrences[slot.normalizedDay] ?? 0;
      novForecast.sessions += slot.sessions * nNov;
      novForecast.hours += slot.hours * nNov;
      novForecast.payment += slot.weeklyPayment * nNov;

      const nDec = decOccurrences[slot.normalizedDay] ?? 0;
      decForecast.sessions += slot.sessions * nDec;
      decForecast.hours += slot.hours * nDec;
      decForecast.payment += slot.weeklyPayment * nDec;

      const nJan = janOccurrences[slot.normalizedDay] ?? 0;
      janForecast.sessions += slot.sessions * nJan;
      janForecast.hours += slot.hours * nJan;
      janForecast.payment += slot.weeklyPayment * nJan;
    }

    summaries.push({
      teacherId,
      teacherName,
      isNdaw,
      subjects: Array.from(subjectsSet),
      classes: Array.from(classesSet),
      slots,
      weeklySessions,
      weeklyHours,
      weeklyPayment,
      monthlySessions4W: weeklySessions * 4,
      monthlyHours4W: weeklyHours * 4,
      monthlyPayment4W: weeklyPayment * 4,
      calendarSessions,
      calendarHours,
      calendarPayment,
      bySpecialMonth: {
        october: octForecast,
        november: novForecast,
        december: decForecast,
        january: janForecast,
      },
    });
  }

  summaries.sort((a, b) => a.teacherName.localeCompare(b.teacherName));

  const totals = summaries.reduce(
    (acc, t) => ({
      weeklySessions: acc.weeklySessions + t.weeklySessions,
      weeklyHours: acc.weeklyHours + t.weeklyHours,
      weeklyPayment: acc.weeklyPayment + t.weeklyPayment,
      monthlySessions4W: acc.monthlySessions4W + t.monthlySessions4W,
      monthlyHours4W: acc.monthlyHours4W + t.monthlyHours4W,
      monthlyPayment4W: acc.monthlyPayment4W + t.monthlyPayment4W,
      calendarSessions: acc.calendarSessions + t.calendarSessions,
      calendarHours: acc.calendarHours + t.calendarHours,
      calendarPayment: acc.calendarPayment + t.calendarPayment,
      bySpecialMonth: {
        october: {
          sessions: acc.bySpecialMonth.october.sessions + t.bySpecialMonth.october.sessions,
          hours: acc.bySpecialMonth.october.hours + t.bySpecialMonth.october.hours,
          payment: acc.bySpecialMonth.october.payment + t.bySpecialMonth.october.payment,
        },
        november: {
          sessions: acc.bySpecialMonth.november.sessions + t.bySpecialMonth.november.sessions,
          hours: acc.bySpecialMonth.november.hours + t.bySpecialMonth.november.hours,
          payment: acc.bySpecialMonth.november.payment + t.bySpecialMonth.november.payment,
        },
        december: {
          sessions: acc.bySpecialMonth.december.sessions + t.bySpecialMonth.december.sessions,
          hours: acc.bySpecialMonth.december.hours + t.bySpecialMonth.december.hours,
          payment: acc.bySpecialMonth.december.payment + t.bySpecialMonth.december.payment,
        },
        january: {
          sessions: acc.bySpecialMonth.january.sessions + t.bySpecialMonth.january.sessions,
          hours: acc.bySpecialMonth.january.hours + t.bySpecialMonth.january.hours,
          payment: acc.bySpecialMonth.january.payment + t.bySpecialMonth.january.payment,
        },
      },
    }),
    { ...emptyTotals }
  );

  return { teachers: summaries, periodLabel, totals };
};
