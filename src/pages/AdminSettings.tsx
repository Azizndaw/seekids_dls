import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Settings, School, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useToast } from "@/hooks/use-toast";
import { useUpdatePassword } from "@/hooks/useUsers";

const AdminSettings = () => {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { useUpdateSchool, useGetSchool } = useSchoolData();
  const { toast } = useToast();
  const { data: school } = useGetSchool();
  const updatePasswordMutation = useUpdatePassword();

  // ---- Mot de passe -----------
  const [visible, setVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleUpdatePassword = async () => {
    // Basic validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Erreur",
        description: `Veuillez remplir tous les champs.`,
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Erreur",
        description: `Les 2 mots de passe ne correspondent pas.`,
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Erreur",
        description: `Le mot de passe doit faire au moins 8 caractères.`,
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await updatePasswordMutation.mutateAsync({
        oldPassword: currentPassword,
        newPassword,
      });

      if (!response) {
        toast({
          title: "Erreur",
          description: `Erreur du changement de mot de passe. Veuillez réessayer ultérieurement.`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Action réussie",
        description: "Mot de passe mis à jour.",
      });
      // Optional: Reset the form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast({
        title: "Erreur",
        description: `Erreur du changement de mot de passe. Veuillez réessayer ultérieurement.`,
        variant: "destructive",
      });
      console.log("Erreur lors du changement de mot de passe : ", error.message);
    }
  };

  const updateSchoolMutation = useUpdateSchool();

  const [schoolSettings, setSchoolSettings] = useState({
    name: "",
    address: "",
    email: "",
    website: "",
    phone: "",
  });

  const [systemSettings, setSystemSettings] = useState({
    timezone: "Africa/Dakar",
    dateFormat: "DD/MM/YYYY",
    autoBackup: true,
  });

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage as "fr" | "en" | "ar");
  };
  useEffect(() => {
    if (school) {
      setSchoolSettings({
        name: school.name || "",
        address: school.adresse || "",
        email: school.email || "",
        website: school.siteWeb || "",
        phone: school.telephone || "",
      });
    }
  }, [school]);

  const handleSaveChange = async () => {
    try {
      // Example: API call to save settings
      const success = await updateSchoolMutation.mutateAsync({
        name: schoolSettings.name,
        adresse: schoolSettings.address,
        email: schoolSettings.email,
        siteWeb: schoolSettings.website,
        telephone: schoolSettings.phone,
      });
      if (!success) {
        toast({
          title: "Erreur",
          description: `Erreur lors de la mise à jour de l'école : ${schoolSettings.name}.`,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Action réussie",
        description: "Informations de l'école mises à jour",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Erreur",
        description: `Erreur lors de la mise à jour de l'école : ${schoolSettings.name}.`,
        variant: "destructive",
      });
    }
  };
  if (!school) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate("/admin-dashboard")}
            className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            {t("back")}
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Settings className="w-8 h-8 text-blue-600" />
              {t("settings")}
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">{t("general.config")}</p>
          </div>
        </div>

        {/* Informations École */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School className="w-5 h-5" />
              {t("school.info")}
            </CardTitle>
            <CardDescription>{t("school.info.desc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="font-medium mb-2 block">{t("school.name")}</label>
              <Input
                value={schoolSettings.name}
                onChange={(e) => setSchoolSettings({ ...schoolSettings, name: e.target.value })}
              />
            </div>

            <div>
              <label className="font-medium mb-2 block">{t("school.address")}</label>
              <Textarea
                value={schoolSettings.address}
                onChange={(e) => setSchoolSettings({ ...schoolSettings, address: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-medium mb-2 block">{t("school.phone")}</label>
                <PhoneInput
                  containerClass={"w-full"}
                  country={"sn"}
                  value={schoolSettings.phone}
                  placeholder="+221 77 123 45 67"
                  onChange={(e) => setSchoolSettings({ ...schoolSettings, phone: e.valueOf() })}
                />
              </div>
              <div>
                <label className="font-medium mb-2 block">{t("school.email")}</label>
                <Input
                  type="email"
                  value={schoolSettings.email}
                  onChange={(e) => setSchoolSettings({ ...schoolSettings, email: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="font-medium mb-2 block">{t("school.website")}</label>
              <Input
                value={schoolSettings.website}
                onChange={(e) => setSchoolSettings({ ...schoolSettings, website: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Paramètres système */}
        <Card>
          <CardHeader>
            <CardTitle>{t("system.settings")}</CardTitle>
            <CardDescription>{t("system.settings.desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="font-medium mb-2 block">{t("system.language")}</label>
                <Select value={language} onValueChange={handleLanguageChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar">العربية</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="font-medium mb-2 block">{t("system.timezone")}</label>
                <Select
                  value={systemSettings.timezone}
                  onValueChange={(value) =>
                    setSystemSettings({ ...systemSettings, timezone: value })
                  }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Africa/Dakar">Dakar (GMT+0)</SelectItem>
                    <SelectItem value="Africa/Casablanca">Casablanca (GMT+1)</SelectItem>
                    <SelectItem value="Europe/Paris">Paris (GMT+1)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="font-medium mb-2 block">{t("system.dateformat")}</label>
                <Select
                  value={systemSettings.dateFormat}
                  onValueChange={(value) =>
                    setSystemSettings({ ...systemSettings, dateFormat: value })
                  }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={systemSettings.autoBackup}
                  onCheckedChange={(checked) =>
                    setSystemSettings({ ...systemSettings, autoBackup: checked })
                  }
                />
                <span className="font-medium">{t("system.autobackup")}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section de gestion des mots de passe */}
        <Card>
          <CardHeader>
            <CardTitle>{t("password.management")}</CardTitle>
            <CardDescription>{t("password.management.desc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="font-medium mb-2 block">{t("current.password")}</label>
            <div style={{ display: "flex", alignItems: "center" }}>
              <Input
                type={visible ? "text" : "password"}
                placeholder={t("enter.current.password")}
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

            <label className="font-medium mb-2 block">{t("new.password")}</label>
            <div style={{ display: "flex", alignItems: "center" }}>
              <Input
                type={visible ? "text" : "password"}
                placeholder={t("enter.new.password")}
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

            <label className="font-medium mb-2 block">{t("confirm.password")}</label>
            <div style={{ display: "flex", alignItems: "center" }}>
              <Input
                type={visible ? "text" : "password"}
                placeholder={t("confirm.new.password")}
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

            <Button onClick={handleUpdatePassword}>{t("update.password")}</Button>
          </CardContent>
        </Card>

        {/* Bouton de sauvegarde */}
        <div className="flex justify-end">
          <Button onClick={handleSaveChange} size="lg">
            {t("save.changes")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
