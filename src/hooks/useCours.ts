import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth"; // Assuming you have a useAuth hook
import { useToast } from "@/components/ui/use-toast"; // Assuming a toast library
import httpClient from "@/api/htppClient";
import { apiUrl } from "@/integrations/supabase/host";

// --- Type Definitions for nested objects ---
type Discipline = {
  id: string;
  name: string;
};

type Professeur = {
  id: string;
  nom: string;
  prenom: string;
};

type Classe = {
  id: string;
  nom: string;
  niveau: string;
};

// --- Updated Course Type ---
export type Cours = {
  id: string;
  jour: string;
  heure: string;
  disciplineId: string;
  professeurId: string;
  classeId: string;
  schoolId: string;
  // Include the nested objects returned by the API
  discipline: Discipline;
  professeur: Professeur;
  classe: Classe;
};

// Define types for the mutation payloads for better type safety.
type CreateCoursPayload = {
  jour: string;
  heure: string;
  disciplineId: string;
  professeurId: string;
  classeId: string;
};

type UpdateCoursPayload = {
  jour?: string;
  heure?: string;
  disciplineId?: string;
  professeurId?: string;
  classeId?: string;
};

// --- Utility Function for Data Transformation ---
/**
 * Transforms an array of courses into a schedule object grouped by day.
 * @param courses The array of courses to transform.
 * @returns An object where keys are days of the week and values are arrays of courses for that day.
 */
function normalizeTime(raw: string): string {
  // If it's already in "08:00 - 09:00" format, return it
  if (raw.includes(" - ")) return raw;

  // Convert "08:00" or "09:00" → "08:00 - 09:00"
  const [hour, _] = raw.split(":");
  const startHour = parseInt(hour);
  const endHour = startHour + 1;

  const pad = (n: number) => n.toString().padStart(2, "0");

  return `${pad(startHour)}:00 - ${pad(endHour)}:00`;
}

// ---------------------------------------------
// Read Operations (Queries)
// ---------------------------------------------

/**
 * Fetches all courses for the authenticated user's school.
 * @returns A query object with data, isLoading, and error status.
 */
export const useGetAllCours = () => {
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;

  return useQuery<Cours[]>({
    queryKey: ["all-courses", schoolId],
    queryFn: async () => {
      const { data } = await httpClient.get(`/api/schools/${schoolId}/cours`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      return data;
    },
    enabled: !!schoolId,
  });
};

/**
 * Fetches a single course by its ID.
 * @param coursId The ID of the course to fetch.
 * @returns A query object with the course data.
 */
export const useGetCoursById = (coursId: string) => {
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;

  return useQuery<Cours>({
    queryKey: ["course", coursId, schoolId],
    queryFn: async () => {
      const { data } = await httpClient.get(`/api/schools/${schoolId}/cours/${coursId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      return data;
    },
    enabled: !!coursId && !!schoolId,
  });
};

/**
 * Fetches courses for a specific professor.
 * @param professeurId The ID of the professor.
 * @returns A query object with the list of courses.
 */
export const useGetCoursByProfesseur = () => {
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;

  return useQuery<Cours[]>({
    queryKey: ["courses-by-professor", authUser?.id, schoolId],
    queryFn: async () => {
      const { data } = await httpClient.get(
        `/api/schools/${schoolId}/cours/professeur/${authUser?.id}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } }
      );
      return data;
    },
    enabled: !!authUser && !!schoolId,
  });
};

/**
 * Fetches courses for a specific professor by their ID.
 * @param professeurId The ID of the professor.
 * @returns A query object with the list of courses.
 */
export const useGetCoursesByTeacherId = (professeurId: string) => {
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;

  return useQuery<Cours[]>({
    queryKey: ["courses-by-teacher-id", professeurId, schoolId],
    queryFn: async () => {
      const { data } = await httpClient.get(
        `/api/schools/${schoolId}/cours/professeur/${professeurId}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } }
      );
      return data;
    },
    enabled: !!professeurId && !!schoolId,
  });
};

/**
 * Fetches courses for a specific class.
 * @param classeId The ID of the class.
 * @returns A query object with the list of courses.
 */
export const useGetCoursByClasse = (classeId: string) => {
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;

  return useQuery<Cours[]>({
    queryKey: ["courses-by-class", classeId, schoolId],
    queryFn: async () => {
      const { data } = await httpClient.get(`/api/schools/${schoolId}/cours/classe/${classeId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      return data;
    },
    enabled: !!classeId && !!schoolId,
  });
};

/**
 * Fetches courses for a specific day.
 * @param day The day of the week (e.g., "Lundi").
 * @returns A query object with the list of courses.
 */
export const useGetCoursByDay = (day: string) => {
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;

  return useQuery<Cours[]>({
    queryKey: ["courses-by-day", day, schoolId],
    queryFn: async () => {
      const { data } = await httpClient.get(`/api/schools/${schoolId}/cours/day/${day}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      return data;
    },
    enabled: !!day && !!schoolId,
  });
};

/**
 * Fetches courses for a specific day and hour.
 * @param day The day of the week.
 * @param hour The hour of the day.
 * @returns A query object with the list of courses.
 */
export const useGetCoursByDayAndHour = (day: string, hour: string) => {
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;

  return useQuery<Cours[]>({
    queryKey: ["courses-by-day-hour", day, hour, schoolId],
    queryFn: async () => {
      const { data } = await httpClient.get(
        `/api/schools/${schoolId}/cours/day/${day}/hour/${hour}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } }
      );
      return data;
    },
    enabled: !!day && !!hour && !!schoolId,
  });
};

/**
 * Fetches courses for a specific week.
 * @param weekStart The start date of the week.
 * @param weekEnd The end date of the week.
 * @returns A query object with the list of courses.
 */
export const useGetCoursByWeek = (weekStart: string, weekEnd: string) => {
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;

  return useQuery<Cours[]>({
    queryKey: ["courses-by-week", weekStart, weekEnd, schoolId],
    queryFn: async () => {
      const { data } = await httpClient.get(
        `/api/schools/${schoolId}/cours/week/${weekStart}/${weekEnd}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } }
      );
      return data;
    },
    enabled: !!weekStart && !!weekEnd && !!schoolId,
  });
};

// ---------------------------------------------
// Write Operations (Mutations)
// ---------------------------------------------

/**
 * Creates a new course.
 * @returns A mutation object with mutate, isLoading, and error status.
 */
export const useCreateCours = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;

  return useMutation<Cours, Error, CreateCoursPayload>({
    mutationFn: async (newCours: CreateCoursPayload) => {
      if (!schoolId) {
        throw new Error("School ID is not available.");
      }
      const { data } = await httpClient.post(`/api/schools/${schoolId}/cours`, newCours, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Cours créé avec succès.",
      });
      // Invalidate queries that fetch lists of courses to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ["all-courses"] });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.reason || "Erreur lors de la création du cours.";
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
};

/**
 * Updates an existing course.
 * @returns A mutation object.
 */
export const useUpdateCours = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;

  return useMutation<Cours, Error, { coursId: string; data: UpdateCoursPayload }>({
    mutationFn: async ({ coursId, data: updatedData }) => {
      if (!schoolId) {
        throw new Error("School ID is not available.");
      }
      const { data } = await httpClient.put(
        `/api/schools/${schoolId}/cours/${coursId}`,
        updatedData,
        { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } }
      );
      return data;
    },
    onSuccess: (updatedCours) => {
      toast({
        title: "Succès",
        description: "Cours mis à jour avec succès.",
      });
      // Invalidate the specific course and all relevant lists
      queryClient.invalidateQueries({ queryKey: ["course", updatedCours.id] });
      queryClient.invalidateQueries({ queryKey: ["all-courses"] });
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.reason || "Erreur lors de la mise à jour du cours.";
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
};

/**
 * Deletes a course by its ID.
 * @returns A mutation object.
 */
export const useDeleteCours = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;

  return useMutation<void, Error, string>({
    mutationFn: async (coursId: string) => {
      if (!schoolId) {
        throw new Error("School ID is not available.");
      }
      await httpClient.delete(`/api/schools/${schoolId}/cours/${coursId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
    },
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Cours supprimé avec succès.",
      });
      // Invalidate all course lists to reflect the deletion
      queryClient.invalidateQueries({ queryKey: ["all-courses"] });
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.reason || "Erreur lors de la suppression du cours.";
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
};

/**
 * Assigns a professor to a course.
 * @returns A mutation object.
 */
export const useAssignProfesseurToCours = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;

  return useMutation<Cours, Error, { coursId: string; professeurId: string }>({
    mutationFn: async ({ coursId, professeurId }) => {
      if (!schoolId) {
        throw new Error("School ID is not available.");
      }
      const { data } = await httpClient.post(
        `/api/schools/${schoolId}/cours/${coursId}/professeur`,
        { professeurId },
        { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } }
      );
      return data;
    },
    onSuccess: (updatedCours) => {
      toast({
        title: "Succès",
        description: "Professeur assigné avec succès.",
      });
      //   Invalidate the specific course and relevant lists
      queryClient.invalidateQueries({ queryKey: ["course", updatedCours.id] });
      queryClient.invalidateQueries({ queryKey: ["all-courses"] });
      queryClient.invalidateQueries({ queryKey: ["courses-by-professor"] });
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.reason || "Erreur lors de l'assignation du professeur.";
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
};

/**
 * Assigns a matiere (discipline) to a course.
 * @returns A mutation object.
 */
export const useAssignMatiereToCours = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;

  return useMutation<Cours, Error, { coursId: string; matiereId: string }>({
    mutationFn: async ({ coursId, matiereId }) => {
      if (!schoolId) {
        throw new Error("School ID is not available.");
      }
      const { data } = await httpClient.post(
        `/api/schools/${schoolId}/cours/${coursId}/matiere`,
        { matiereId },
        { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } }
      );
      return data;
    },
    onSuccess: (updatedCours) => {
      toast({
        title: "Succès",
        description: "Matière assignée avec succès.",
      });
      // Invalidate the specific course and relevant lists
      queryClient.invalidateQueries({ queryKey: ["course", updatedCours.id] });
      queryClient.invalidateQueries({ queryKey: ["all-courses"] });
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.reason || "Erreur lors de l'assignation de la matière.";
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
};

// ---------------------------------------------
// Data transformation Bro
// ---------------------------------------------

/**
 * Transforms a flat array of course objects into a nested, grouped schedule object.
 * * The function groups courses by the day of the week and simplifies the data
 * for display purposes, handling different time string formats.
 *
 * @param {Array<Object>} courses - The raw array of course objects from the API.
 * @returns {Object} A nested object where keys are days of the week and values are
 * arrays of simplified course objects.
 */
export function transformCoursesToParents(courses) {
  // Helper function to format a single hour string like "09:00"
  const formatHourString = (hourStr) => {
    return hourStr.replace("h", ":").padEnd(5, "0");
  };

  // The main reduce method to build the final schedule object
  const schedule = courses.reduce((acc, course) => {
    // Determine the day of the week to use as the key
    const day = course.jour;

    // --- Step 1: Format the time string ---
    let timeRange = "";
    // Check for a time range (e.g., "08h - 11h")
    if (course.heure.includes("-")) {
      const [start, end] = course.heure.split(" - ");
      timeRange = `${formatHourString(start)}-${formatHourString(end)}`;
    } else {
      // Assume a 1-hour duration for a single time (e.g., "09:00")
      const startHour = parseInt(course.heure.split(":")[0]);
      const endHour = startHour + 1;
      timeRange = `${formatHourString(course.heure)}-${endHour.toString().padStart(2, "0")}:00`;
    }

    // --- Step 2: Extract and rename properties ---
    const simplifiedCourse = {
      time: timeRange,
      subject: course.discipline.name,
      teacher: `${course.professeur.prenom} ${course.professeur.nom}`,
    };

    // --- Step 3: Add the simplified course to the accumulator object ---
    // If the day doesn't exist in the schedule yet, create a new array for it
    if (!acc[day]) {
      acc[day] = [];
    }
    // Push the new simplified course into the correct day's array
    acc[day].push(simplifiedCourse);

    return acc;
  }, {}); // The initial value for the accumulator is an empty object

  return schedule;
}

export function transformCoursesToAdminSchedule(courses: Cours[]): any {
  const schedule: any = {};

  for (const course of courses) {
    const day = course.jour;
    const time = normalizeTime(course.heure); // Normalize to a consistent format
    const startTime = time.split("-")[0];
    const endTime = time.split("-")[1];
    const subject = course.discipline.name;
    const classeId = course.classe.id;
    const className = `${course.classe.niveau} ${course.classe.nom}`;
    const teacherName = `Prof. ${course.professeur.prenom} ${course.professeur.nom}`;
    const teacherId = course.professeur.id;
    const subjectId = course.discipline.id;

    if (!schedule[day]) {
      schedule[day] = [];
    }

    schedule[day].push({
      id: course.id,
      subject,
      class: className,
      teacher: teacherName,
      classeId,
      startTime,
      endTime,
      teacherId,
      subjectId,
    });
  }

  return schedule;
}

/**
 * Transforms a flat array of detailed course objects into a simplified
 * schedule object, grouped by day.
 *
 * @param {Array<Object>} courses - The raw array of course objects from an API.
 * @returns {Object} A nested object where keys are days of the week and values are
 * arrays of simplified course objects.
 */
export function transformToTeacherDailySchedule(courses: Array<any>): object {
  return courses.reduce((acc, course) => {
    // Extract and simplify the required properties
    const transformedCourse = {
      // The time field needs to handle both single hours and ranges
      time: course.heure,
      class: `${course.classe.niveau} ${course.classe.nom}`,
      subject: course.discipline.name,
      students: course.classe.effectif,
    };

    const day = course.jour;

    // Initialize the day's array if it doesn't exist
    if (!acc[day]) {
      acc[day] = [];
    }

    // Add the simplified course to the correct day
    acc[day].push(transformedCourse);

    return acc;
  }, {});
}

/**
 * Transforms a flat array of course objects into a simplified list of
 * recent/upcoming classes, calculating the status based on the current time.
 *
 * @param {Array<Object>} courses - The raw array of course objects from an API.
 * @returns {Array<Object>} An array of simplified class objects with status.
 */
export function transformToRecentClasses(courses: any[]): Array<any> {
  // Use a fixed timestamp for this example, based on the server's time.
  const weekDays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

  const now = new Date();
  const coursesOfToday = courses.filter((c) => c.jour === weekDays[now.getDay() - 1]);

  return coursesOfToday.map((course) => {
    // Determine the start and end hours from the 'heure' string.
    let startHour, endHour;
    const timeParts = course.heure.split(" - ");
    if (timeParts.length === 2) {
      startHour = parseInt(timeParts[0].replace("h", ""));
      endHour = parseInt(timeParts[1].replace("h", ""));
    } else {
      startHour = parseInt(timeParts[0].replace("h", ""));
      endHour = startHour + 1;
    }

    // Get the current day of the week (0 for Sunday, 1 for Monday, etc.)
    const currentDay = now.toLocaleString("fr-FR", { weekday: "long" });
    const courseDay = course.jour;

    // Determine the course status
    let status = "À venir"; // Default status is "À venir"

    // Only check the status for today's courses
    if (currentDay.toLowerCase() === courseDay.toLowerCase()) {
      const currentHour = (now.getUTCHours() + 2) / 24;

      // Check if the current time is within the course's time range
      if (currentHour >= startHour && currentHour < endHour) {
        status = "En cours"; // The course is ongoing
      } else if (currentHour >= endHour) {
        status = "Passé"; // The course has already passed
      }
    }

    // Return the new, simplified object
    return {
      name: course.classe.nom,
      subject: course.discipline.name,
      time: course.heure,
      students: course.classe.effectif,
      status: status,
    };
  });
}

export function getNextClass(classes) {
  // Check if the classes array is empty or null
  if (!Array.isArray(classes) || classes.length === 0) {
    return null; // No classes available
  }

  const now = new Date();

  // Convert current time to 'HH:mm' format
  const currentTime =
    now.getHours().toString().padStart(2, "0") + ":" + now.getMinutes().toString().padStart(2, "0");

  // Filter out invalid or incomplete class objects (e.g., null or missing time)
  const validClasses = classes
    .filter((course) => course && course.time && typeof course.time === "string") // Ensure valid course objects
    .map((course) => {
      const [start, end] = course.time.split("-");
      return {
        ...course,
        startTime: start,
        endTime: end,
      };
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime)); // Sort by start time

  // If there are no valid classes after filtering
  if (validClasses.length === 0) {
    return null;
  }

  // Find the next class
  for (let i = 0; i < validClasses.length; i++) {
    const course = validClasses[i];
    if (currentTime < course.startTime) {
      return course; // Return the first class that hasn't started yet
    }
  }

  return null; // If no upcoming class is found (e.g., after the last class of the day)
}
