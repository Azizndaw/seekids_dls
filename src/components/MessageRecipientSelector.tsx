import React, { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, User, Search, X, Loader2 } from "lucide-react";
import { useParents } from "@/hooks/useParents";
import { useAllAdmins, useUsers } from "@/hooks/useUsers";
import { useAuth } from "@/hooks/useAuth";

interface Parent {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  enfants: string[];
}

interface Teacher {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  matiere: string;
  classes: string[];
}

interface Classe {
  id: string;
  nom: string;
  niveau: string;
}

interface AdminMember {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  poste: string;
}

interface MessageRecipientSelectorProps {
  userRole: "teacher" | "admin";
  messageType?: "parents" | "teachers" | "administration";
  onRecipientsChange: (recipients: any[]) => void;
  availableClasses?: { id: string; nom: string; niveau: string }[];
}

const MessageRecipientSelector = ({
  userRole,
  messageType = "parents",
  onRecipientsChange,
  availableClasses = [],
}: MessageRecipientSelectorProps) => {
  const [recipientType, setRecipientType] = useState<"all" | "specific" | "class">("specific");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const { authUser } = useAuth();

  const { data: parents } = useParents();
  const { data: teachers } = useUsers();
  const { data: admins } = useAllAdmins(authUser);

  if (!parents && !teachers) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // Mapped parents with children info for filtering
  const mappedParents = parents?.map((p) => ({
    id: p.id,
    nom: p.nom,
    prenom: p.prenom,
    email: p.email,
    enfants: p.children?.map((c) => `${c.prenom} ${c.nom}`),
    // IMPORTANT: Assuming child has classeId or className we can match against
    childrenClasses: p.children?.map(c => c.classe?.id || c.classeId)
  })) || [];

  const mockTeachers: Teacher[] = teachers?.map((t) => ({
    id: t.id,
    nom: t.nom,
    prenom: t.prenom,
    email: t.email,
    matiere: t.disciplines?.map((d) => d.name)?.join(", "),
    classes: t.classes?.map((c) => [c.classe.niveau, c.classe.nom].join(" ")),
  })) || [];

  const classesToUse = availableClasses.length > 0 ? availableClasses : [
    { id: "1", nom: "6ème A", niveau: "6ème" },
    { id: "2", nom: "5ème B", niveau: "5ème" },
    { id: "3", nom: "4ème C", niveau: "4ème" },
  ];

  const mockAdminMembers: AdminMember[] = admins?.map((a) => ({
    id: a.id,
    nom: a.nom,
    prenom: a.prenom,
    email: a.email,
    poste: "ADMIN",
  })) || [];

  const currentData =
    messageType === "parents"
      ? mappedParents
      : messageType === "teachers"
        ? mockTeachers
        : mockAdminMembers;

  const filteredRecipients = currentData?.filter(
    (recipient) =>
      `${recipient.prenom} ${recipient.nom}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recipient.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRecipientToggle = (recipientId: string) => {
    const newSelected = selectedRecipients.includes(recipientId)
      ? selectedRecipients.filter((id) => id !== recipientId)
      : [...selectedRecipients, recipientId];

    setSelectedRecipients(newSelected);

    // Notifier le parent du changement
    const selectedRecipientsData = currentData.filter((r) => newSelected.includes(r.id));
    onRecipientsChange(selectedRecipientsData);
  };

  const handleRecipientTypeChange = (type: string) => {
    setRecipientType(type as "all" | "specific" | "class");
    setSelectedRecipients([]);
    setSelectedClass("");

    if (type === "all") {
      onRecipientsChange(currentData);
    } else {
      onRecipientsChange([]);
    }
  };

  const handleClassChange = (classId: string) => {
    setSelectedClass(classId);
    // const selectedClassData = classesToUse.find((c) => c.id === classId);

    if (classId) {
      if (messageType === "parents") {
        // Récupérer les parents des élèves de cette classe
        const classParents = mappedParents.filter((parent) =>
          // Check if parent has any child in the selected class ID
          parent.childrenClasses?.includes(classId)
        );
        onRecipientsChange(classParents);
        // Automatically select these parents in UI if desired, or just pass them back
        setSelectedRecipients(classParents.map(p => p.id));
      } else {
        // Logic for teachers by class if needed (not primary use case here)
      }
    }
  };

  const recipientLabel =
    messageType === "parents"
      ? "parents"
      : messageType === "teachers"
        ? "professeurs"
        : "membres de l'administration";
  const allLabel =
    messageType === "parents"
      ? "Tous les parents"
      : messageType === "teachers"
        ? "Tous les professeurs"
        : "Toute l'administration";
  const specificLabel =
    messageType === "parents"
      ? "Parents spécifiques"
      : messageType === "teachers"
        ? "Professeurs spécifiques"
        : "Membres spécifiques";

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-blue-600" />
        <h3 className="font-medium">Destinataires du message</h3>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium mb-2 block">Type de destinataire</label>
          <Select value={recipientType} onValueChange={handleRecipientTypeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {userRole === "admin" && (
                <SelectItem value="all">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>{allLabel}</span>
                  </div>
                </SelectItem>
              )}
              <SelectItem value="specific">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>{specificLabel}</span>
                </div>
              </SelectItem>
              <SelectItem value="class">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Par classe</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {recipientType === "specific" && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder={`Rechercher un ${messageType === "parents"
                  ? "parent"
                  : messageType === "teachers"
                    ? "professeur"
                    : "membre de l'administration"
                  }...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {filteredRecipients.map((recipient) => (
                <div
                  key={recipient.id}
                  className="flex items-start space-x-3 p-2 hover:bg-white rounded-lg">
                  <Checkbox
                    checked={selectedRecipients.includes(recipient.id)}
                    onCheckedChange={() => handleRecipientToggle(recipient.id)}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {recipient.prenom} {recipient.nom}
                    </div>
                    <div className="text-xs text-gray-500">{recipient.email}</div>
                    <div className="text-xs text-blue-600">
                      {messageType === "parents"
                        ? (recipient as Parent).enfants.join(", ")
                        : messageType === "teachers"
                          ? `${(recipient as Teacher).matiere} - ${(
                            recipient as Teacher
                          ).classes.join(", ")}`
                          : (recipient as AdminMember).poste}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedRecipients.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">{recipientLabel} sélectionnés :</div>
                <div className="flex flex-wrap gap-2">
                  {selectedRecipients.map((recipientId) => {
                    const recipient = currentData.find((r) => r.id === recipientId);
                    return recipient ? (
                      <Badge
                        key={recipientId}
                        variant="secondary"
                        className="flex items-center gap-1">
                        {recipient.prenom} {recipient.nom}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-transparent"
                          onClick={() => handleRecipientToggle(recipientId)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {recipientType === "class" && (
          <div>
            <label className="text-sm font-medium mb-2 block">Sélectionner une classe</label>
            <Select value={selectedClass} onValueChange={handleClassChange}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir une classe" />
              </SelectTrigger>
              <SelectContent>
                {classesToUse.map((classe) => (
                  <SelectItem key={classe.id} value={classe.id}>
                    {classe.nom} ({classe.niveau})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {recipientType === "all" && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 text-blue-700">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">
                Message envoyé à {allLabel.toLowerCase()} de l'école
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageRecipientSelector;
