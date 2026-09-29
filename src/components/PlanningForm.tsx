import React, { useState, useEffect } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Save, Loader2 } from "lucide-react";

interface PlanningFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialClass?: string;
  editingPlanning?: any;
}

const PlanningForm: React.FC<PlanningFormProps> = ({
  isOpen,
  onClose,
  initialClass,
  editingPlanning,
}) => {
  const [formData, setFormData] = useState({
    classe: initialClass || "",
    semaine: "",
    contenu: "",
  });

  // Remplir le formulaire si on modifie un planning existant
  useEffect(() => {
    if (editingPlanning) {
      setFormData({
        classe: editingPlanning.classe,
        semaine: editingPlanning.semaine,
        contenu: editingPlanning.contenu,
      });
    } else {
      setFormData({
        classe: initialClass || "",
        semaine: "",
        contenu: "",
      });
    }
  }, [editingPlanning, initialClass]);

  const handleSubmit = async () => {
    if (!formData.classe || !formData.semaine || !formData.contenu) {
      return;
    }

    console.log("Données du formulaire:", formData);

    try {
      if (editingPlanning) {
        // Mode édition
        // await updatePlanningMutation.mutateAsync({
        //   id: editingPlanning.id,
        //   classe: formData.classe,
        //   semaine: formData.semaine,
        //   contenu: formData.contenu,
        // });
      } else {
        // Mode création
        // await createPlanningMutation.mutateAsync({
        //   classe: formData.classe,
        //   semaine: formData.semaine,
        //   contenu: formData.contenu,
        // });
      }

      setFormData({ classe: "", semaine: "", contenu: "" });
      onClose();
    } catch (error) {
      console.error("Erreur dans handleSubmit:", error);
    }
  };

  const handleClose = () => {
    setFormData({ classe: initialClass || "", semaine: "", contenu: "" });
    onClose();
  };

  const isLoading = false;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editingPlanning ? "Modifier le planning" : "Créer un planning"}
          </DialogTitle>
          <DialogDescription>
            {editingPlanning
              ? "Modifiez les informations du planning existant."
              : "Créez un nouveau planning pour une classe et une semaine spécifiques."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="planning-classe">Classe *</Label>
            <Select
              value={formData.classe}
              onValueChange={(value) => setFormData({ ...formData, classe: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une classe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6ème">6ème</SelectItem>
                <SelectItem value="5ème">5ème</SelectItem>
                <SelectItem value="4ème">4ème</SelectItem>
                <SelectItem value="3ème">3ème</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="planning-semaine">Semaine *</Label>
            <Input
              id="planning-semaine"
              value={formData.semaine}
              onChange={(e) => setFormData({ ...formData, semaine: e.target.value })}
              placeholder="ex: Semaine du 25 au 29 juin 2025"
              required
            />
          </div>

          <div>
            <Label htmlFor="planning-contenu">Contenu du planning *</Label>
            <Textarea
              id="planning-contenu"
              value={formData.contenu}
              onChange={(e) => setFormData({ ...formData, contenu: e.target.value })}
              placeholder="Décrivez le planning de la semaine (JSON, HTML ou texte libre)"
              className="min-h-[200px]"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Vous pouvez utiliser du JSON, HTML ou du texte libre pour décrire le planning
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !formData.classe || !formData.semaine || !formData.contenu}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {editingPlanning ? "Modifier le planning" : "Créer le planning"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PlanningForm;
