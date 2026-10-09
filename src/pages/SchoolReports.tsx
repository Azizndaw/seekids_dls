import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Filter, TrendingUp, Users, BookOpen, ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LogoutButton from "@/components/LogoutButton";
import DataExtraction from "@/components/DataExtraction";
import { useGetSchoolAverage } from "@/hooks/useAverage";
import BulletinGenerator from "@/components/BulletinGenerator";
import DifficultyReportGenerator from "@/components/DifficultyReportGenerator";
import RevisionListGenerator from "@/components/RevisionListGenerator";
import TopStudentsListGenerator from "@/components/TopStudentsListGenerator";
import WeakStudentsListGenerator from "@/components/WeakStudentsListGenerator";
import ExclusionReportGenerator from "@/components/ExclusionReportGenerator";
import ClassDetailsModal from "@/components/ClassDetailsModal";
import SubjectReportsGrid from "@/components/SubjectReportsGrid";
import CertificatScolariteGenerator from "@/components/CertificatScolariteGenerator";

const SchoolReports = () => {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState("1");
  const [selectedClassForDetails, setSelectedClassForDetails] = useState<string | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const { data: schoolResults } = useGetSchoolAverage(selectedPeriod);
  const [selectedClassId, setSelectedClassId] = useState("all");

  const handleClassChange = (className: string) => {
    setSelectedClassId(className);
  };

  if (!schoolResults) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const classReports = schoolResults.classAverages || (Array.isArray(schoolResults) ? schoolResults : []) || [];
  const filteredClass =
    selectedClassId === "all"
      ? classReports
      : classReports.filter((cr) => cr.classeId === selectedClassId);

  const reportStats = [
    {
      title: "Moyenne Générale",
      value:
        selectedClassId == "all"
          ? schoolResults.schoolAverage
          : (filteredClass[0]?.average ?? "NaN"),
      icon: TrendingUp,
      color: "bg-green-500",
    },
    {
      title: "Taux de Réussite",
      value:
        selectedClassId == "all" ? schoolResults.schoolSuccessRate : filteredClass[0]?.successRate,
      icon: Users,
      color: "bg-blue-500",
    },
    {
      title: "Matières Évaluées",
      value:
        selectedClassId == "all"
          ? schoolResults.disciplinesCount
          : filteredClass[0]?.subjectReports?.length,
      icon: BookOpen,
      color: "bg-purple-500",
    },
  ];
  const handleOpenClassDetails = (classeId: string) => {
    setSelectedClassForDetails(classeId);
    setIsDetailsModalOpen(true);
  };

  const handleCloseClassDetails = () => {
    setIsDetailsModalOpen(false);
    setSelectedClassForDetails(null);
  };

  return (
    <div className="min-h-screen bg-background dark:bg-background p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate("/admin-dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Rapports Scolaires</h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Analyse et extraction de données
              </p>
            </div>
          </div>
          <LogoutButton className="w-full sm:w-auto" />
        </div>

        {/* Tabs pour organiser les fonctionnalités */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="extraction">Extraction de données</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filtres
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Période</label>
                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1er Semestre</SelectItem>
                        <SelectItem value="2">2ème Semestre</SelectItem>
                        <SelectItem value="annual">Année Complète</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Classe</label>
                    <Select value={selectedClassId} onValueChange={handleClassChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les classes</SelectItem>
                        {classReports?.map((c) => (
                          <SelectItem key={c.classeId} value={c.classeId}>
                            {c.classe}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {reportStats?.map((stat, index) => (
                <Card key={index}>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                          {stat.title}
                        </p>
                        <p className="text-xl sm:text-2xl font-bold text-foreground">
                          {stat.value}
                        </p>
                      </div>
                      <div className={`p-2 sm:p-3 rounded-full ${stat.color}`}>
                        <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Class Reports */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-lg sm:text-xl">Rapports par Classe</CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Performance détaillée de chaque classe
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-4">
                  {filteredClass?.map((report, index) => (
                    <div
                      key={index}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg gap-3 sm:gap-0">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium text-sm sm:text-base text-foreground">
                            {report?.classe}
                          </h3>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {report?.students} élèves
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Moyenne</p>
                          <p className="font-bold text-foreground">{report?.average}/20</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Réussite</p>
                          <Badge variant="secondary">{report?.successRate}</Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenClassDetails(report?.classeId)}>
                          <FileText className="w-4 h-4 mr-2" />
                          Détails
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Subject Reports */}
            <SubjectReportsGrid
              reports={
                selectedClassId === "all"
                  ? (schoolResults.subjectReports || [])
                  : (filteredClass[0]?.subjectReports || [])
              }
            />
          </TabsContent>

          <TabsContent value="extraction" className="space-y-6">
            <CertificatScolariteGenerator />
            <BulletinGenerator averageDto={schoolResults} />
            <DifficultyReportGenerator averageDto={schoolResults} />
            <RevisionListGenerator averageDto={schoolResults} />
            <TopStudentsListGenerator />
            <WeakStudentsListGenerator />
            <ExclusionReportGenerator />
            <DataExtraction />
          </TabsContent>
        </Tabs>

        {/* Modal pour les détails de classe */}
        {isDetailsModalOpen && (
          <ClassDetailsModal
            isOpen={isDetailsModalOpen}
            onClose={handleCloseClassDetails}
            className={selectedClassForDetails || ""}
          />
        )}
      </div>
    </div>
  );
};

export default SchoolReports;
