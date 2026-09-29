import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCreateEvaluation } from "@/hooks/use-evaluation";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/socket/SocketContext";
import { useQueryClient } from "@tanstack/react-query";

interface ExerciceModalProps {
    subjects: { id: string; name: string }[];
    classes: { id: string; niveau: string; nom?: string }[];
}

const ExerciceModal = ({ subjects, classes }: ExerciceModalProps) => {
    const { toast } = useToast();
    const { authUser } = useAuth();
    const socket = useSocket();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        subject: "",
        class: "",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 7 days from now
    });

    const { mutate: createExercice, isPending } = useCreateEvaluation();

    const handleSubmit = () => {
        if (!formData.title || !formData.subject || !formData.class || !formData.dueDate) {
            toast({
                title: "Erreur",
                description: "Veuillez remplir tous les champs obligatoires",
                variant: "destructive",
            });
            return;
        }

        const selectedSubject = subjects.find((s) => s.id === formData.subject);
        const selectedClass = classes.find((c) => c.id === formData.class);

        createExercice(
            {
                title: formData.title,
                description: formData.description,
                date: formData.dueDate,
                classeId: formData.class,
                professeurId: authUser?.id || "",
                disciplineId: formData.subject,
                schoolId: authUser?.schoolId || "",
                type: "EXERCICE",
            },
            {
                onSuccess: () => {
                    toast({
                        title: "Exercice assigné",
                        description: "L'exercice a été transmis aux élèves et parents",
                    });

                    // Emit Socket.IO event for real-time notification
                    if (socket) {
                        socket.emit("new-homework", {
                            classeId: formData.class,
                            className: `${selectedClass?.niveau} ${selectedClass?.nom || ""}`,
                            title: formData.title,
                            subject: selectedSubject?.name || "",
                            professeur: `${authUser?.prenom} ${authUser?.nom}`,
                            dueDate: formData.dueDate,
                        });
                    }

                    // Invalidate queries to refresh data
                    queryClient.invalidateQueries({ queryKey: ["evaluations"] });

                    // Reset form
                    setFormData({
                        title: "",
                        description: "",
                        subject: "",
                        class: "",
                        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                    });

                    setIsOpen(false);
                },
            }
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="h-auto p-2 sm:p-3 lg:p-4 flex flex-col items-center space-y-1 sm:space-y-2 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white transition-all duration-200">
                    <BookOpen className="w-5 h-5 sm:w-6 sm:w-6 lg:w-8 lg:h-8 text-gray-700 dark:text-gray-300" />
                    <div className="text-center">
                        <div className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white">
                            Devoirs
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                            Assigner des devoirs
                        </div>
                    </div>
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5" />
                        Assigner des Devoirs
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Titre */}
                    <div>
                        <Label htmlFor="title">Titre du devoir *</Label>
                        <Input
                            id="title"
                            placeholder="Ex: Exercices page 45"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    {/* Matière et Classe */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="subject">Matière *</Label>
                            <Select
                                value={formData.subject}
                                onValueChange={(value) => setFormData({ ...formData, subject: value })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner une matière" />
                                </SelectTrigger>
                                <SelectContent>
                                    {subjects.map((subject) => (
                                        <SelectItem key={subject.id} value={subject.id}>
                                            {subject.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="class">Classe *</Label>
                            <Select
                                value={formData.class}
                                onValueChange={(value) => setFormData({ ...formData, class: value })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner une classe" />
                                </SelectTrigger>
                                <SelectContent>
                                    {classes.map((classe) => (
                                        <SelectItem key={classe.id} value={classe.id}>
                                            {classe.niveau} {classe.nom}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Date limite */}
                    <div>
                        <Label htmlFor="dueDate">Date limite *</Label>
                        <Input
                            type="date"
                            id="dueDate"
                            value={formData.dueDate}
                            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <Label htmlFor="description">Description du devoir</Label>
                        <Textarea
                            id="description"
                            placeholder="Décrivez le devoir à faire (ex: Faire les exercices 1 à 10, lire le chapitre 3...)"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={4}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>
                            Annuler
                        </Button>
                        <Button onClick={handleSubmit} disabled={isPending}>
                            {isPending ? "Envoi..." : "Assigner le Devoir"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ExerciceModal;
