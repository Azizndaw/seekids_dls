import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, User, Lock, Save, Baby, Loader2 } from "lucide-react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { useNavigate } from "react-router-dom";
import LogoutButton from "@/components/LogoutButton";
import ThemeToggle from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetCurrentParent } from "@/hooks/useParents";
import { useUpdatePassword, useUpdateSelfParent } from "@/hooks/useUsers";
import httpClient from "@/api/htppClient";
import { useAuth } from "@/hooks/useAuth";
import { apiUrl } from "@/integrations/supabase/host";

const ParentSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const updateParentMutation = useUpdateSelfParent();
  const { data: currentParrent, isLoading, error } = useGetCurrentParent();
  const { authUser } = useAuth();

  // État pour les informations personnelles
  const [personalInfo, setPersonalInfo] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    adresse: "",
    profession: "",
  });

  // État pour les enfants et la sélection
  const [children, setChildren] = useState([
    {
      id: "",
      nom: "",
      prenom: "",
      classe: "",
      dateOfBirth: "",
    },
  ]);
  const [visible, setVisible] = useState(false);

  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const selectedChild = children.find((child) => child.id === selectedChildId) || children[0];

  // État pour les informations de l'enfant sélectionné
  const [childInfo, setChildInfo] = useState(selectedChild);

  const handleSavePersonalInfo = async () => {
    const x = await updateParentMutation.mutateAsync({
      nom: personalInfo.nom,
      prenom: personalInfo.prenom,
      email: personalInfo.email,
      telephone: personalInfo.telephone,
      profession: personalInfo.profession,
    });

    if (x) {
      toast({
        title: "Informations sauvegardées",
        description: "Vos informations personnelles ont été mises à jour avec succès.",
      });
    }
  };

  // Mettre à jour childInfo quand on change d'enfant sélectionné
  useEffect(() => {
    const child = children.find((child) => child.id === selectedChildId);
    if (child) {
      setChildInfo(child);
    }
  }, [selectedChildId, children]);

  useEffect(() => {
    if (currentParrent) {
      setPersonalInfo({
        nom: currentParrent.nom,
        prenom: currentParrent.prenom,
        email: currentParrent.email,
        telephone: currentParrent.telephone,
        profession: currentParrent.profession,
        adresse: "",
      });
      setChildren(currentParrent.children);
    }
  }, [currentParrent]);

  const handleSaveChildInfo = async () => {
    // Ici on ne sauvegarde que l'enfant sélectionné
    const realSelectedChild: any = selectedChild;
    if (!realSelectedChild) {
      return;
    }
    const accessToken = localStorage.getItem("accessToken");
    const response = await httpClient.put(
      `/api/schools/${authUser.schoolId}/students/${selectedChildId}`,
      {
        nom: childInfo.nom,
        prenom: childInfo.prenom,
        dateOfBirth: childInfo.dateOfBirth || null,
        parentId: authUser.id,
        classeId: realSelectedChild.classeId || null,
        moyenne: realSelectedChild.moyenne,
        abscence: realSelectedChild.abscence,
        retards: realSelectedChild.retards,
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
    console.log(`Sauvegarde des informations pour l'enfant ID: ${selectedChildId}`, childInfo);
    toast({
      title: "Informations de l'enfant sauvegardées",
      description: "Les informations de votre enfant ont été mises à jour.",
    });
  };

  //----------Sécurité--------
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { mutateAsync: updatePassword, isPending } = useUpdatePassword();

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir tous les champs.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas.",
        variant: "destructive",
      });
      return;
    }

    try {
      await updatePassword({
        oldPassword: currentPassword,
        newPassword: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      // Toast already handled in onError, no need to catch here unless you want to do more
    }
  };

  // --------------------------
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-3 sm:p-6 transition-colors duration-300">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate("/parent-dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Paramètres Parent
              </h1>
              <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                Gérez vos préférences et informations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LogoutButton className="w-full sm:w-auto" />
          </div>
        </div>

        {/* Tabs de paramètres */}
        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personal" className="text-xs sm:text-sm">
              <User className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Profil</span>
            </TabsTrigger>
            <TabsTrigger value="child" className="text-xs sm:text-sm">
              <Baby className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Enfant</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="text-xs sm:text-sm">
              <Lock className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Sécurité</span>
            </TabsTrigger>
          </TabsList>

          {/* Onglet Informations personnelles */}
          <TabsContent value="personal">
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <User className="w-5 h-5" />
                  Mes Informations Personnelles
                </CardTitle>
                <CardDescription className="dark:text-gray-300">
                  Modifiez vos informations personnelles de parent
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nom">Nom</Label>
                    <Input
                      id="nom"
                      value={personalInfo.nom}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, nom: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="prenom">Prénom</Label>
                    <Input
                      id="prenom"
                      value={personalInfo.prenom}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, prenom: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={personalInfo.email}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="telephone">Téléphone</Label>
                    <Label htmlFor="telephone">Téléphone</Label>
                    <PhoneInput
                      containerClass={"w-full"}
                      country={"sn"}
                      value={personalInfo.telephone}
                      placeholder="+221 77 123 45 67"
                      onChange={(e) => setPersonalInfo({ ...personalInfo, telephone: e.valueOf() })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="profession">Profession</Label>
                    <Input
                      id="profession"
                      value={personalInfo.profession}
                      onChange={(e) =>
                        setPersonalInfo({ ...personalInfo, profession: e.target.value })
                      }
                    />
                  </div>
                </div>

                {/*  WE will put it back when we need it
                <div>
                  <Label htmlFor="adresse">Adresse</Label>
                  <Textarea
                    id="adresse"
                    value={personalInfo.adresse}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, adresse: e.target.value })}
                    placeholder="Votre adresse complète..."
                  />
                </div> 
                */}

                <Button onClick={handleSavePersonalInfo} className="w-full sm:w-auto">
                  <Save className="w-4 h-4 mr-2" />
                  Sauvegarder mes informations
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Informations de l'enfant */}
          <TabsContent value="child">
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <Baby className="w-5 h-5" />
                  Informations de l'Enfant
                </CardTitle>
                <CardDescription className="dark:text-gray-300">
                  Gérez les informations de votre enfant
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Sélecteur d'enfant */}
                <div>
                  <Label htmlFor="child-selector"> Sélectionner l'enfant à modifier</Label>
                  <Select
                    value={selectedChildId.toString()}
                    onValueChange={(value) => setSelectedChildId(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un enfant" />
                    </SelectTrigger>
                    <SelectContent>
                      {currentParrent?.children.map((child) => (
                        <SelectItem key={child.id} value={child.id.toString()}>
                          {child.prenom} {child.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Informations de base */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="child-nom">Nom de l'enfant</Label>
                    <Input
                      id="child-nom"
                      value={childInfo.nom}
                      onChange={(e) => setChildInfo({ ...childInfo, nom: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="child-prenom">Prénom de l'enfant</Label>
                    <Input
                      id="child-prenom"
                      value={childInfo.prenom}
                      onChange={(e) => setChildInfo({ ...childInfo, prenom: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="child-date">Date de naissance</Label>
                  <Input
                    id="child-date"
                    type="date"
                    value={
                      childInfo.dateOfBirth
                        ? new Date(childInfo?.dateOfBirth).toISOString().slice(0, 10)
                        : ""
                    }
                    onChange={(e) => setChildInfo({ ...childInfo, dateOfBirth: e.target.value })}
                  />
                </div>

                <Button onClick={handleSaveChildInfo} className="w-full sm:w-auto">
                  <Save className="w-4 h-4 mr-2" />
                  Sauvegarder les informations de l'enfant
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Sécurité */}
          <TabsContent value="security">
            <div className="space-y-6">
              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 dark:text-white">
                    <Lock className="w-5 h-5" />
                    Sécurité du Compte
                  </CardTitle>
                  <CardDescription className="dark:text-gray-300">
                    Gérez la sécurité de votre compte parent
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Label htmlFor="current-password">Mot de passe actuel</Label>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <Input
                      id="current-password"
                      type={visible ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
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

                  <Label htmlFor="confirm-password">Nouveau mot de passe</Label>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <Input
                      id="confirm-password"
                      type={visible ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
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

                  <Label htmlFor="confirm-password">Confirmer le nouveau mot de passe</Label>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <Input
                      id="confirm-password"
                      type={visible ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
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

                  <Button
                    className="w-full sm:w-auto"
                    onClick={handlePasswordChange}
                    disabled={isPending}>
                    {isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        En cours...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        Changer le mot de passe
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ParentSettings;
