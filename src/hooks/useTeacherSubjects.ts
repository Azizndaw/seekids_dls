import { useQuery } from "@tanstack/react-query";

export const useAllTeachersSubjects = (teacherIds: string[]) => {
  return useQuery({
    queryKey: ["all-teachers-subjects", teacherIds],
    queryFn: async () => {
      // Simulation des matières assignées aux professeurs
      const simulatedAssignments: Record<string, string[]> = {
        // Quelques exemples d'assignations simulées basées sur les matières par défaut
      };

      return simulatedAssignments;
    },
    enabled: teacherIds.length > 0,
  });
};
