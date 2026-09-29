import React, { useState } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserPlus, Save, Loader2 } from "lucide-react";
import { useCreateStudent, Class } from "@/hooks/useUsers";
import { Parent } from "@/hooks/useParents";
import { useQueryClient } from "@tanstack/react-query";

interface AddStudentFormProps {
  classes: Class[];
  parents: Parent[];
}

const AddStudentForm: React.FC<AddStudentFormProps> = ({ classes, parents }) => {
  const [isOpen, setIsOpen] = useState(false);

  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    date_naissance: "",
    classe_id: "CM2",
    parent_id: "",
  });

  const queryClient = useQueryClient();
  const createStudentMutation = useCreateStudent();

  const handleSubmit = async () => {
    if (formData.nom && formData.prenom && formData.classe_id) {
      await createStudentMutation.mutateAsync({
        nom: formData.nom,
        prenom: formData.prenom,
        classeId: formData.classe_id,
        dateOfBirth: formData.date_naissance,
        parentId: formData.parent_id,
        schoolId: "",
      });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      setFormData({ nom: "", prenom: "", date_naissance: "", classe_id: "", parent_id: "" });
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="w-4 h-4 mr-2" />
          Ajouter un élève
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un nouvel élève</DialogTitle>
          <DialogDescription>Remplissez les informations de l'élève</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="student-nom">Nom</Label>
              <Input
                id="student-nom"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="student-prenom">Prénom</Label>
              <Input
                id="student-prenom"
                value={formData.prenom}
                onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="student-birth">Date de naissance</Label>
            <Input
              id="student-birth"
              type="date"
              value={formData.date_naissance}
              onChange={(e) => setFormData({ ...formData, date_naissance: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="student-class">Classe</Label>
            <Select
              value={formData.classe_id}
              onValueChange={(value) => setFormData({ ...formData, classe_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une classe" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((classe) => (
                  <SelectItem key={classe.id} value={classe.id}>
                    {classe.niveau} - {classe.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="student-parent">Parent (optionnel)</Label>
            <Select
              value={formData.parent_id}
              onValueChange={(value) => setFormData({ ...formData, parent_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un parent" />
              </SelectTrigger>
              <SelectContent>
                {parents.map((parent) => (
                  <SelectItem key={parent.id} value={parent.id}>
                    {parent.prenom} {parent.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={createStudentMutation.isPending}>
            {createStudentMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Ajouter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddStudentForm;
