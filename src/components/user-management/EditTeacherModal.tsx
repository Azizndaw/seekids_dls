import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, Edit } from "lucide-react";
import { useAssignTeacherToClass, User } from "@/hooks/useUsers";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiUrl } from "@/integrations/supabase/host";
import httpClient from "@/api/htppClient";
import { useAssignSubjectToTeacher, useSubjects } from "@/hooks/useSubjects";

interface EditTeacherModalProps {
  teacher: User;
  classes: Array<{
    id: string;
    nom: string;
    niveau: string;
    schoolId: string;
    created_at?: string;
    professeurs?: Array<{
      professeurId: string;
    }>;
  }>;
}

const EditTeacherModal: React.FC<EditTeacherModalProps> = ({ teacher, classes }) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    nom: teacher.nom,
    prenom: teacher.prenom,
    email: teacher.email,
    telephone: teacher.telephone || "",
  });

  const [selectedClasses, setSelectedClasses] = useState<string[]>(
    classes
      .filter((classe) => classe.professeurs?.some((pc) => pc.professeurId === teacher.id))
      .map((classe) => classe.id)
  );
  const [isLoading, setIsLoading] = useState(false);
  const { data: subjects = [] } = useSubjects();
  const { mutate: assignSubjects } = useAssignSubjectToTeacher();
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(() => {
    return teacher.disciplines?.map((d) => d.id) ?? [];
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { authUser } = useAuth();

  const handleSubjectSelection = (subjectId: string, checked: boolean) => {
    if (checked) {
      setSelectedSubjects((prev) => [...prev, subjectId]);
    } else {
      setSelectedSubjects((prev) => prev.filter((id) => id !== subjectId));
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Mettre à jour les informations du professeur
      const accessToken = localStorage.getItem("accessToken");

      // Si c'est un professeur et qu'il y a des classes sélectionnées
      if (selectedSubjects.length > 0) {
        console.log("sss", selectedSubjects);
        assignSubjects({
          teacherId: teacher.id,
          disciplineIds: selectedSubjects,
        });
      }

      const response = await httpClient.put(
        `/api/schools/${authUser.schoolId}/teachers/${teacher.id}`,
        {
          nom: formData.nom,
          prenom: formData.prenom,
          email: formData.email,
          telephone: formData.telephone || "null",
          classes: selectedClasses,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (Math.floor(response.status / 100) !== 2) {
        throw new Error("");
      }
      toast({
        title: "Succès",
        description: "Le professeur a été modifié avec succès",
      });

      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      setOpen(false);
    } catch (error) {
      console.error("Erreur lors de la modification:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la modification" + error.toString(),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);

    try {
      // Supprimer d'abord les assignations de classes
      const accessToken = localStorage.getItem("accessToken");

      const response = await httpClient.delete(`/api/auth/users/${teacher.id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (Math.floor(response.status / 100) !== 2) {
        throw new Error();
      }

      toast({
        title: "Succès",
        description: "Le professeur a été supprimé avec succès",
      });

      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression --> " + error.toString(),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClassToggle = (classId: string, checked: boolean) => {
    if (checked) {
      setSelectedClasses([...selectedClasses, classId]);
    } else {
      setSelectedClasses(selectedClasses.filter((id) => id !== classId));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="w-4 h-4 mr-1" />
          Modifier
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le professeur</DialogTitle>
          <DialogDescription>
            Modifiez les informations du professeur {teacher.prenom} {teacher.nom}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="prenom">Prénom</Label>
              <Input
                id="prenom"
                value={formData.prenom}
                onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="nom">Nom</Label>
              <Input
                id="nom"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email (optionnel)</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="telephone">Téléphone</Label>
            <PhoneInput
              containerClass={"w-full"}
              country={"sn"}
              value={formData.telephone}
              placeholder="+221 77 123 45 67"
              onChange={(e) => setFormData({ ...formData, telephone: e.valueOf() })}
            />
          </div>

          <div>
            <Label>Classes assignées</Label>
            <div className="space-y-2 mt-2 max-h-32 overflow-y-auto">
              {classes.map((classe) => (
                <div key={classe.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`classe-${classe.id}`}
                    checked={selectedClasses.includes(classe.id)}
                    onCheckedChange={(checked) => handleClassToggle(classe.id, checked as boolean)}
                  />
                  <Label htmlFor={`classe-${classe.id}`} className="text-sm">
                    {classe.niveau} - {classe.nom}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {subjects.length > 0 && (
            <div>
              <Label>Matières enseignées</Label>
              <div className="space-y-2 max-h-32 overflow-y-auto border rounded p-2">
                {subjects.map((subject) => (
                  <div key={subject.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`subject-${subject.id}`}
                      checked={selectedSubjects.includes(subject.id)}
                      onCheckedChange={(checked) =>
                        handleSubjectSelection(subject.id, checked as boolean)
                      }
                    />
                    <Label htmlFor={`subject-${subject.id}`} className="text-sm">
                      {subject.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" size="sm">
                  <Trash2 className="w-4 h-4 mr-1" />
                  Supprimer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                  <AlertDialogDescription>
                    Êtes-vous sûr de vouloir supprimer le professeur {teacher.prenom} {teacher.nom}{" "}
                    ? Cette action est irréversible et supprimera également toutes ses assignations
                    de classes.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={isLoading}>
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="space-x-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTeacherModal;
