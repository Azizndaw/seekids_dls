import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Clock,
  TrendingUp,
  AlertTriangle,
  BookOpen,
  Calendar as CalendarIcon,
  History,
  Trophy,
  PencilLine,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CourseProps {
  nextCourse: {
    subject: string;
    teacher: string;
    time: string;
  };
  latestGrades: {
    subject: string;
    grade: number;
    date: string;
  }[];
  nextEvaluation: {
    id: string;
    title: string;
    description: string;
    date: string;
    discipline: {
      name: string;
    };
    type?: string;
  }[];
  upcomingExercises: {
    id: string;
    title: string;
    description: string;
    date: string;
    discipline: {
      name: string;
    };
  }[];
}

const DashboardOverview = ({
  nextCourse,
  latestGrades,
  nextEvaluation,
  upcomingExercises,
}: CourseProps) => {
  const [showHistory, setShowHistory] = useState(false);

  // Combine and sort all upcoming events
  const allEvents = [
    ...(nextEvaluation || []).map((e) => ({ ...e, eventType: e.type || "EVALUATION" })),
    ...(upcomingExercises || []).map((e) => ({ ...e, eventType: "EXERCICE" })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const pastEvents = allEvents.filter((e) => new Date(e.date) < new Date()).reverse();
  const upcomingEvents = allEvents.filter((e) => new Date(e.date) >= new Date());

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {/* Prochains cours */}
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden group">
        <div className="h-1.5 bg-blue-500 w-full" />
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-base sm:text-lg text-gray-900 dark:text-white">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
            <span>Prochain cours</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-1 sm:space-y-2">
            {nextCourse ? (
              <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                <div className="font-bold text-blue-600 dark:text-blue-400 text-sm sm:text-base leading-tight">
                  {nextCourse.subject}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="outline"
                    className="text-[10px] font-bold border-blue-200 text-blue-600 bg-blue-50">
                    {nextCourse.time}
                  </Badge>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-gray-400" />
                  {nextCourse.teacher}
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400 italic py-2">
                Aucun cours prévu.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dernières notes */}
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
        <div className="h-1.5 bg-green-500 w-full" />
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-base sm:text-lg text-gray-900 dark:text-white">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
            <span>Dernières notes</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {latestGrades && latestGrades.length > 0 ? (
              latestGrades.map((g, idx) => (
                <div key={idx} className="flex items-center justify-between group cursor-default">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm truncate group-hover:text-green-600 transition-colors">
                      {g.subject}
                    </div>
                    <div className="text-[10px] text-gray-400">{g.date}</div>
                  </div>
                  <div className="font-black text-green-600 dark:text-green-400 text-sm sm:text-base ml-2 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-lg">
                    {g.grade}/20
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500 italic py-2">Aucune note.</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Agenda Scolaire (Evaluations & Exercices) */}
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl lg:col-span-2 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(true)}
            className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-primary transition-all flex items-center gap-1">
            <History className="w-3 h-3" />
            Historique
          </Button>
        </div>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2 text-base sm:text-lg text-gray-900 dark:text-white">
            <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 dark:text-orange-400" />
            <span>Agenda des épreuves</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {upcomingEvents.length > 0 ? (
              upcomingEvents.slice(0, 12).map((event) => {
                const isEval = event.eventType === "EVALUATION";
                const Icon = isEval ? Trophy : PencilLine;
                const color = isEval ? "orange" : "purple";
                const label = isEval ? "Composition" : "Devoir";

                return (
                  <div
                    key={event.id}
                    className={`relative p-3 rounded-2xl border-2 border-${color}-100 dark:border-${color}-900/30 bg-${color}-50/30 dark:bg-${color}-950/10 group hover:scale-[1.02] transition-all duration-300`}>
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-xl bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className={`text-[10px] font-black uppercase tracking-widest text-${color}-600 mb-0.5`}>
                          {(event.discipline?.name || event.disciplineName)}
                        </div>
                        <div className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm truncate">
                          {event.title}
                        </div>
                        <div className="flex items-center gap-1.5 mt-2">
                          <Badge
                            variant="secondary"
                            className="text-[9px] font-black bg-white dark:bg-gray-800 shadow-sm border-none">
                            {new Date(event.date).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                            })}
                          </Badge>
                          <span
                            className={`text-[9px] font-bold text-${color}-600 ${isEval ? "animate-pulse" : ""}`}>
                            {label}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-2 flex flex-col items-center justify-center py-8 text-center opacity-50">
                <CalendarIcon className="h-10 w-10 text-gray-300 mb-2" />
                <p className="text-sm font-bold text-gray-400">Aucune épreuve prévue</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-gradient-to-r from-primary/10 to-transparent p-6 border-b">
            <DialogHeader>
              <DialogTitle className="text-xl font-black flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary text-white">
                  <History className="w-5 h-5" />
                </div>
                Historique des épreuves
              </DialogTitle>
            </DialogHeader>
          </div>
          <ScrollArea className="max-h-[60vh]">
            <div className="p-6 space-y-4">
              {pastEvents.length > 0 ? (
                pastEvents.map((event) => {
                  const isEval = event.eventType === "EVALUATION";
                  const color = isEval ? "orange" : "purple";
                  const label = isEval ? "Évaluation" : "Devoir";
                  return (
                    <div
                      key={event.id}
                      className="flex items-center gap-4 p-3 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-transparent hover:border-gray-100 dark:hover:border-gray-700 transition-all">
                      <div
                        className={`w-10 h-10 rounded-xl bg-${color}-100 dark:bg-${color}-900/30 flex items-center justify-center text-${color}-600 font-bold text-xs`}>
                        {new Date(event.date).getDate()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            {new Date(event.date).toLocaleDateString("fr-FR", {
                              month: "long",
                              year: "numeric",
                            })}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[9px] font-black border-${color}-200 text-${color}-600`}>
                            {label}
                          </Badge>
                        </div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate mt-0.5">
                          {event.title}
                        </p>
                        <p className="text-[10px] text-gray-500 truncate">
                          {(event.discipline?.name || event.disciplineName)}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 text-gray-400">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="font-bold">Aucun historique disponible</p>
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="p-4 bg-gray-50 dark:bg-gray-900/80 border-t">
            <Button
              className="w-full font-bold"
              variant="ghost"
              onClick={() => setShowHistory(false)}>
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardOverview;
