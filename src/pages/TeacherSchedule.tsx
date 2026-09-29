import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { transformToTeacherDailySchedule, useGetCoursByProfesseur } from "@/hooks/useCours";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TeacherSchedule = () => {
  const navigate = useNavigate();
  const [selectedDayIndex, setSelectedDayIndex] = useState(0); // 0 = Lundi
  const { authUser } = useAuth();

  const weekDays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

  const { data: schedule } = useGetCoursByProfesseur();

  const navigateDay = (direction: "prev" | "next") => {
    setSelectedDayIndex((prev) => {
      if (direction === "prev") {
        return prev > 0 ? prev - 1 : 5;
      } else {
        return prev < 5 ? prev + 1 : 0;
      }
    });
  };
  if (!schedule) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }
  const scheduleByDay = transformToTeacherDailySchedule(schedule);

  const getCurrentDaySchedule = () => {
    const dayName = weekDays[selectedDayIndex];
    return scheduleByDay[dayName as keyof typeof scheduleByDay] || [];
  };

  const getDayColor = (index: number) => {
    const colors = [
      "bg-blue-600 hover:bg-blue-700 border-blue-600", // Lundi - Bleu
      "bg-green-600 hover:bg-green-700 border-green-600", // Mardi - Vert
      "bg-purple-600 hover:bg-purple-700 border-purple-600", // Mercredi - Violet
      "bg-orange-600 hover:bg-orange-700 border-orange-600", // Jeudi - Orange
      "bg-red-600 hover:bg-red-700 border-red-600", // Vendredi - Rouge
      "bg-pink-600 hover:bg-pink-700 border-pink-600", // Samedi - Rose
    ];
    return colors[index] || colors[0];
  };

  const getDayOutlineColor = (index: number) => {
    const colors = [
      "border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20", // Lundi
      "border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20", // Mardi
      "border-purple-600 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20", // Mercredi
      "border-orange-600 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20", // Jeudi
      "border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20", // Vendredi
      "border-pink-600 text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-900/20", // Samedi
    ];
    return colors[index] || colors[0];
  };

  const getCurrentWeekLabel = () => {
    const today = new Date();

    const dayOfWeek = today.getDay();
    const mondayOffset = (dayOfWeek + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - mondayOffset);

    // Get current week's Sunday
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const formatOptions: Intl.DateTimeFormatOptions = {
      weekday: "long",
      day: "2-digit",
      month: "long",
    };

    const formatter = new Intl.DateTimeFormat("fr-FR", formatOptions);

    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

    const mondayLabel = capitalize(formatter.format(monday));
    const sundayLabel = capitalize(formatter.format(sunday));

    return `Semaine du ${mondayLabel} au ${sundayLabel}`;
  };

  const getCurrentWeekDates = (): Date[] => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = (dayOfWeek + 6) % 7; // Lezgoooo j'ai la formule

    const monday = new Date(today);
    monday.setDate(today.getDate() - mondayOffset);

    const weekDates: Date[] = [];

    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      weekDates.push(day);
    }

    return weekDates;
  };

  const formatDateToDayAndMonth = (date: Date) => {
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

    const day = String(date.getDate()).padStart(2, "0");
    const month = capitalize(date.toLocaleString("fr-FR", { month: "long" })); // Full month name in French
    return `${day} ${month}`;
  };
  const weekDates = getCurrentWeekDates();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-3 sm:p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/teacher-dashboard")}
            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Planning des Cours
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
              Emploi du temps - Pr. {authUser.prenom} {authUser.nom}
            </p>
          </div>
        </div>

        {/* Week Navigation */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-gray-800/20">
          <CardHeader className="border-b border-gray-200 dark:border-gray-700">
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              {getCurrentWeekLabel()}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-800">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {weekDays.map((day, index) => (
                <Button
                  key={day}
                  variant={index === selectedDayIndex ? "default" : "outline"}
                  className={`h-auto p-4 flex flex-col items-center transition-all duration-200 ${
                    index === selectedDayIndex
                      ? `${getDayColor(index)} text-white`
                      : `bg-white dark:bg-gray-700 ${getDayOutlineColor(index)} dark:text-gray-300`
                  }`}
                  onClick={() => setSelectedDayIndex(index)}>
                  <span className="font-medium">{day}</span>
                  <span
                    className={`text-sm ${
                      index === selectedDayIndex
                        ? "text-white/80"
                        : "text-gray-500 dark:text-gray-400"
                    }`}>
                    {formatDateToDayAndMonth(weekDates[index])}
                  </span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Day Navigation Controls */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-gray-800/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDay("prev")}
                className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Jour précédent
              </Button>

              <div className="text-center">
                <h2 className={`text-lg font-semibold text-gray-900 dark:text-white`}>
                  {weekDays[selectedDayIndex]}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {formatDateToDayAndMonth(weekDates[selectedDayIndex])}
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDay("next")}
                className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600">
                Jour suivant
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Today's Schedule */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-gray-800/20">
          <CardHeader className="border-b border-gray-200 dark:border-gray-700">
            <CardTitle className="text-gray-900 dark:text-white">
              Emploi du temps - {weekDays[selectedDayIndex]}{" "}
              {formatDateToDayAndMonth(weekDates[selectedDayIndex])}
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Vos cours de la journée
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-800">
            <div className="space-y-4">
              {getCurrentDaySchedule().length > 0 ? (
                getCurrentDaySchedule().map((course, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-700 transition-colors duration-200">
                    <div className="flex items-center space-x-4">
                      <div
                        className={`p-2 rounded-lg ${
                          selectedDayIndex === 0
                            ? "bg-blue-100 dark:bg-blue-900/30"
                            : selectedDayIndex === 1
                            ? "bg-green-100 dark:bg-green-900/30"
                            : selectedDayIndex === 2
                            ? "bg-purple-100 dark:bg-purple-900/30"
                            : selectedDayIndex === 3
                            ? "bg-orange-100 dark:bg-orange-900/30"
                            : selectedDayIndex === 4
                            ? "bg-red-100 dark:bg-red-900/30"
                            : "bg-pink-100 dark:bg-pink-900/30"
                        }`}>
                        <Clock
                          className={`w-5 h-5 ${
                            selectedDayIndex === 0
                              ? "text-blue-600 dark:text-blue-300"
                              : selectedDayIndex === 1
                              ? "text-green-600 dark:text-green-300"
                              : selectedDayIndex === 2
                              ? "text-purple-600 dark:text-purple-300"
                              : selectedDayIndex === 3
                              ? "text-orange-600 dark:text-orange-300"
                              : selectedDayIndex === 4
                              ? "text-red-600 dark:text-red-300"
                              : "text-pink-600 dark:text-pink-300"
                          }`}
                        />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {course.class} - {course.subject}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {course.time} • {course.room}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant="outline"
                        className="text-xs bg-gray-50 dark:bg-gray-600 border-gray-200 dark:border-gray-500 text-gray-700 dark:text-gray-300">
                        <Users className="w-3 h-3 mr-1" />
                        {course.students} élèves
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p>Aucun cours programmé pour ce jour</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeacherSchedule;
