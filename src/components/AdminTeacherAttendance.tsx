import React, { useState, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
    UserCheck,
    Clock,
    UserX,
    Search,
    CheckCircle2,
    AlertCircle,
    XCircle,
    ChevronRight,
    History
} from "lucide-react";
import { useAllTeachers } from "@/hooks/useUsers";
import { useAuth } from "@/hooks/useAuth";
import { useCreateEmargement, useEmargements } from "@/hooks/useEmargement";
import { useToast } from "@/hooks/use-toast";
import { useClasses } from "@/hooks/useUsers";
import { useSubjects } from "@/hooks/useSubjects";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const AdminTeacherAttendance = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { authUser } = useAuth();
    const { toast } = useToast();
    const { data: teachers } = useAllTeachers(authUser);
    const { data: classes } = useClasses();
    const { data: subjects } = useSubjects();
    const { data: emargements } = useEmargements();
    const createEmargement = useCreateEmargement();

    const [searchTerm, setSearchTerm] = useState("");
    const [formData, setFormData] = useState({
        teacherId: "",
        date: new Date().toISOString().split("T")[0],
        startTime: "08:00",
        endTime: "09:00",
        status: "late" as "late" | "absent",
        delay: "",
        reason: "",
        classId: "",
        subjectId: "",
    });

    const filteredTeachers = useMemo(() => {
        if (!teachers) return [];
        return teachers.filter((t: any) =>
            `${t.prenom} ${t.nom}`.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [teachers, searchTerm]);

    const selectedTeacher = useMemo(() =>
        teachers?.find((t: any) => t.id === formData.teacherId),
        [teachers, formData.teacherId]
    );

    const handleSubmit = async () => {
        if (!formData.teacherId || !formData.date || !formData.classId || !formData.subjectId) {
            toast({
                title: "Champs manquants",
                description: "Veuillez remplir tous les champs obligatoires pour continuer.",
                variant: "destructive",
            });
            return;
        }

        const payload = {
            professeurId: formData.teacherId,
            classeId: formData.classId,
            disciplineId: formData.subjectId,
            debut: `${formData.date}T${formData.startTime}`,
            fin: `${formData.date}T${formData.endTime}`,
            seanceCounter: formData.status === "absent" ? 0 : 1,
            content: formData.status === "late" ? `Retard de ${formData.delay} min` :
                `Absence : ${formData.reason}`,
            additionalInfo: `Statut: ${formData.status.toUpperCase()}. ${formData.reason}`,
        };

        try {
            await createEmargement.mutateAsync(payload);
            toast({
                title: "Enregistré !",
                description: `Le pointage de ${selectedTeacher?.prenom} a été mis à jour.`,
                className: "bg-green-600 text-white border-none",
            });
            setIsOpen(false);
            resetForm();
        } catch (error) {
            console.error(error);
        }
    };

    const resetForm = () => {
        setFormData({
            teacherId: "",
            date: new Date().toISOString().split("T")[0],
            startTime: "08:00",
            endTime: "09:00",
            status: "late",
            delay: "",
            reason: "",
            classId: "",
            subjectId: "",
        });
        setSearchTerm("");
    };

    const teacherHistory = useMemo(() => {
        if (!emargements || !formData.teacherId) return [];
        return emargements.filter((em: any) => {
            if (em.professeurId !== formData.teacherId) return false;
            const isAbsent = em.seanceCounter === 0;
            const isLate = em.content?.toLowerCase().includes("retard");
            return isAbsent || isLate;
        })
            .sort((a: any, b: any) => new Date(b.debut).getTime() - new Date(a.debut).getTime())
            .slice(0, 5);
    }, [emargements, formData.teacherId]);

    const getInitials = (prenom: string, nom: string) => {
        return `${prenom?.charAt(0) || ""}${nom?.charAt(0) || ""}`.toUpperCase();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) resetForm();
        }}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center space-y-2 bg-white dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-primary hover:bg-primary/5 transition-all duration-300 group"
                >
                    <div className="p-3 rounded-2xl bg-green-100 dark:bg-green-900/30 group-hover:scale-110 transition-transform duration-300">
                        <UserCheck className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="text-center">
                        <div className="font-bold text-sm">Présence Profs</div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">
                            Gestion Rapide
                        </div>
                    </div>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl">
                <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border-b">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary text-primary-foreground">
                                <UserCheck className="w-6 h-6" />
                            </div>
                            Pointage Enseignant
                        </DialogTitle>
                    </DialogHeader>
                </div>

                <ScrollArea className="max-h-[80vh]">
                    <div className="p-6 space-y-8">
                        {/* Step 1: Teacher Selection */}
                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-lg font-bold flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center">1</span>
                                    Choisir l'enseignant
                                </Label>
                                {formData.teacherId && (
                                    <Button variant="ghost" size="sm" onClick={() => setFormData({ ...formData, teacherId: "" })} className="text-xs text-primary">
                                        Changer
                                    </Button>
                                )}
                            </div>

                            {!formData.teacherId ? (
                                <div className="space-y-4">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <Input
                                            placeholder="Rechercher un nom..."
                                            className="pl-10 bg-gray-50 dark:bg-gray-900 border-none focus-visible:ring-primary"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                        {filteredTeachers.map((t: any) => (
                                            <button
                                                key={t.id}
                                                onClick={() => setFormData({ ...formData, teacherId: t.id })}
                                                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-primary/10 transition-all group"
                                            >
                                                <Avatar className="w-12 h-12 border-2 border-transparent group-hover:border-primary transition-all">
                                                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                                        {getInitials(t.prenom, t.nom)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-[10px] font-bold text-center leading-tight truncate w-full">
                                                    {t.prenom} {t.nom}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/20 animate-in fade-in slide-in-from-top-2">
                                    <Avatar className="w-14 h-14 border-2 border-white shadow-sm">
                                        <AvatarFallback className="bg-primary text-white font-black text-xl">
                                            {getInitials(selectedTeacher?.prenom, selectedTeacher?.nom)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h3 className="font-black text-lg leading-none">{selectedTeacher?.prenom} {selectedTeacher?.nom}</h3>
                                        <p className="text-sm text-gray-500 font-medium mt-1">Enseignant sélectionné</p>
                                    </div>
                                    <CheckCircle2 className="ml-auto w-6 h-6 text-primary" />
                                </div>
                            )}
                        </section>

                        {formData.teacherId && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Step 2: Status Selection */}
                                <section className="space-y-4">
                                    <Label className="text-lg font-bold flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center">2</span>
                                        Quel est le statut ?
                                    </Label>
                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            { id: "late", label: "Retard", icon: Clock, color: "orange" },
                                            { id: "absent", label: "Absent", icon: XCircle, color: "rose" },
                                        ].map((s) => (
                                            <button
                                                key={s.id}
                                                onClick={() => setFormData({ ...formData, status: s.id as any })}
                                                className={`
                          relative flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-300
                          ${formData.status === s.id
                                                        ? `border-${s.color}-500 bg-${s.color}-50 dark:bg-${s.color}-950/30 scale-105 shadow-lg`
                                                        : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'}
                        `}
                                            >
                                                <s.icon className={`w-8 h-8 ${formData.status === s.id ? `text-${s.color}-600` : 'text-gray-400'}`} />
                                                <span className={`text-xs font-black uppercase tracking-widest ${formData.status === s.id ? `text-${s.color}-700` : 'text-gray-500'}`}>
                                                    {s.label}
                                                </span>
                                                {formData.status === s.id && (
                                                    <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full bg-${s.color}-500 text-white flex items-center justify-center shadow-md`}>
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </section>

                                {/* Step 3: Details */}
                                <section className="space-y-6 bg-gray-50 dark:bg-gray-900/50 p-6 rounded-3xl border border-gray-100 dark:border-gray-800">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase tracking-widest text-gray-500">Date du pointage</Label>
                                            <Input
                                                type="date"
                                                value={formData.date}
                                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                                className="bg-white dark:bg-gray-800 border-none shadow-sm"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-black uppercase tracking-widest text-gray-500">Début</Label>
                                                <Input
                                                    type="time"
                                                    value={formData.startTime}
                                                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                                    className="bg-white dark:bg-gray-800 border-none shadow-sm"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-black uppercase tracking-widest text-gray-500">Fin</Label>
                                                <Input
                                                    type="time"
                                                    value={formData.endTime}
                                                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                                    className="bg-white dark:bg-gray-800 border-none shadow-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase tracking-widest text-gray-500">Classe concernée</Label>
                                            <Select value={formData.classId} onValueChange={(val) => setFormData({ ...formData, classId: val })}>
                                                <SelectTrigger className="bg-white dark:bg-gray-800 border-none shadow-sm">
                                                    <SelectValue placeholder="Choisir la classe" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {classes?.map((c: any) => (
                                                        <SelectItem key={c.id} value={c.id}>{c.niveau} {c.nom}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase tracking-widest text-gray-500">Matière</Label>
                                            <Select value={formData.subjectId} onValueChange={(val) => setFormData({ ...formData, subjectId: val })}>
                                                <SelectTrigger className="bg-white dark:bg-gray-800 border-none shadow-sm">
                                                    <SelectValue placeholder="Choisir la matière" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {subjects?.map((s: any) => (
                                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {formData.status === "late" && (
                                        <div className="space-y-2 animate-in zoom-in-95 duration-300">
                                            <Label className="text-xs font-black uppercase tracking-widest text-orange-600">Durée du retard (minutes)</Label>
                                            <div className="relative">
                                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500" />
                                                <Input
                                                    type="number"
                                                    placeholder="Ex: 15"
                                                    className="pl-10 bg-white dark:bg-gray-800 border-2 border-orange-100 focus-visible:ring-orange-500"
                                                    value={formData.delay}
                                                    onChange={(e) => setFormData({ ...formData, delay: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {formData.status === "absent" && (
                                        <div className="space-y-2 animate-in zoom-in-95 duration-300">
                                            <Label className="text-xs font-black uppercase tracking-widest text-rose-600">Motif de l'absence</Label>
                                            <Textarea
                                                placeholder="Expliquez brièvement le motif..."
                                                className="bg-white dark:bg-gray-800 border-2 border-rose-100 focus-visible:ring-rose-500 min-h-[80px]"
                                                value={formData.reason}
                                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                            />
                                        </div>
                                    )}
                                </section>

                                {/* History Section */}
                                {teacherHistory && teacherHistory.length > 0 && (
                                    <section className="space-y-4">
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <History className="w-4 h-4" />
                                            <span className="text-xs font-black uppercase tracking-widest">Historique (Retards & Absences)</span>
                                        </div>
                                        <div className="space-y-2">
                                            {teacherHistory.map((record: any) => {
                                                const isAbsent = record.seanceCounter === 0;
                                                const isLate = record.content?.toLowerCase().includes("retard");
                                                const color = isAbsent ? "rose" : isLate ? "orange" : "green";
                                                return (
                                                    <div key={record.id} className="group flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-gray-900/50 hover:bg-white dark:hover:bg-gray-800 border border-transparent hover:border-gray-100 dark:hover:border-gray-700 transition-all">
                                                        <div className={`w-2 h-10 rounded-full bg-${color}-500/20 flex flex-col items-center justify-center`}>
                                                            <div className={`w-1.5 h-1.5 rounded-full bg-${color}-500`} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                                                                    {new Date(record.debut).toLocaleDateString("fr-FR", { day: 'numeric', month: 'short' })}
                                                                </span>
                                                                <Badge variant="outline" className={`text-[9px] font-black uppercase border-${color}-200 text-${color}-600 bg-${color}-50`}>
                                                                    {isAbsent ? "Absent" : isLate ? "Retard" : "Présent"}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-xs font-bold truncate mt-0.5">{record.content}</p>
                                                        </div>
                                                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </section>
                                )}
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <div className="p-6 bg-gray-50 dark:bg-gray-900/80 border-t flex gap-3">
                    <Button variant="ghost" className="flex-1 font-bold" onClick={() => setIsOpen(false)}>
                        Annuler
                    </Button>
                    <Button
                        className="flex-[2] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                        onClick={handleSubmit}
                        disabled={!formData.teacherId || createEmargement.isPending}
                    >
                        {createEmargement.isPending ? "Enregistrement..." : "Valider le pointage"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AdminTeacherAttendance;
