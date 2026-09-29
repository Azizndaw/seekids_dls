import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SubjectReport {
    subject: string;
    average: string | null;
}

interface SubjectReportsGridProps {
    reports: SubjectReport[];
}

const SubjectReportsGrid = ({ reports }: SubjectReportsGridProps) => {
    const getPerformanceDetails = (averageStr: string | null) => {
        if (!averageStr) return { label: "N/A", color: "bg-gray-100 text-gray-800" };

        const avg = parseFloat(averageStr);

        if (isNaN(avg)) return { label: "N/A", color: "bg-gray-100 text-gray-800" };

        if (avg >= 14) {
            return { label: "Élevée", color: "bg-green-100 text-green-800 hover:bg-green-100" }; // Green for high
        } else if (avg >= 10) {
            return { label: "Moyenne", color: "bg-orange-100 text-orange-800 hover:bg-orange-100" }; // Orange for average
        } else {
            return { label: "Faible", color: "bg-red-100 text-red-800 hover:bg-red-100" }; // Red for low
        }
    };

    if (!reports || reports.length === 0) {
        return (
            <Card className="mt-8">
                <CardContent className="p-6 text-center text-muted-foreground">
                    Aucun rapport par matière disponible pour cette sélection.
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4 mt-8">
            <div>
                <h2 className="text-xl font-semibold text-foreground">Rapports par Matière</h2>
                <p className="text-muted-foreground text-sm">
                    Analyse des performances par discipline
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reports.map((report, index) => {
                    const { label, color } = getPerformanceDetails(report.average);

                    return (
                        <Card key={index} className="overflow-hidden">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="font-semibold text-lg text-foreground">{report.subject}</h3>
                                    <Badge className={`${color} border-none shadow-none`}>
                                        {label}
                                    </Badge>
                                </div>

                                <div className="flex justify-between items-end">
                                    <span className="text-muted-foreground text-sm">Moyenne générale</span>
                                    <div className="flex items-baseline">
                                        <span className="text-2xl font-bold text-foreground">{report.average}</span>
                                        <span className="text-muted-foreground font-medium ml-1">/20</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default SubjectReportsGrid;
