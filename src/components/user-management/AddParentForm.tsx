import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { UserPlus, Save, Loader2, X, Plus } from "lucide-react";
import { useCreateParent } from "@/hooks/useParents";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useClasses } from "@/hooks/useUsers";
import { useQueryClient } from "@tanstack/react-query";

const AddParentForm: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    password: "motdepasse123", // Mot de passe par défaut
  });
  const [visible, setVisible] = useState(false);

  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [createdParent, setCreatedParent] = useState(null);

  const [children, setChildren] = useState([
    {
      nom: "",
      prenom: "",
      date_naissance: "",
      classe_id: "",
    },
  ]);
  const queryClient = useQueryClient();

  const createParentMutation = useCreateParent();
  const { data: classes = [] } = useClasses();

  const addChild = () => {
    setChildren([
      ...children,
      {
        nom: "",
        prenom: "",
        date_naissance: "",
        classe_id: "",
      },
    ]);
  };

  const removeChild = (index: number) => {
    if (children.length > 1) {
      setChildren(children.filter((_, i) => i !== index));
    }
  };

  const updateChild = (index: number, field: string, value: string) => {
    const updatedChildren = [...children];
    updatedChildren[index] = { ...updatedChildren[index], [field]: value };
    setChildren(updatedChildren);
  };

  const handleSubmit = async () => {
    // Validation: Nom, prénom et mot de passe requis
    if (
      !formData.nom ||
      !formData.prenom ||
      !formData.password
    ) {
      return;
    }

    console.log('Bouton "Créer un parent" cliqué - Données:', formData);
    const childrenOfParent: any[] = [];
    for (const child of children) {
      if (!!child.prenom && !!child.nom) {
        childrenOfParent.push({
          nom: child.nom,
          prenom: child.prenom,
          dateOfBirth: child.date_naissance,
          classe: child.classe_id,
        });
      }
    }

    try {
      const parent = await createParentMutation.mutateAsync({
        nom: formData.nom,
        prenom: formData.prenom,
        email: formData.email || undefined,
        telephone: formData.telephone || undefined,
        password: formData.password,
        students: childrenOfParent,
      });

      if (!parent) {
        console.error("Erreur");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setCreatedParent(parent);
      setShowWhatsAppDialog(true);
    } catch (error) {
      // L'erreur est déjà gérée dans le hook
      console.error("Erreur dans handleSubmit:", error);
    }
  };

  const handleWhatsAppChoice = (sendWhatsApp: boolean) => {
    const currentUrl = window.location.origin;

    if (sendWhatsApp && createdParent) {
      const message = `Bonjour ${createdParent.prenom} ${createdParent.nom},

Votre compte parent a été créé avec succès !

Email: ${createdParent.email || "Non fourni"}
Téléphone: ${createdParent.telephone || "Non fourni"}
Mot de passe: ${formData.password}

Vous pouvez vous connecter avec votre email ou votre numéro de téléphone sur votre espace : ${currentUrl}

Cordialement,
L'équipe administrative`;

      const whatsappUrl = `https://wa.me/${createdParent.telephone}?text=${encodeURIComponent(
        message
      )}`;
      window.open(whatsappUrl, "_blank");
    }

    // Réinitialiser et fermer
    setFormData({ nom: "", prenom: "", email: "", telephone: "", password: "motdepasse123" });
    setChildren([{ nom: "", prenom: "", date_naissance: "", classe_id: "" }]);
    setCreatedParent(null);
    setShowWhatsAppDialog(false);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="w-4 h-4 mr-2" />
          Créer un parent
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer un accès parent</DialogTitle>
          <DialogDescription>
            Remplissez les informations du parent et de ses enfants. Un compte sera automatiquement
            créé.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {/* Informations du parent */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informations du parent</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="parent-nom">Nom *</Label>
                <Input
                  id="parent-nom"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="parent-prenom">Prénom *</Label>
                <Input
                  id="parent-prenom"
                  value={formData.prenom}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="parent-email">Email (optionnel)</Label>
              <Input
                id="parent-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="parent-telephone">Téléphone</Label>
              <PhoneInput
                country={"sn"}
                value={formData.telephone}
                placeholder="+221 77 123 45 67"
                onChange={(e) => setFormData({ ...formData, telephone: e.valueOf() })}
              />
            </div>
            <div>
              <Label htmlFor="parent-password">Mot de passe *</Label>
              <div style={{ display: "flex", alignItems: "center" }}>
                <Input
                  id="parent-password"
                  type={visible ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
                <div
                  onClick={() => setVisible(!visible)}
                  style={{
                    marginLeft: "8px",
                    width: "24px",
                    height: "24px",
                    backgroundColor: "#7b7b7bff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    userSelect: "none",
                    fontSize: "12px",
                    borderRadius: "4px",
                  }}>
                  {visible ? "🔓" : "🔒"}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Minimum 6 caractères requis</p>
            </div>
          </div>

          <Separator />

          {/* Enfants */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Enfants</h3>
              <Button type="button" variant="outline" size="sm" onClick={addChild}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un enfant
              </Button>
            </div>

            {children.map((child, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Enfant {index + 1}</h4>
                  {children.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeChild(index)}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`child-${index}-nom`}>Nom</Label>
                    <Input
                      id={`child-${index}-nom`}
                      value={child.nom}
                      onChange={(e) => updateChild(index, "nom", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`child-${index}-prenom`}>Prénom</Label>
                    <Input
                      id={`child-${index}-prenom`}
                      value={child.prenom}
                      onChange={(e) => updateChild(index, "prenom", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`child-${index}-naissance`}>Date de naissance</Label>
                    <Input
                      id={`child-${index}-naissance`}
                      type="date"
                      value={child.date_naissance}
                      onChange={(e) => updateChild(index, "date_naissance", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`child-${index}-classe`}>Classe</Label>
                    <Select
                      value={child.classe_id}
                      onValueChange={(value) => updateChild(index, "classe_id", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir une classe" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((classe) => (
                          <SelectItem key={classe.id} value={classe.id}>
                            {classe.nom} - {classe.niveau}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              createParentMutation.isPending ||
              !formData.nom ||
              !formData.prenom
            }>
            {createParentMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Créer le parent
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Dialog WhatsApp */}
      <Dialog open={showWhatsAppDialog} onOpenChange={() => { }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Parent créé avec succès!</DialogTitle>
            <DialogDescription>
              Voulez-vous envoyer les informations de connexion par WhatsApp?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="font-medium">
                {createdParent?.prenom} {createdParent?.nom}
              </p>
              <p className="text-sm text-gray-600">Email: {createdParent?.email || "Non fourni"}</p>
              <p className="text-sm text-gray-600">
                Téléphone: {createdParent?.telephone || "Non fourni"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleWhatsAppChoice(false)}>
              Non, continuer
            </Button>
            <Button
              onClick={() => handleWhatsAppChoice(true)}
              className="bg-green-600 hover:bg-green-700">
              Envoyer par WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default AddParentForm;
