import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

interface Course {
  subject: string;
  teacher: string;
  time: string;
}

interface ScheduleTabProps {
  weekSchedule: Record<string, Course[]>;
}

const ScheduleTab = ({ weekSchedule }: ScheduleTabProps) => {
  const weekDays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  console.log("Schedule", weekSchedule);
  const today = new Date();
  const currentDayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1;
  const [selectedDayIndex, setSelectedDayIndex] = useState(
    currentDayIndex >= 6 ? 0 : currentDayIndex
  );

  const getCurrentDate = (dayOffset = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getScheduleForDay = (dayIndex: number) => {
    const dayName = weekDays[dayIndex];
    return weekSchedule[dayName] || [];
  };

  const getCourseColor = (subject: string) => {
    const colors: Record<string, string> = {
      Mathématiques:
        "bg-blue-200 dark:bg-blue-800/30 text-blue-900 dark:text-blue-200 border-blue-500 dark:border-blue-700",
      Physique:
        "bg-green-200 dark:bg-green-800/30 text-green-900 dark:text-green-200 border-green-500 dark:border-green-700",
      Chimie:
        "bg-red-200 dark:bg-red-800/30 text-red-900 dark:text-red-200 border-red-500 dark:border-red-700",
      SVT: "bg-teal-200 dark:bg-teal-800/30 text-teal-900 dark:text-teal-200 border-teal-500 dark:border-teal-700",
      Français:
        "bg-yellow-200 dark:bg-yellow-800/30 text-yellow-900 dark:text-yellow-200 border-yellow-500 dark:border-yellow-700",
      Anglais:
        "bg-orange-200 dark:bg-orange-800/30 text-orange-900 dark:text-orange-200 border-orange-500 dark:border-orange-700",
      Arabe:
        "bg-purple-200 dark:bg-purple-800/30 text-purple-900 dark:text-purple-200 border-purple-500 dark:border-purple-700",
      EPS: "bg-indigo-200 dark:bg-indigo-800/30 text-indigo-900 dark:text-indigo-200 border-indigo-500 dark:border-indigo-700",
      "Leadership et Développement Personnel":
        "bg-pink-200 dark:bg-pink-800/30 text-pink-900 dark:text-pink-200 border-pink-500 dark:border-pink-700",
      "Initiation à l'entrepreneuriat":
        "bg-lime-200 dark:bg-lime-800/30 text-lime-900 dark:text-lime-200 border-lime-500 dark:border-lime-700",
      "Education artistique":
        "bg-cyan-200 dark:bg-cyan-800/30 text-cyan-900 dark:text-cyan-200 border-cyan-500 dark:border-cyan-700",
      Economie:
        "bg-amber-200 dark:bg-amber-800/30 text-amber-900 dark:text-amber-200 border-amber-500 dark:border-amber-700",
      "Education religieuse":
        "bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-600",
      Histoire:
        "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-600",
      Géographie:
        "bg-lime-100 dark:bg-lime-900/30 text-lime-800 dark:text-lime-300 border-lime-300 dark:border-lime-600",
      "Histoire-Géographie":
        "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-600",
      "Education musicale":
        "bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300 border-pink-300 dark:border-pink-600",
      "Initiation à l'architecture":
        "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-600",
      Espagnol:
        "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-600",
      Philosophie:
        "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-600",
      "Education Civique":
        "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-600",
      "Physique-chimie":
        "bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-600",
      "Bibliothèque/devoirs/exercices":
        "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600",
    };

    return (
      colors[subject] ||
      "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600"
    );
  };

  const navigateDay = (direction: "prev" | "next") => {
    setSelectedDayIndex((prev) => {
      if (direction === "prev") {
        return prev > 0 ? prev - 1 : 5;
      } else {
        return prev < 5 ? prev + 1 : 0;
      }
    });
  };

  return (
    <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-gray-900 dark:text-white">
          <span>Emploi du temps - {weekDays[selectedDayIndex]}</span>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDay("prev")}
              className="h-8 w-8 p-0 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDay("next")}
              className="h-8 w-8 p-0 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
        <div className="text-sm text-gray-600 dark:text-gray-300 mt-1.5 flex items-center">
          <span>{getCurrentDate(selectedDayIndex - currentDayIndex)}</span>
          {selectedDayIndex === currentDayIndex && (
            <Badge className="ml-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
              Aujourd'hui
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {getScheduleForDay(selectedDayIndex).length > 0 ? (
            getScheduleForDay(selectedDayIndex).map((course, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-l-4 ${getCourseColor(course.subject)}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{course.subject}</h3>
                  <Badge
                    variant="outline"
                    className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                    {course.time}
                  </Badge>
                </div>
                <p className="text-sm mt-1">{course.teacher}</p>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun cours programmé pour ce jour</p>
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Navigation rapide :
          </p>
          <div className="flex space-x-2 overflow-x-auto">
            {weekDays.map((day, index) => (
              <Button
                key={day}
                variant={selectedDayIndex === index ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDayIndex(index)}
                className="min-w-fit whitespace-nowrap">
                {day}
                {index === currentDayIndex && <span className="ml-1 text-xs">•</span>}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ScheduleTab;
