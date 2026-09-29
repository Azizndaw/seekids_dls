import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AbsencesModal from "./AbsencesModal";
import DelaysModal from "./DelaysModal";
import { getAverageInterpretation, getAttendanceAlert, getWeakestSubject } from "@/utils/gradeUtils";
import { AlertTriangle } from "lucide-react";

interface ChildInfoProps {
  childInfo: {
    nom: string;
    prenom: string;
    classe: {
      nom: string;
      niveau: string;
      id: string; // Ensure id is present or passed
    };
    photo: string;
    moyenne: number;
    absence: number;
    retards: number;
    id: string; // Added id
    attendances: any[];
  };
}

const ChildInfo = ({ childInfo }: ChildInfoProps) => {
  const [showAbsencesModal, setShowAbsencesModal] = useState(false);
  const [showDelaysModal, setShowDelaysModal] = useState(false);

  // Données d'exemple pour les absences
  const attendanceData = childInfo.attendances;
  const absencesData = attendanceData.filter((attendance) => attendance.type == "ABSCENCE");
  const delaysData = attendanceData.filter((attendance) => attendance.type == "RETARD");

  const interpretation = getAverageInterpretation(
    childInfo.moyenne,
    getWeakestSubject(childInfo.subjectAverages)
  );
  const attendanceAlert = getAttendanceAlert(childInfo.absence);

  return (
    <>
      <Card className="mb-6 sm:mb-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
              <AvatarImage src={childInfo.photo} alt={childInfo.nom} />
              <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-lg sm:text-xl font-semibold">
                {childInfo.prenom}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {childInfo.prenom} {childInfo.nom}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-3 sm:mb-2 text-sm sm:text-base">
                Classe: {`${childInfo.classe.nom} ${childInfo.classe.niveau}`}
              </p>
              <div className="flex items-center justify-center sm:justify-start space-x-4 sm:space-x-6">
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
                    {childInfo.moyenne}/20
                  </div>
                  <div className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium ${interpretation.bg} ${interpretation.color}`}>
                    {interpretation.label}
                  </div>
                </div>
                <div
                  className="text-center cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-900/20 p-2 rounded-lg transition-colors"
                  onClick={() => setShowAbsencesModal(true)}>
                  <div className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {childInfo.absence}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Absence(s)</div>
                </div>
                <div
                  className="text-center cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors"
                  onClick={() => setShowDelaysModal(true)}>
                  <div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">
                    {childInfo.retards}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Retard(s)</div>
                </div>
              </div>
            </div>
            {attendanceAlert && (
              <div className={`mt-4 sm:mt-0 sm:ml-auto flex items-center gap-2 p-3 rounded-lg border ${attendanceAlert.bg} border-current opacity-90 animate-pulse`}>
                <AlertTriangle className={`h-5 w-5 ${attendanceAlert.color}`} />
                <span className={`text-sm font-bold ${attendanceAlert.color}`}>
                  {attendanceAlert.message}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AbsencesModal
        isOpen={showAbsencesModal}
        onClose={() => setShowAbsencesModal(false)}
        absences={absencesData}
        studentId={childInfo.id}
        classId={childInfo.classe?.id}
      />

      <DelaysModal
        isOpen={showDelaysModal}
        onClose={() => setShowDelaysModal(false)}
        delays={delaysData}
      />
    </>
  );
};

export default ChildInfo;
