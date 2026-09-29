import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSchoolLogo } from "@/hooks/useSchoolLogo";
import { useGetClasseAverage } from "@/hooks/useAverage";
import { generateClassGradeReport } from "@/utils/generateClassGradeReport";

interface Grade {
  subject: string;
  grade: number;
  coefficient: number;
  date: string;
  appreciation?: string;
  devoir?: boolean;
  semester?: string;
}

interface GradesTabProps {
  grades: Grade[];
  classeId?: string;
  studentId?: string;
}

const GradesTab = ({ grades, classeId, studentId }: GradesTabProps) => {
  const logo = useSchoolLogo();
  const { data: classeReport, isLoading: isLoadingReport } = useGetClasseAverage(classeId || "");
  const [selectedSemester, setSelectedSemester] = useState("Semestre 1");

  const handleDownloadReport = () => {
    if (classeReport && studentId) {
      generateClassGradeReport(classeReport, logo, {
        studentId,
        role: "parent",
      });
    }
  };

  const filteredGrades = grades.filter((g) => {
    if (!g.semester) return true; // Show all if no semester is specified (fallback)
    return g.semester === selectedSemester;
  });

  // 1. Group grades by subject
  const subjects = Array.from(new Set(filteredGrades.map((g) => g.subject)));

  // Define academic months order
  const allMonths = [
    "Octobre",
    "Novembre",
    "Décembre",
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
  ];

  const getMonthName = (dateStr: string) => {
    // dateStr is DD/MM/YYYY from ParentDashboard
    const parts = dateStr.split("/");
    if (parts.length !== 3) return "";
    const [day, month, year] = parts;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    // capitalize first letter
    const monthName = date.toLocaleString("fr-FR", { month: "long" });
    return monthName.charAt(0).toUpperCase() + monthName.slice(1);
  };

  // Helper to get grades for a specific subject and month (excluding compositions)
  const getGradesForMonth = (subject: string, monthName: string) => {
    return filteredGrades.filter(
      (g) =>
        g.subject === subject &&
        g.devoir !== false && // Consider undefined as devoir=true (default) or check explicitly
        getMonthName(g.date).toLowerCase() === monthName.toLowerCase()
    );
  };

  // Helper to get composition grades
  const getCompositionGrades = (subject: string) => {
    return filteredGrades.filter((g) => g.subject === subject && g.devoir === false);
  };

  // Filter months that actually have data
  const monthsWithData = allMonths.filter(month => {
    return subjects.some(subject => getGradesForMonth(subject, month).length > 0);
  });

  return (
    <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
      <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="text-gray-900 dark:text-white flex items-center gap-3">
            Bulletins de notes
            {classeReport?.average && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200">
                Moyenne Classe: {classeReport.average}/20
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-300">
            Vue détaillée par mois et par matière
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={selectedSemester} onValueChange={setSelectedSemester} className="w-[300px]">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="Semestre 1">Semestre 1</TabsTrigger>
              <TabsTrigger value="Semestre 2">Semestre 2</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {classeId && studentId && (
          <Button
            onClick={handleDownloadReport}
            disabled={!classeReport || isLoadingReport}
            variant="outline"
            size="sm">
            {isLoadingReport ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Télécharger Carnet
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {filteredGrades.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Aucune note disponible pour ce semestre
            </p>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-900">
                  <TableHead className="w-[150px] font-bold text-gray-900 dark:text-white sticky left-0 bg-gray-50 dark:bg-gray-900 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                    Matière
                  </TableHead>
                  {monthsWithData.map((month) => (
                    <TableHead key={month} className="text-center min-w-[100px] font-semibold text-gray-700 dark:text-gray-300">
                      {month}
                    </TableHead>
                  ))}
                  <TableHead className="text-center font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 min-w-[120px]">
                    Compo.
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map((subject) => (
                  <TableRow key={subject} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                    <TableCell className="font-medium text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-gray-800 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                      {subject}
                    </TableCell>
                    {monthsWithData.map((month) => {
                      const monthGrades = getGradesForMonth(subject, month);
                      return (
                        <TableCell key={month} className="text-center p-2">
                          <div className="flex flex-wrap justify-center gap-1.5">
                            {monthGrades.map((g, idx) => (
                              <div
                                key={idx}
                                className={`flex flex-col items-center justify-center min-w-[2rem] p-1 rounded border ${g.grade >= 10
                                  ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
                                  : "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
                                  }`}
                                title={`Date: ${g.date}\nCoef: ${g.coefficient}\n${g.appreciation ? 'Appréciation: ' + g.appreciation : ''}`}
                              >
                                <span className="text-sm font-bold">{g.grade}</span>
                                <span className="text-[10px] opacity-70">c{g.coefficient}</span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center bg-blue-50/30 dark:bg-blue-900/10 p-2">
                      <div className="flex flex-wrap justify-center gap-1.5">
                        {getCompositionGrades(subject).map((g, idx) => (
                          <div
                            key={idx}
                            className={`flex flex-col items-center justify-center min-w-[2.25rem] p-1 rounded border ${g.grade >= 10
                              ? "bg-green-100 border-green-300 text-green-800 dark:bg-green-900/40 dark:border-green-700 dark:text-green-300"
                              : "bg-red-100 border-red-300 text-red-800 dark:bg-red-900/40 dark:border-red-700 dark:text-red-300"
                              }`}
                            title={`Date: ${g.date}\nCoef: ${g.coefficient}\nComposition\n${g.appreciation ? 'Appréciation: ' + g.appreciation : ''}`}
                          >
                            <span className="text-base font-extrabold">{g.grade}</span>
                            <span className="text-[10px] opacity-70">c{g.coefficient}</span>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GradesTab;
