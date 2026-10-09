import httpClient from "@/api/htppClient";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { apiUrl } from "@/integrations/supabase/host";

interface SubjectReportDTO {
  subject: string;
  average: string | null;
}
export interface Grade {
  id: string;
  devoir: boolean;
  subject: string;
  grade: number;
  coefficient: number;
  date: string; // ISO date string (YYYY-MM-DD)
  type: string;
  appreciation: string | null;
  semestre: string;
  disciplineId: string;
  professeurId: string;
  classeId: string;
  title: string;
}

export interface Attendance {
  id: string;
  date: string; // ISO date string
  type: "ABSCENCE" | "RETARD"; // You can expand this if needed
  course: string;
  justification?: string | null;
}

export interface SubjectAverages {
  [subject: string]: number; // dynamic subjects: Math, English, etc.
}

export interface StudentData {
  id: string;
  firstName: string;
  lastName: string;
  grades: Grade[];
  attendance: Attendance[];
  subjectAverages: SubjectAverages;
  generalAverage: number;
  classe: string;
  dateOfBirth?: string;
}

/**
 * Interface for the detailed class average data transfer object.
 */
export interface ClasseAverageDTO {
  classeId: string;
  classe: string;
  students: number;
  average: string | null;
  successRate: string | null;
  studentsData: StudentData[];
  subjectReports: SubjectReportDTO[];
}

/**
 * Interface for the detailed school average data transfer object.
 */
export interface SchoolAverageDTO {
  schoolAverage: string | null;
  schoolSuccessRate: string | null;
  disciplinesCount: number;
  classAverages: ClasseAverageDTO[];
  subjectReports: SubjectReportDTO[];
}
// =========================================================================
//
// QUERIES (FETCHING) HOOKS
//
// =========================================================================

/**
 * Fetches the weighted average note for a specific discipline.
 * @param disciplineId The ID of the discipline.
 * @returns A query object with the average note.
 */
export const useGetDisciplineAverage = (disciplineId: string) => {
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;

  return useQuery<number | null>({
    queryKey: ["discipline-average", disciplineId, schoolId],
    queryFn: async () => {
      const { data } = await httpClient.get(
        `/api/schools/${schoolId}/notes/averages/disciplines/${disciplineId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        },
      );
      return data;
    },
    enabled: !!disciplineId && !!schoolId,
  });
};

/**
 * Fetches the detailed average note for a specific class.
 * @param classeId The ID of the class.
 * @returns A query object with the detailed class average.
 */
export const useGetClasseAverage = (classeId: string) => {
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;

  return useQuery<ClasseAverageDTO | null>({
    queryKey: ["classe-average", classeId, schoolId],
    queryFn: async () => {
      const { data } = await httpClient.get(
        `/api/schools/${schoolId}/notes/averages/classes/${classeId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        },
      );
      return data;
    },
    enabled: !!classeId && !!schoolId,
  });
};

/**
 * Fetches the weighted average note for a specific student.
 * @param studentId The ID of the student.
 * @returns A query object with the average note.
 */
export const useGetStudentAverage = (studentId: string) => {
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;

  return useQuery<number | null>({
    queryKey: ["student-average", studentId, schoolId],
    queryFn: async () => {
      const { data } = await httpClient.get(
        `/api/schools/${schoolId}/notes/averages/students/${studentId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        },
      );
      return data;
    },
    enabled: !!studentId && !!schoolId,
  });
};

/**
 * Fetches the detailed average note for an entire school.
 * @returns A query object with the detailed school average.
 */
export const useGetSchoolAverage = (semester: string = "1") => {
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;

  return useQuery<SchoolAverageDTO | null>({
    queryKey: ["school-average", schoolId, semester, localStorage.getItem("academicYear") || "2026-2027"],
    queryFn: async () => {
      const params: any = {};
      if (semester && semester !== "annual") {
        params.semester = semester;
      }

      const { data } = await httpClient.get(`/api/schools/${schoolId}/notes/averages/schools`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        params,
      });
      return data;
    },
    enabled: !!schoolId,
  });
};

/**
 * Fetches the detailed average note for an entire school or for a specific class.
 * @returns A query object with the detailed school average.
 */
export const useGetClasseAverageOrAll = (classeId: string) => {
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;

  const { data: schoolResults } = useGetSchoolAverage(); // You already use this
  const classIds = schoolResults?.classAverages.map((ca) => ca.classeId) ?? [];

  return useQuery({
    queryKey: ["classe-average-or-all", classeId, schoolId, localStorage.getItem("academicYear") || "2026-2027"],
    queryFn: async () => {
      if (!schoolId) return null;

      if (classeId === "allClass") {
        // Fetch all class averages in parallel
        const results = await Promise.all(
          classIds.map(
            (id) =>
              httpClient
                .get(`/api/schools/${schoolId}/notes/averages/classes/${id}`, {
                  headers: {
                    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                  },
                })
                .then((res) => res.data)
                .catch(() => null), // optional: avoid breaking if one fails
          ),
        );

        return results.filter((r) => r !== null); // remove failed ones
      } else {
        // Fetch one specific class
        const { data } = await httpClient.get(
          `/api/schools/${schoolId}/notes/averages/classes/${classeId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
          },
        );
        return data;
      }
    },
    enabled: !!classeId && !!schoolId && (classeId !== "allClass" || classIds.length > 0),
  });
};
