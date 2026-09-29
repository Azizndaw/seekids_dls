
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";
import { usePlanningsByClass } from "@/hooks/usePlannings";

interface PlanningViewerProps {
  className: string;
  title?: string;
}

const PlanningViewer: React.FC<PlanningViewerProps> = ({ className, title = "Planning de la classe" }) => {
  const { data: plannings, isLoading, error } = usePlanningsByClass(className);

  const formatPlanningContent = (contenu: string) => {
    try {
      const parsed = JSON.parse(contenu);
      if (typeof parsed === 'object') {
        return (
          <div className="space-y-2">
            {Object.entries(parsed).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="font-medium capitalize">{key}</span>
                <span className="text-sm text-gray-600">{value as string}</span>
              </div>
            ))}
          </div>
        );
      }
    } catch (e) {
      // Si ce n'est pas du JSON, afficher le texte tel quel
    }
    return <div className="whitespace-pre-wrap text-sm">{contenu}</div>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-gray-500">Chargement du planning...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-red-500">Erreur lors du chargement du planning</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!plannings || plannings.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">Aucun planning disponible</p>
            <p className="text-sm text-gray-400">pour la classe {className}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {plannings.map((planning) => (
        <Card key={planning.id}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {title}
              </div>
              <Badge variant="outline">{planning.classe}</Badge>
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              {planning.semaine}
            </div>
          </CardHeader>
          <CardContent>
            {formatPlanningContent(planning.contenu)}
            <div className="mt-4 text-xs text-gray-400">
              Mis à jour le {new Date(planning.created_at).toLocaleDateString('fr-FR')}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default PlanningViewer;
