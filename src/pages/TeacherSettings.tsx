import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, User, Lock, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LogoutButton from "@/components/LogoutButton";
import ThemeToggle from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useGetCurrentTeacher, useUpdatePassword, useUpdateTeacherInfo } from "@/hooks/useUsers";
import { Loader2 } from "lucide-react";

const TeacherSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { authUser } = useAuth();
  const [visible, setVisible] = useState(false);

  const { data: currentTeacher, isLoading, error } = useGetCurrentTeacher(authUser);
  const useUpdateTeacherMutation = useUpdateTeacherInfo();
  const [personalInfo, setPersonalInfo] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    bio: "",
  });
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

  // Initialize state when authUser changes (e.g., after it's fetched)
  useEffect(() => {
    if (currentTeacher) {
      setPersonalInfo({
        nom: currentTeacher.nom || "",
        prenom: currentTeacher.prenom || "",
        email: currentTeacher.email || "",
        telephone: currentTeacher.telephone || "",
        bio: currentTeacher.biographie || "",
      });
    }
  }, [currentTeacher]); // Runs when `authUser` changes

  const handleSavePersonalInfo = async () => {
    const update = await useUpdateTeacherMutation.mutateAsync({
      nom: personalInfo.nom,
      email: personalInfo.email,
      prenom: personalInfo.prenom,
      telephone: personalInfo.telephone,
      bio: personalInfo.bio,
    });
    if (!update) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la mise à jour des infos.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Informations sauvegardées",
      description: "Vos informations personnelles ont été mises à jour avec succès.",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-3 sm:p-6 transition-colors duration-300">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate("/teacher-dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Paramètres
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="personal" className="text-xs sm:text-sm">
              <User className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Profil</span>
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
                  Informations Personnelles
                </CardTitle>
                <CardDescription className="dark:text-gray-300">
                  Modifiez vos informations personnelles et votre profil
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
                    <PhoneInput
                      country={"sn"}
                      value={personalInfo.telephone}
                      placeholder="+221 77 123 45 67"
                      onChange={(e) => setPersonalInfo({ ...personalInfo, telephone: e.valueOf() })}
                    />
                  </div>
                  {/* WE will put it back when we need it
                   <div>
                    <Label htmlFor="adresse">Adresse</Label>
                    <Input
                      id="adresse"
                      value={personalInfo.adresse}
                      onChange={(e) =>
                        setPersonalInfo({ ...personalInfo, adresse: e.target.value })
                      }
                    />
                  </div> */}
                </div>

                <div>
                  <Label htmlFor="bio">Biographie</Label>
                  <Textarea
                    id="bio"
                    value={personalInfo.bio}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, bio: e.target.value })}
                    placeholder="Décrivez votre expérience et vos spécialités..."
                  />
                </div>

                <Button onClick={handleSavePersonalInfo} className="w-full sm:w-auto">
                  <Save className="w-4 h-4 mr-2" />
                  Sauvegarder les informations
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
                    Gérez la sécurité de votre compte
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
                      type={visible ? "text" : "password"}
                      id="new-password"
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

export default TeacherSettings;
