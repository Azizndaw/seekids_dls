import { format } from "date-fns";
import { fr } from "date-fns/locale";

type AttendanceStatus = "ABSCENCE" | "RETARD" | "PRESENCE";

interface NotificationOptions {
  studentName?: string; // Required for absent or late
  className?: string; // Required for present notification
  subject?: string; // Optional
  date: Date; // Date of the class
  type: AttendanceStatus;
  reason?: string; // Optional, for late
  urgent?: boolean; // Optional, defaults to false
}

/**
 * Generates French notification text for attendance
 */
export const generateAttendanceNotification = ({
  studentName,
  className,
  subject,
  date,
  type: status,
  reason,
  urgent = false,
}: NotificationOptions) => {
  const formattedDate = format(date, "dd/MM/yyyy", { locale: fr });
  const emoji = urgent ? "⚠️ " : "";

  switch (status) {
    case "ABSCENCE":
      if (!studentName || !subject || !className)
        throw new Error("Student name, class, and subject are required for absence.");
      return `${emoji}L'élève ${studentName} de la classe ${className} est absent(e) en ${subject} le ${formattedDate}.`;

    case "RETARD":
      if (!studentName || !subject || !className)
        throw new Error("Student name, class, and subject are required for late.");
      return `${emoji}L'élève ${studentName} de la classe ${className} est en retard en ${subject} le ${formattedDate}${
        reason ? ` - Motif : ${reason}` : ""
      }.`;

    case "PRESENCE":
      if (!className || !subject)
        throw new Error("Class name and subject are required for present notification.");
      return `✅ Tous les élèves de ${className} sont présents en ${subject} le ${formattedDate}.`;

    default:
      throw new Error("Invalid attendance status");
  }
};
