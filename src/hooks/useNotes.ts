import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast"; // Assuming this path for your toast component
import { useAuth } from "@/hooks/useAuth"; // Assuming a custom hook to get auth user
import httpClient from "@/api/htppClient";
import { apiUrl } from "@/integrations/supabase/host";

export interface Note {
  id: string;
  createdAt: Date;
  classeId: string;
  type: string;
  devoir: boolean;
  note: number;
  date: Date;
  appreciation: string | null;
  coefficient: number;
  disciplineId: string;
  professeurId: string;
  studentId: string;
  schoolId: string;
  school?: any;
  discipline?: any;
  professeur?: any;
  student?: any;
  classe?: any;
}
// Define the payload types for mutations to ensure type safety.
type CreateNotePayload = {
  classeId: string;
  studentId: string;
  disciplineId: string;
  professeurId: string;
  type: string;
  devoir: boolean;
  note: number;
  date: string;
  coefficient: number;
  appreciation?: string | null;
  semester: string;
};

type UpdateNotePayload = Partial<Omit<Note, "id" | "createdAt" | "schoolId">>;

// ---------------------------------------------
// Read Operations (Queries)
// ---------------------------------------------

/**
 * Fetches a single note by its ID.
 * @param noteId The ID of the note to fetch.
 * @returns A query object with the note data.
 */
export const useGetNoteById = (noteId: string) => {
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;

  return useQuery<Note | null>({
    queryKey: ["note", noteId],
    queryFn: async () => {
      if (!schoolId) {
        throw new Error("School ID is not available.");
      }
      const { data } = await httpClient.get(`/api/schools/${schoolId}/notes/${noteId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      return data;
    },
    enabled: !!schoolId && !!noteId,
  });
};

/**
 * Fetches all notes for a specific student.
 * @param studentId The ID of the student.
 * @returns A query object with the list of notes.
 */
export const useGetNotesByStudentId = (studentId: string) => {
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;

  return useQuery<Note[]>({
    queryKey: ["notes", "student", studentId],
    queryFn: async () => {
      if (!schoolId) {
        throw new Error("School ID is not available.");
      }
      const { data } = await httpClient.get(
        `/api/schools/${schoolId}/notes/students/${studentId}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } },
      );
      return data;
    },
    enabled: !!schoolId && !!studentId,
  });
};

/**
 * Fetches all notes for a specific class.
 * @param classeId The ID of the class.
 * @returns A query object with the list of notes.
 */
export const useGetNotesByClasseId = (classeId: string) => {
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;

  return useQuery<Note[]>({
    queryKey: ["notes", "classe", classeId],
    queryFn: async () => {
      if (!schoolId) {
        throw new Error("School ID is not available.");
      }
      const { data } = await httpClient.get(`/api/schools/${schoolId}/notes/classes/${classeId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      return data;
    },
    enabled: !!schoolId && !!classeId,
  });
};

/**
 * Fetches all notes for a specific discipline.
 * @param disciplineId The ID of the discipline.
 * @returns A query object with the list of notes.
 */
export const useGetNotesByDisciplineId = (disciplineId: string) => {
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;

  return useQuery<Note[]>({
    queryKey: ["notes", "discipline", disciplineId],
    queryFn: async () => {
      if (!schoolId) {
        throw new Error("School ID is not available.");
      }
      const { data } = await httpClient.get(
        `/api/schools/${schoolId}/notes/disciplines/${disciplineId}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } },
      );
      return data;
    },
    enabled: !!schoolId && !!disciplineId,
  });
};

/**
 * Fetches all notes for a specific teacher.
 * @param professeurId The ID of the teacher.
 * @returns A query object with the list of notes.
 */
export const useGetNotesByTeacherId = (professeurId: string) => {
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;

  return useQuery<Note[]>({
    queryKey: ["notes", "teacher", professeurId],
    queryFn: async () => {
      if (!schoolId) {
        throw new Error("School ID is not available.");
      }
      const { data } = await httpClient.get(
        `/api/schools/${schoolId}/notes/professors/${professeurId}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } },
      );
      return data;
    },
    enabled: !!schoolId && !!professeurId,
  });
};

/**
 * Fetches all notes for a specific school.
 * @returns A query object with the list of notes.
 */
export const useGetNotesBySchoolId = () => {
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;

  return useQuery<Note[]>({
    queryKey: ["notes", "school", schoolId],
    queryFn: async () => {
      if (!schoolId) {
        throw new Error("School ID is not available.");
      }
      const { data } = await httpClient.get(`/api/schools/${schoolId}/notes`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      return data;
    },
    enabled: !!schoolId,
  });
};

// ---------------------------------------------
// Write Operations (Mutations)
// ---------------------------------------------

/**
 * Creates a new note.
 * @returns A mutation object with mutate, isLoading, and error status.
 */
export const useCreateNote = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;

  return useMutation<Note, Error, CreateNotePayload>({
    mutationFn: async (newNote: CreateNotePayload) => {
      console.log("newNote", newNote);
      if (!schoolId) {
        throw new Error("School ID is not available.");
      }
      const { data } = await httpClient.post(
        `/api/schools/${schoolId}/classes/${newNote.classeId}/notes`,
        newNote,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        },
      );
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Note created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.reason || "An error occurred while creating the note.";
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
};

/**
 * Updates an existing note.
 * @returns A mutation object with mutate, isLoading, and error status.
 */
export const useUpdateNote = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;

  return useMutation<Note, Error, { id: string; data: UpdateNotePayload }>({
    mutationFn: async ({ id, data: updatedNote }: { id: string; data: UpdateNotePayload }) => {
      if (!schoolId) {
        throw new Error("School ID is not available.");
      }
      const { data } = await httpClient.patch(`/api/schools/${schoolId}/notes/${id}`, updatedNote, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Note updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["classe-average"] });
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.reason || "An error occurred while updating the note.";
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
};

/**
 * Deletes a note.
 * @returns A mutation object with mutate, isLoading, and error status.
 */
export const useDeleteNote = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { authUser } = useAuth();
  const schoolId = authUser?.schoolId;

  return useMutation<Note, Error, string>({
    mutationFn: async (noteId: string) => {
      if (!schoolId) {
        throw new Error("School ID is not available.");
      }
      const { data } = await httpClient.delete(`/api/schools/${schoolId}/notes/${noteId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Note deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["classe-average"] });
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.reason || "An error occurred while deleting the note.";
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
};

type GradeOutput = {
  id: string;
  student: string;
  class: string;
  subject: string;
  type: string;
  title: string;
  grade: number;
  coefficient: number;
  date: string;
  comment: string;
  extraData: any;
};

export function convertGrades(input: Note[]): GradeOutput[] {
  if (!input) return [];
  return input.map((item) => ({
    id: item.id, // Assuming the ID starts from 1 and increments
    student: `${item.student.prenom} ${item.student.nom}`, // Assuming you can map studentId to actual student name
    class: `${item.classe.niveau} ${item.classe.nom}`, // Same as above, map classeId to class name
    subject: item.discipline.name, // Hardcoded for this example; map disciplineId if needed
    type: item.devoir ? "Devoir" : "Composition", // Assuming the type is "Devoir" or "Composition" based on the word
    title: item.type, // Hardcoded title, can be customized if needed
    grade: item.note,
    coefficient: item.coefficient,
    date: item.date.toString().split("T")[0], // Extract the date part only
    comment: item.appreciation, // Mapping appreciation to comment
    extraData: {
      professeurId: item.professeurId,
      classeId: item.classeId,
      studentId: item.studentId,
      disciplineId: item.disciplineId,
    },
  }));
}

type Grade = {
  devoir: boolean;
  subject: string;
  grade: number;
  coefficient: number;
  date: string;
  type: string;
  appreciation: string;
};

type Attendance = {
  date: string;
  type: "ABSCENCE" | "RETARD" | string;
  course: string;
};

type SourceStudent = {
  id: string;
  firstName: string;
  lastName: string;
  grades: Grade[];
  attendance: Attendance[];
  subjectAverages: Record<string, number>;
  generalAverage: number;
  classe: string;
};

type StudentData = {
  nom: string;
  prenom: string;
  classe: string;
  notes: {
    devoirs: { matiere: string; note: number; date: string }[];
    compositions: { matiere: string; note: number; date: string }[];
  };
  moyenne: number;
  absences: number;
  retards: number;
};

export const convertStudents = (students: SourceStudent[]): StudentData[] => {
  if (!students) {
    return [];
  }

  return students.map((s) => {
    const prenom = s.firstName;
    const nom = s.lastName;
    const classe = s.classe;

    const devoirs = s.grades
      .filter((g) => g.devoir === true)
      .map((g) => ({
        matiere: g.subject,
        note: g.grade,
        date: g.date,
      }));

    const compositions = s.grades
      .filter((g) => g.type.toLowerCase().includes("composition"))
      .map((g) => ({
        matiere: g.subject,
        note: g.grade,
        date: g.date,
      }));

    const absences = s.attendance.filter((a) => a.type === "ABSCENCE").length;
    const retards = s.attendance.filter((a) => a.type === "RETARD").length;

    const result = {
      nom: nom ?? "",
      prenom: prenom ?? "",
      classe,
      notes: {
        devoirs,
        compositions,
      },
      moyenne: Number(s?.generalAverage?.toFixed(2) ?? 0),
      absences,
      retards,
    };
    return result;
  });
};
