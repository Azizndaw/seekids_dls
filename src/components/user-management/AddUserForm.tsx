import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { Checkbox } from "@/components/ui/checkbox";
import { UserPlus, Save, Loader2 } from "lucide-react";
import { useCreateUser, useAssignTeacherToClass } from "@/hooks/useUsers";
import { useSubjects, useAssignSubjectToTeacher } from "@/hooks/useSubjects";

interface AddUserFormProps {
  roles: "TEACHER" | "PARENT";
  triggerText: string;
  title: string;
  description: string;
  classes?: Array<{
    id: string;
    nom: string;
    niveau: string;
  }>;
}

const AddUserForm: React.FC<AddUserFormProps> = ({
  roles: role,
  triggerText,
  title,
  description,
  classes = [],
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    mot_de_passe: role === "TEACHER" ? "Seekids2027" : "motdepasse123",
  });
  const [visible, setVisible] = useState(false);

  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState<boolean>(false);
  const [createdUser, setCreatedUser] = useState<any>(null);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  const createUserMutation = useCreateUser();
  const assignTeacherMutation = useAssignTeacherToClass();
  const assignSubjectMutation = useAssignSubjectToTeacher();
  const { data: subjects = [] } = useSubjects();

  const handleClassSelection = (classId: string, checked: boolean) => {
    if (checked) {
      setSelectedClasses((prev) => [...prev, classId]);
    } else {
      setSelectedClasses((prev) => prev.filter((id) => id !== classId));
    }
  };

  const handleSubjectSelection = (subjectId: string, checked: boolean) => {
    if (checked) {
      setSelectedSubjects((prev) => [...prev, subjectId]);
    } else {
      setSelectedSubjects((prev) => prev.filter((id) => id !== subjectId));
    }
  };

  const handleSubmit = async () => {
    // Validation: Nom, prénom, mot de passe requis
    if (
      !formData.nom ||
      !formData.prenom ||
      !formData.mot_de_passe
    ) {
      return;
    }

    try {
      const request = {
        nom: formData.nom,
        prenom: formData.prenom,
        email: formData.email || undefined,
        telephone: formData.telephone || undefined,
        role,
        password: formData.mot_de_passe,
        schoolId: "",
        disciplineIds: role === "TEACHER" && selectedSubjects.length > 0 ? selectedSubjects : [],
      };

      const user = await createUserMutation.mutateAsync(request);
      user.telephone = formData.telephone;

      // Si c'est un professeur et qu'il y a des classes sélectionnées
      if (role === "TEACHER" && selectedClasses.length > 0) {
        for (const classId of selectedClasses) {
          await assignTeacherMutation.mutateAsync({
            professeur_id: user.id,
            classe_id: classId,
          });
        }
      }

      setCreatedUser(user);
      setShowWhatsAppDialog(true);
    } catch (error) {
      console.error("Erreur lors de la création:", error);
    }
  };

  const handleWhatsAppChoice = (sendWhatsApp: boolean) => {
    if (sendWhatsApp && createdUser) {
      const currentUrl = window.location.origin;
      const contact = createdUser.telephone || createdUser.email;
      const message = `Bonjour ${createdUser.prenom} ${createdUser.nom},

          Votre compte a été créé avec succès !

          Email: ${createdUser.email || "Non fourni"}
          Téléphone: ${createdUser.telephone || "Non fourni"}
          Mot de passe: ${formData.mot_de_passe}

          Vous pouvez vous connecter avec votre email ou votre numéro de téléphone sur votre espace : ${currentUrl} .

          Cordialement,
          L'équipe administrative`;

      const whatsappUrl = `https://wa.me/${createdUser.telephone}?text=${encodeURIComponent(
        message
      )}`;
      window.open(whatsappUrl, "_blank");
    }

    // Réinitialiser et fermer
    setFormData({ nom: "", prenom: "", email: "", telephone: "", mot_de_passe: "" });
    setSelectedClasses([]);
    setSelectedSubjects([]);
    setCreatedUser(null);
    setShowWhatsAppDialog(false);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="w-4 h-4 mr-2" />
          {triggerText}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor={`${role}-nom`}>Nom</Label>
              <Input
                id={`${role}-nom`}
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor={`${role}-prenom`}>Prénom</Label>
              <Input
                id={`${role}-prenom`}
                value={formData.prenom}
                onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor={`${role}-email`}>Email (optionnel)</Label>
            <Input
              id={`${role}-email`}
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor={`${role}-telephone`}>Téléphone</Label>
            <PhoneInput
              country={"sn"}
              value={formData.telephone}
              placeholder="+221 77 123 45 67"
              onChange={(e) => setFormData({ ...formData, telephone: e.valueOf() })}
            />
          </div>
          <div>
            <Label htmlFor={`${role}-password`}>Mot de passe</Label>
            <div style={{ display: "flex", alignItems: "center" }}>
              <Input
                id={`${role}-password`}
                type={visible ? "text" : "password"}
                value={formData.mot_de_passe}
                onChange={(e) => setFormData({ ...formData, mot_de_passe: e.target.value })}
                placeholder="Créer un mot de passe"
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
          </div>

          {/* Attribution des matières pour les professeurs */}
          {role === "TEACHER" && subjects.length > 0 && (
            <div>
              <Label>Matières enseignées (obligatoire)</Label>
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

          {/* Attribution des classes pour les professeurs */}
          {role === "TEACHER" && classes.length > 0 && (
            <div>
              <Label>Classes à attribuer (optionnel)</Label>
              <div className="space-y-2 max-h-32 overflow-y-auto border rounded p-2">
                {classes.map((classe) => (
                  <div key={classe.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`class-${classe.id}`}
                      checked={selectedClasses.includes(classe.id)}
                      onCheckedChange={(checked) =>
                        handleClassSelection(classe.id, checked as boolean)
                      }
                    />
                    <Label htmlFor={`class-${classe.id}`} className="text-sm">
                      {classe.niveau} - {classe.nom}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              createUserMutation.isPending ||
              assignTeacherMutation.isPending ||
              assignSubjectMutation.isPending ||
              (role === "TEACHER" && selectedSubjects.length === 0) ||
              !formData.nom ||
              !formData.prenom ||
              !formData.mot_de_passe
            }>
            {createUserMutation.isPending ||
              assignTeacherMutation.isPending ||
              assignSubjectMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Créer l'accès
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Dialog WhatsApp */}
      <Dialog open={showWhatsAppDialog} onOpenChange={() => { }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Utilisateur créé avec succès!</DialogTitle>
            <DialogDescription>
              Voulez-vous envoyer les informations de connexion par WhatsApp?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="font-medium">
                {createdUser?.prenom} {createdUser?.nom}
              </p>
              <p className="text-sm text-gray-600">Email: {createdUser?.email || "Non fourni"}</p>
              <p className="text-sm text-gray-600">
                Téléphone: {createdUser?.telephone || "Non fourni"}
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

export default AddUserForm;
