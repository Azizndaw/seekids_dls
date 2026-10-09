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
import { Parent } from "@/hooks/useParents";
import { Student } from "@/hooks/useUsers";
import { useToast } from "@/hooks/use-toast";

import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiUrl } from "@/integrations/supabase/host";
import httpClient from "@/api/htppClient";

interface EditParentModalProps {
  parent: Parent;
  students: Student[];
}

const EditParentModal: React.FC<EditParentModalProps> = ({ parent, students }) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    nom: parent.nom,
    prenom: parent.prenom,
    email: parent.email,
    telephone: parent.telephone || "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { authUser } = useAuth();
  const queryClient = useQueryClient();

  const children = students.filter((student) => student.parentId === parent.id);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const accessToken = localStorage.getItem("accessToken");

      const response = await httpClient.put(
        `/api/schools/${authUser.schoolId}/admin-actions/parents/${parent.id}`,
        {
          nom: formData.nom,
          prenom: formData.prenom,
          email: formData.email,
          telephone: formData.telephone || "null",
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (Math.floor(response.status / 100) !== 2) {
        throw new Error();
      }

      toast({
        title: "Succès",
        description: "Le parent a été modifié avec succès",
      });

      queryClient.invalidateQueries({ queryKey: ["parents"] });
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

    try {
      // D'abord, détacher les enfants de ce parent
      const accessToken = localStorage.getItem("accessToken");

      const response = await httpClient.delete(`/api/auth/users/${parent.id}`, {
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
        description: "Le parent a été supprimé avec succès",
      });

      queryClient.invalidateQueries({ queryKey: ["parents"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
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
          <DialogTitle>Modifier le parent</DialogTitle>
          <DialogDescription>
            Modifiez les informations du parent {parent.prenom} {parent.nom}
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

          {children.length > 0 && (
            <div>
              <Label>Enfants associés</Label>
              <div className="text-sm text-muted-foreground mt-1">
                {children.map((child) => (
                  <div key={child.id}>
                    {child.prenom} {child.nom}
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
                    Êtes-vous sûr de vouloir supprimer le parent {parent.prenom} {parent.nom} ?
                    {children.length > 0 && (
                      <span className="block mt-2 text-amber-600">
                        Attention : Ce parent a {children.length} enfant(s) associé(s). Les enfants
                        seront détachés de ce parent.
                      </span>
                    )}
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

export default EditParentModal;
