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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Student, Class } from "@/hooks/useUsers";
import { Parent } from "@/hooks/useParents";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/integrations/supabase/host";
import { useAuth } from "@/hooks/useAuth";
import httpClient from "@/api/htppClient";

interface EditStudentModalProps {
  student: Student & {
    classes?: { nom: string; niveau: string } | null;
    parent?: { nom: string; prenom: string } | null;
  };
  classes: Class[];
  parents: Parent[];
}

const EditStudentModal: React.FC<EditStudentModalProps> = ({ student, classes, parents }) => {
  const [open, setOpen] = useState(false);
  const { authUser } = useAuth();
  const [formData, setFormData] = useState({
    nom: student.nom,
    prenom: student.prenom,
    date_naissance: new Date(student.dateOfBirth).toISOString().split("T")[0],
    parent_id: student.parentId || "",
    classe_id: student.classeId || "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const accessToken = localStorage.getItem("accessToken");

    try {
      const response = await httpClient.put(
        `/api/schools/${authUser.schoolId}/students/${student.id}`,
        {
          nom: formData.nom,
          prenom: formData.prenom,
          dateOfBirth: formData.date_naissance || null,
          parentId: formData.parent_id || null,
          classeId: formData.classe_id || null,
          moyenne: student.moyenne,
          abscence: student.abscence,
          retards: student.retards,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (Math.floor(response.status / 100) != 2) {
        throw new Error("");
      }
      toast({
        title: "Succès",
        description: "L'élève a été modifié avec succès",
      });

      queryClient.invalidateQueries({ queryKey: ["classes"] });
      setOpen(false);
    } catch (error) {
      console.error("Erreur lors de la modification:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la modification",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    const accessToken = localStorage.getItem("accessToken");

    try {
      const response = await httpClient.delete(
        `/api/schools/${authUser.schoolId}/students/${student.id}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (Math.floor(response.status / 100) != 2) {
        throw new Error("");
      }

      toast({
        title: "Succès",
        description: "L'élève a été supprimé avec succès",
      });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      setOpen(false);
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier l'élève</DialogTitle>
          <DialogDescription>
            Modifiez les informations de l'élève {student.prenom} {student.nom}
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
            <Label htmlFor="date_naissance">Date de naissance</Label>
            <Input
              id="date_naissance"
              type="date"
              value={formData.date_naissance}
              onChange={(e) => setFormData({ ...formData, date_naissance: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="parent">Parent</Label>
            <Select
              value={formData.parent_id}
              onValueChange={(value) => setFormData({ ...formData, parent_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un parent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-">Aucun parent</SelectItem>
                {parents.map((parent) => (
                  <SelectItem key={parent.id} value={parent.id}>
                    {parent.prenom} {parent.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="classe">Classe</Label>
            <Select
              value={formData.classe_id}
              onValueChange={(value) => setFormData({ ...formData, classe_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une classe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-">Aucune classe</SelectItem>
                {classes.map((classe) => (
                  <SelectItem key={classe.id} value={classe.id}>
                    {classe.niveau} - {classe.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
                    Êtes-vous sûr de vouloir supprimer l'élève {student.prenom} {student.nom} ?
                    Cette action est irréversible.
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

export default EditStudentModal;
