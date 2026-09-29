import React, { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { AlertTriangle, CalendarDays, Edit, Trash2, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAverageInterpretation, getAttendanceAlert, getWeakestSubject } from "@/utils/gradeUtils";

// Helper functions (moved from parent or passed as props if needed)
const getMonthName = (dateStr: string) => {
    const parts = dateStr.split("-");
    if (parts.length < 2) return "";
    const monthIndex = parseInt(parts[1]) - 1;
    const date = new Date(2000, monthIndex, 1);
    const monthName = date.toLocaleString("fr-FR", { month: "long" });
    return monthName.charAt(0).toUpperCase() + monthName.slice(1);
};

const getGradesForMonth = (studentGrades: any[], subject: string, monthName: string, filterSemester: "" | 1 | 2) => {
    return studentGrades.filter(
        (g) =>
            g.subject === subject &&
            g.devoir !== false &&
            getMonthName(g.date).toLowerCase() === monthName.toLowerCase() &&
            (filterSemester === "" || g.semestre.includes(filterSemester))
    );
};

const getCompositionGrades = (studentGrades: any[], subject: string, filterSemester: "" | 1 | 2) => {
    return studentGrades.filter(
        (g) =>
            g.subject === subject &&
            g.devoir === false &&
            (filterSemester === "" || g.semestre.includes(filterSemester))
    );
};

interface StudentReportCardProps {
    student: any;
    rank: number;
    filterSemester: "" | 1 | 2;
    setFilterSemester: (value: "" | 1 | 2) => void;
    monthsWithData: string[];
    allSubjects: string[];
    openEditGradeDialog: (studentId: string, gradeIndex: number) => void;
    setDeleteDialog: (data: any) => void;
    style?: React.CSSProperties; // For react-window
}

const StudentReportCard = memo(({
    student,
    rank,
    filterSemester,
    setFilterSemester,
    monthsWithData,
    allSubjects,
    openEditGradeDialog,
    setDeleteDialog,
    style
}: StudentReportCardProps) => {
    return (
        <div style={style} className="pb-4 pr-4">
            {/* Added wrapper div with style for virtualization and padding for spacing */}
            <Card className="h-full overflow-hidden">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                            {student.firstName} {student.lastName}
                        </CardTitle>

                        <div className="flex flex-col items-end gap-2">
                            <div className="flex gap-2">
                                <Badge variant="secondary" className="text-lg px-3 py-1">
                                    Rang: {rank}
                                    {rank === 1 ? "er" : "ème"}
                                </Badge>
                                <div className="flex flex-col items-center">
                                    <Badge variant="outline" className="text-lg px-3 py-1">
                                        Moyenne: {student.generalAverage}/20
                                    </Badge>
                                    {(() => {
                                        const weakest = getWeakestSubject(student.subjectAverages);
                                        const interpretation = getAverageInterpretation(student.generalAverage, weakest);
                                        return (
                                            <span className={`text-[10px] font-bold mt-1 px-2 py-0.5 rounded-full ${interpretation.bg} ${interpretation.color}`}>
                                                {interpretation.label}
                                            </span>
                                        );
                                    })()}
                                </div>
                            </div>
                            {(() => {
                                const absenceCount = student.attendance.filter((a: any) => a.type === "ABSCENCE").length;
                                const alert = getAttendanceAlert(absenceCount);
                                if (!alert) return null;
                                return (
                                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-md border ${alert.bg} border-current animate-pulse`}>
                                        <AlertTriangle className={`h-4 w-4 ${alert.color}`} />
                                        <span className={`text-xs font-bold ${alert.color}`}>
                                            {alert.message}
                                        </span>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    <Tabs defaultValue="grades" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="grades">Notes & Compositions</TabsTrigger>
                            <TabsTrigger value="attendance">Assiduité</TabsTrigger>
                            <TabsTrigger value="stuff">Autres</TabsTrigger>
                        </TabsList>

                        <TabsContent value="grades">
                            <div className="flex items-center gap-4 my-4">
                                <div className="w-48">
                                    <Label>Semestre</Label>
                                    <select
                                        className="w-full border rounded-md p-2"
                                        value={filterSemester}
                                        onChange={(e) =>
                                            setFilterSemester(
                                                e.target.value === "" ? "" : (Number(e.target.value) as 1 | 2)
                                            )
                                        }>
                                        <option value="">Tous</option>
                                        <option value="1">Semestre 1</option>
                                        <option value="2">Semestre 2</option>
                                    </select>
                                </div>
                            </div>

                            <div className="rounded-md border overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50">
                                            <TableHead className="w-[150px] font-bold sticky left-0 bg-gray-50 z-30 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                                Matière
                                            </TableHead>
                                            {monthsWithData.map((month) => (
                                                <TableHead key={month} className="text-center min-w-[100px]">
                                                    {month}
                                                </TableHead>
                                            ))}
                                            <TableHead className="text-center font-bold bg-blue-50 text-blue-900 min-w-[120px] sticky right-0 z-20 shadow-[-2px_0_5px_rgba(0,0,0,0.05)]">
                                                Compo.
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {allSubjects.map((subject) => (
                                            <TableRow key={subject}>
                                                <TableCell className="font-medium sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                                    {subject}
                                                </TableCell>
                                                {monthsWithData.map((month) => {
                                                    const monthGrades = getGradesForMonth(student.grades, subject, month, filterSemester);
                                                    return (
                                                        <TableCell key={month} className="text-center p-2">
                                                            <div className="flex flex-wrap justify-center gap-1.5">
                                                                {monthGrades.map((g: any) => {
                                                                    // Warning: Using global index logic might be tricky here if not careful.
                                                                    // We should pass the grade ID or rely on findIndex in the parent.
                                                                    // For now, let's keep the logic but we need to find the index relative to the FULL student.grades array
                                                                    const originalIndex = student.grades.findIndex((og: any) => og.id === g.id);

                                                                    return (
                                                                        <div
                                                                            key={g.id}
                                                                            className={`group relative flex flex-col items-center justify-center min-w-[2.5rem] p-1 rounded border cursor-pointer hover:border-blue-400 ${g.grade >= 10
                                                                                ? "bg-green-50 border-green-200 text-green-700"
                                                                                : "bg-red-50 border-red-200 text-red-700"
                                                                                }`}
                                                                            onClick={() => openEditGradeDialog(student.id, originalIndex)}
                                                                        >
                                                                            <span className="text-sm font-bold">{g.grade}</span>
                                                                            <span className="text-[10px] opacity-70">c{g.coefficient}</span>

                                                                            <div className="absolute -top-2 -right-2 hidden group-hover:flex gap-1 z-30">
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        openEditGradeDialog(student.id, originalIndex);
                                                                                    }}
                                                                                    className="bg-white rounded-full p-0.5 shadow-sm border border-blue-200 hover:bg-blue-50"
                                                                                >
                                                                                    <Edit className="w-3 h-3 text-blue-600" />
                                                                                </button>
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setDeleteDialog({
                                                                                            isOpen: true,
                                                                                            type: "grade",
                                                                                            studentId: student.id,
                                                                                            id: g.id,
                                                                                        });
                                                                                    }}
                                                                                    className="bg-white rounded-full p-0.5 shadow-sm border border-red-200 hover:bg-red-50"
                                                                                >
                                                                                    <Trash2 className="w-3 h-3 text-red-600" />
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </TableCell>
                                                    );
                                                })}
                                                <TableCell className="text-center bg-blue-50/30 p-2 sticky right-0 bg-white z-10 shadow-[-2px_0_5px_rgba(0,0,0,0.05)]">
                                                    <div className="flex flex-wrap justify-center gap-1.5">
                                                        {getCompositionGrades(student.grades, subject, filterSemester).map((g: any) => {
                                                            const originalIndex = student.grades.findIndex((og: any) => og.id === g.id);
                                                            return (
                                                                <div
                                                                    key={g.id}
                                                                    className={`group relative flex flex-col items-center justify-center min-w-[2.75rem] p-1 rounded border cursor-pointer hover:border-blue-400 ${g.grade >= 10
                                                                        ? "bg-green-100 border-green-300 text-green-800"
                                                                        : "bg-red-100 border-red-300 text-red-800"
                                                                        }`}
                                                                    onClick={() => openEditGradeDialog(student.id, originalIndex)}
                                                                >
                                                                    <span className="text-base font-extrabold">{g.grade}</span>
                                                                    <span className="text-[10px] opacity-70">c{g.coefficient}</span>

                                                                    <div className="absolute -top-2 -right-2 hidden group-hover:flex gap-1 z-30">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                openEditGradeDialog(student.id, originalIndex);
                                                                            }}
                                                                            className="bg-white rounded-full p-0.5 shadow-sm border border-blue-200 hover:bg-blue-50"
                                                                        >
                                                                            <Edit className="w-3 h-3 text-blue-600" />
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setDeleteDialog({
                                                                                    isOpen: true,
                                                                                    type: "grade",
                                                                                    studentId: student.id,
                                                                                    id: g.id,
                                                                                });
                                                                            }}
                                                                            className="bg-white rounded-full p-0.5 shadow-sm border border-red-200 hover:bg-red-50"
                                                                        >
                                                                            <Trash2 className="w-3 h-3 text-red-600" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>

                        <TabsContent value="attendance">
                            {student.attendance.length === 0 ? (
                                <div className="text-center py-6 text-muted-foreground">
                                    <UserX className="w-10 h-10 mx-auto mb-3 opacity-50" />
                                    Aucun enregistrement
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Cours</TableHead>
                                            <TableHead>Heure</TableHead>
                                            <TableHead>Statut</TableHead>
                                            <TableHead>Motif</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {student.attendance.map((record: any, index: number) => (
                                            <TableRow key={index}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <CalendarDays className="w-4 h-4" />
                                                        {new Date(record.date).toLocaleDateString("fr-FR")}
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <Badge
                                                        className={
                                                            record.type === "RETARD"
                                                                ? "bg-yellow-100 text-yellow-800"
                                                                : "bg-orange-100 text-orange-800"
                                                        }>
                                                        {record.type === "RETARD" ? "Retard" : "Absence"}
                                                    </Badge>
                                                </TableCell>

                                                <TableCell>{record.course}</TableCell>
                                                <TableCell>{record.date}</TableCell>

                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            setDeleteDialog({
                                                                isOpen: true,
                                                                type: "attendance",
                                                                studentId: student.id,
                                                                id: record.id,
                                                            })
                                                        }>
                                                        <Trash2 className="w-4 h-4 text-red-600" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
});

export default StudentReportCard;
