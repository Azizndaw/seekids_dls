import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Trophy,
  PencilLine,
  CheckCircle2,
  Layout,
  Trash2,
  History,
  PlusCircle,
  Loader2,
} from "lucide-react";
import { useClasses, useAllTeachers } from "@/hooks/useUsers";
import { useSubjects } from "@/hooks/useSubjects";
import {
  useCreateEvaluation,
  useEvaluations,
  useDeleteEvaluation,
} from "@/hooks/use-evaluation.tsx";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

const AdminEvaluationScheduler = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { authUser } = useAuth();
  const { toast } = useToast();
  const { data: classes } = useClasses();
  const { data: subjects } = useSubjects();
  const { data: teachers } = useAllTeachers(authUser);

  const createEvaluation = useCreateEvaluation();
  const { data: evaluations, isLoading: isLoadingEvaluations } = useEvaluations();
  const deleteEvaluation = useDeleteEvaluation();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    classeId: "",
    disciplineId: "",
    professeurId: "",
    type: "EVALUATION" as "EVALUATION" | "EXERCICE",
  });

  const handleSubmit = async () => {
    if (!formData.title || !formData.classeId || !formData.disciplineId || !formData.date) {
      toast({
        title: "Champs obligatoires",
        description: "Veuillez remplir le titre, la classe, la matière et la date.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      ...formData,
      schoolId: authUser?.schoolId || "",
    };

    try {
      await createEvaluation.mutateAsync(payload);
      toast({
        title: "Évaluation planifiée !",
        description: `"${formData.title}" a été ajouté au calendrier.`,
        className: "bg-orange-600 text-white border-none",
      });
      // Don't close dialog, just reset form so user can add another or switch to history
      resetForm();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette évaluation ?")) {
      try {
        await deleteEvaluation.mutateAsync({ evaluationId: id });
        toast({
          title: "Supprimé",
          description: "L'évaluation a été supprimée.",
        });
      } catch (error) {
        console.error(error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      date: new Date().toISOString().split("T")[0],
      classeId: "",
      disciplineId: "",
      professeurId: "",
      type: "EVALUATION",
    });
  };

  // Sort evaluations by date (newest first)
  const sortedEvaluations =
    evaluations?.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) ||
    [];

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) resetForm();
      }}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="h-auto p-4 flex flex-col items-center space-y-2 bg-white dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-orange-500 hover:bg-orange-50/50 transition-all duration-300 group">
          <div className="p-3 rounded-2xl bg-orange-100 dark:bg-orange-900/30 group-hover:scale-110 transition-transform duration-300">
            <Calendar className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="text-center">
            <div className="font-bold text-sm">Programmation</div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">
              Épreuves & Devoirs
            </div>
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-none shadow-2xl h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-orange-500/10 via-orange-500/5 to-transparent p-6 border-b shrink-0">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500 text-white">
                <Trophy className="w-6 h-6" />
              </div>
              Programmation des Évaluations
            </DialogTitle>
          </DialogHeader>
        </div>

        <Tabs defaultValue="new" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-4 shrink-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="new" className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4" />
                Nouvelle Évaluation
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="w-4 h-4" />
                Historique & Gestion
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="new" className="overflow-hidden flex flex-col mt-0">
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-8">
                {/* Step 1: Type Selection */}
                <section className="space-y-4">
                  <Label className="text-lg font-bold flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-600 text-xs flex items-center justify-center">
                      1
                    </span>
                    Type d'événement
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      {
                        id: "EVALUATION",
                        label: "Examen / Éval",
                        icon: Trophy,
                        color: "orange",
                        desc: "Compositions, tests...",
                      },
                      {
                        id: "EXERCICE",
                        label: "Devoir / Exercice",
                        icon: PencilLine,
                        color: "blue",
                        desc: "Travaux de maison...",
                      },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setFormData({ ...formData, type: t.id as any })}
                        className={`
                          relative flex flex-col items-start gap-2 p-4 rounded-2xl border-2 text-left transition-all duration-300
                          ${
                            formData.type === t.id
                              ? `border-${t.color}-500 bg-${t.color}-50 dark:bg-${t.color}-950/30 scale-[1.02] shadow-md`
                              : "border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700"
                          }
                        `}>
                        <t.icon
                          className={`w-6 h-6 ${formData.type === t.id ? `text-${t.color}-600` : "text-gray-400"}`}
                        />
                        <div>
                          <span
                            className={`text-sm font-black ${formData.type === t.id ? `text-${t.color}-700` : "text-gray-600"}`}>
                            {t.label}
                          </span>
                          <p className="text-[10px] text-gray-400 font-medium">{t.desc}</p>
                        </div>
                        {formData.type === t.id && (
                          <div
                            className={`absolute top-3 right-3 w-5 h-5 rounded-full bg-${t.color}-500 text-white flex items-center justify-center shadow-sm`}>
                            <CheckCircle2 className="w-3 h-3" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Step 2: Main Info */}
                <section className="space-y-6">
                  <Label className="text-lg font-bold flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-600 text-xs flex items-center justify-center">
                      2
                    </span>
                    Détails de l'évaluation
                  </Label>

                  <div className="space-y-4 bg-gray-50 dark:bg-gray-900/50 p-6 rounded-3xl border border-gray-100 dark:border-gray-800">
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-gray-500">
                        Titre de l'évaluation *
                      </Label>
                      <div className="relative">
                        <Layout className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          placeholder="Ex: Devoir Harmonisé n°1"
                          className="pl-10 bg-white dark:bg-gray-800 border-none shadow-sm font-bold"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-gray-500">
                          Classe *
                        </Label>
                        <Select
                          value={formData.classeId}
                          onValueChange={(val) => setFormData({ ...formData, classeId: val })}>
                          <SelectTrigger className="bg-white dark:bg-gray-800 border-none shadow-sm">
                            <SelectValue placeholder="Choisir" />
                          </SelectTrigger>
                          <SelectContent>
                            {classes?.map((c: any) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.niveau} {c.nom}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-gray-500">
                          Matière *
                        </Label>
                        <Select
                          value={formData.disciplineId}
                          onValueChange={(val) => setFormData({ ...formData, disciplineId: val })}>
                          <SelectTrigger className="bg-white dark:bg-gray-800 border-none shadow-sm">
                            <SelectValue placeholder="Choisir" />
                          </SelectTrigger>
                          <SelectContent>
                            {subjects?.map((s: any) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-gray-500">
                          Date prévue *
                        </Label>
                        <Input
                          type="date"
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          className="bg-white dark:bg-gray-800 border-none shadow-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-gray-500">
                          Enseignant (Optionnel)
                        </Label>
                        <Select
                          value={formData.professeurId}
                          onValueChange={(val) => setFormData({ ...formData, professeurId: val })}>
                          <SelectTrigger className="bg-white dark:bg-gray-800 border-none shadow-sm">
                            <SelectValue placeholder="Tous" />
                          </SelectTrigger>
                          <SelectContent>
                            {teachers?.map((t: any) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.prenom} {t.nom}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-gray-500">
                        Description / Consignes
                      </Label>
                      <Textarea
                        placeholder="Détails supplémentaires..."
                        className="bg-white dark:bg-gray-800 border-none shadow-sm min-h-[100px]"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                  </div>
                </section>
              </div>
            </ScrollArea>
            <div className="p-6 bg-white dark:bg-gray-900 border-t flex justify-end gap-4 shadow-lg z-10">
              <Button variant="outline" className="font-bold px-8" onClick={() => setIsOpen(false)}>
                Annuler
              </Button>
              <Button
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-8 shadow-md shadow-orange-500/20"
                onClick={handleSubmit}
                disabled={createEvaluation.isPending}>
                {createEvaluation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Planification...
                  </>
                ) : (
                  "Planifier l'éval"
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="history" className="overflow-hidden flex flex-col mt-0">
            <ScrollArea className="flex-1">
              <div className="p-6">
                {isLoadingEvaluations ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                  </div>
                ) : sortedEvaluations.length > 0 ? (
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-gray-50 dark:bg-gray-900">
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Titre</TableHead>
                          <TableHead>Classe</TableHead>
                          <TableHead>Matière</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedEvaluations.map((evalItem) => (
                          <TableRow key={evalItem.id}>
                            <TableCell className="font-medium">
                              {new Date(evalItem.date).toLocaleDateString("fr-FR")}
                            </TableCell>
                            <TableCell>{evalItem.title}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {evalItem.classe?.niveau} {evalItem.classe?.nom}
                              </Badge>
                            </TableCell>
                            <TableCell>{evalItem.discipline?.name}</TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={
                                  evalItem.type === "EVALUATION"
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-blue-100 text-blue-700"
                                }>
                                {evalItem.type === "EVALUATION" ? "Composition" : "Devoir"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDelete(evalItem.id)}
                                disabled={deleteEvaluation.isPending}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-bold">Aucun historique disponible</p>
                    <p className="text-sm">Les évaluations planifiées apparaîtront ici.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
            <div className="p-4 bg-white dark:bg-gray-900 border-t flex justify-end shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
              <Button className="font-bold px-8" variant="outline" onClick={() => setIsOpen(false)}>
                Fermer
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AdminEvaluationScheduler;
