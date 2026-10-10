import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Users,
  Settings,
  Bell,
  Calendar,
  MessageCircle,
  User,
  Lock,
  X,
  ArrowLeft,
  Phone,
  Mail,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/hooks/use-toast";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

type UserType = "parent" | "teacher" | "admin" | null;

const Index = () => {
  const { loginAdmin, loading } = useAdminAuth();
  const [selectedBubble, setSelectedBubble] = useState<UserType>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loginType, setLoginType] = useState<"email" | "phone">("phone");
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { toast } = useToast();

  React.useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const storedUser = localStorage.getItem("utilisateur_connecte");
    if (storedUser && token) {
      try {
        const user = JSON.parse(storedUser);
        const roles = Array.isArray(user.role) ? user.role : [user.role];
        if (roles.includes("ADMIN") || roles.includes("administration")) {
          navigate("/admin-dashboard", { replace: true });
        } else if (roles.includes("TEACHER") || roles.includes("professeur")) {
          navigate("/teacher-dashboard", { replace: true });
        } else if (roles.includes("PARENT") || roles.includes("parent")) {
          navigate("/parent-dashboard", { replace: true });
        }
      } catch (e) {
        console.error("Erreur lors de la lecture de la session:", e);
      }
    } else if (!token && storedUser) {
      localStorage.removeItem("utilisateur_connecte");
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    let route = "";
    let role: string = "";

    if (selectedBubble === "parent") {
      route = "/parent-dashboard";
      role = "PARENT";
    } else if (selectedBubble === "teacher") {
      route = "/teacher-dashboard";
      role = "TEACHER";
    } else if (selectedBubble === "admin") {
      route = "/admin-dashboard";
      role = "ADMIN";
    }

    const identifier = loginType === "email" ? email : phone;
    const result = await loginAdmin(identifier, password, role); // ICI

    if (!result.success) {
      toast({
        title: "Connexion échouée",
        description: "Identifiants invalides.",
        variant: "destructive",
      });
      return;
    }
    navigate(route);
  };
  const [visible, setVisible] = useState(false);

  const bubbleConfig = {
    parent: {
      icon: Users,
      title: "Parents",
      description: "Suivez la scolarité de votre enfant",
      color: "bg-parent",
      shadowColor: "shadow-parent/30",
      textColor: "text-parent",
    },
    teacher: {
      icon: BookOpen,
      title: "Professeurs",
      description: "Gérez vos classes et évaluations",
      color: "bg-teacher",
      shadowColor: "shadow-teacher/30",
      textColor: "text-teacher",
    },
    admin: {
      icon: Settings,
      title: "Administration",
      description: "Supervisez l'établissement",
      color: "bg-admin",
      shadowColor: "shadow-admin/30",
      textColor: "text-admin",
    },
  };

  const handleBubbleClick = (type: UserType) => {
    setSelectedBubble(type);
    if (type === "parent" || type === "teacher") {
      setLoginType("phone");
    } else {
      setLoginType("email");
    }
  };

  const closeBubble = () => {
    setSelectedBubble(null);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gray-300/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-slate-300/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}></div>
        <div
          className="absolute top-1/2 left-1/3 w-64 h-64 bg-gray-400/10 rounded-full blur-2xl animate-pulse"
          style={{ animationDelay: "4s" }}></div>

        {/* Floating particles */}
        <div className="absolute top-20 left-20 w-2 h-2 bg-gray-400/30 rounded-full animate-ping"></div>
        <div
          className="absolute top-40 right-32 w-1 h-1 bg-slate-400/40 rounded-full animate-ping"
          style={{ animationDelay: "1s" }}></div>
        <div
          className="absolute bottom-32 left-1/4 w-1.5 h-1.5 bg-gray-500/30 rounded-full animate-ping"
          style={{ animationDelay: "3s" }}></div>
      </div>

      {/* Header */}
      <header className="relative z-10 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center mr-3">
                <User className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold text-foreground">Seekids</span>
            </div>
            <Badge className="bg-muted text-muted-foreground border-border">
              Plateforme Scolaire
            </Badge>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-8 relative z-10">
        <div className="w-full max-w-7xl">
          <div className="text-center mb-16">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 text-foreground">
              Bienvenue
            </h1>
            <p className="text-xl sm:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Connectez-vous à votre espace personnalisé
            </p>

            {!selectedBubble && (
              <p className="text-lg text-muted-foreground animate-pulse">
                Choisissez votre profil pour commencer
              </p>
            )}
          </div>

          {!selectedBubble ? (
            <div>
              {/* Mobile bubbles */}
              <div className="flex justify-center gap-6 sm:gap-8 md:hidden mb-12">
                {(Object.keys(bubbleConfig) as Array<keyof typeof bubbleConfig>).map(
                  (type, index) => {
                    const config = bubbleConfig[type];
                    const IconComponent = config.icon;

                    return (
                      <div
                        key={type}
                        onClick={() => handleBubbleClick(type)}
                        className={`
                        relative cursor-pointer transform transition-all duration-300 hover:scale-110
                        ${config.shadowColor} shadow-md hover:shadow-lg
                        animate-fade-in
                      `}
                        style={{ animationDelay: `${index * 200}ms` }}>
                        <div
                          className={`
                        w-24 h-24 rounded-full 
                        ${config.color} 
                        flex flex-col items-center justify-center
                        text-white relative overflow-hidden
                        transition-all duration-300
                        before:absolute before:inset-0 before:rounded-full 
                        before:bg-white/20 before:opacity-0 before:transition-opacity 
                        before:duration-300 hover:before:opacity-100
                      `}>
                          <IconComponent className="w-7 h-7 drop-shadow-lg" />

                          {/* Effet de brillance */}
                          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/30 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 transform -skew-x-12"></div>
                        </div>

                        {/* Label en dessous */}
                        <p className="text-center text-sm text-muted-foreground mt-3 font-medium">
                          {config.title}
                        </p>
                      </div>
                    );
                  }
                )}
              </div>

              {/* Desktop cards */}
              <div className="hidden md:grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
                {(Object.keys(bubbleConfig) as Array<keyof typeof bubbleConfig>).map(
                  (type, index) => {
                    const config = bubbleConfig[type];
                    const IconComponent = config.icon;

                    return (
                      <div
                        key={type}
                        onClick={() => handleBubbleClick(type)}
                        className="group cursor-pointer transform transition-all duration-500 hover:scale-105 animate-fade-in"
                        style={{ animationDelay: `${index * 200}ms` }}>
                        <div className="relative">
                          {/* Glow effect */}
                          <div className="absolute -inset-1 bg-gradient-to-r from-gray-400 to-slate-500 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-500"></div>

                          {/* Main card */}
                          <div className="relative backdrop-blur-xl bg-card/80 border border-border/50 rounded-2xl p-8 text-center hover:bg-card/90 transition-all duration-500">
                            {/* Icon container */}
                            <div
                              className={`w-20 h-20 mx-auto mb-6 rounded-full ${config.color} flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300`}>
                              <IconComponent className="w-10 h-10 text-white drop-shadow-lg" />
                            </div>

                            {/* Content */}
                            <h3 className="text-2xl font-bold text-card-foreground mb-3 group-hover:text-foreground transition-colors">
                              {config.title}
                            </h3>
                            <p className="text-muted-foreground mb-6 group-hover:text-foreground transition-colors">
                              {config.description}
                            </p>

                            {/* CTA */}
                            <div className="inline-flex items-center text-muted-foreground group-hover:text-foreground transition-colors">
                              <span className="text-sm font-medium mr-2">Se connecter</span>
                              <ArrowLeft className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform" />
                            </div>

                            {/* Floating dots */}
                            <div className="absolute top-4 right-4 w-2 h-2 bg-muted-foreground/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div
                              className="absolute bottom-4 left-4 w-1 h-1 bg-muted-foreground/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ transitionDelay: "100ms" }}></div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          ) : (
            /* Formulaire de connexion */
            <div className="max-w-md mx-auto animate-scale-in">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-400/20 to-slate-500/20 rounded-3xl blur-3xl"></div>

              <div className="relative backdrop-blur-2xl bg-card/90 border border-border/50 rounded-3xl shadow-2xl overflow-hidden">
                {/* Header with close */}
                <div className="relative p-6 border-b border-border/30">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={closeBubble}
                    className="absolute right-4 top-4 p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors">
                    <X className="h-5 w-5" />
                  </Button>

                  <div className="text-center">
                    <div
                      className={`w-16 h-16 mx-auto mb-4 rounded-2xl ${bubbleConfig[selectedBubble].color} flex items-center justify-center shadow-xl`}>
                      {React.createElement(bubbleConfig[selectedBubble].icon, {
                        className: "h-8 w-8 text-white",
                      })}
                    </div>
                    <h2 className="text-2xl font-bold text-card-foreground mb-2">
                      Connexion {bubbleConfig[selectedBubble].title}
                    </h2>
                    <p className="text-muted-foreground">
                      {bubbleConfig[selectedBubble].description}
                    </p>
                  </div>
                </div>

                {/* Form */}
                <div className="p-6">
                  <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-6">
                      {/* Méthode de connexion */}
                      <div>
                        {selectedBubble !== "parent" && (
                          <Label className="text-card-foreground text-sm font-medium mb-3 block">
                            Choisissez votre méthode de connexion
                          </Label>
                        )}
                        {selectedBubble !== "parent" && (
                          <div className="relative bg-muted/30 p-1 rounded-2xl border border-border/50">
                            <div className="flex">
                              <button
                                type="button"
                                onClick={() => setLoginType("email")}
                                className={`
                                    flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium
                                    transition-all duration-300 relative z-10
                                    ${loginType === "email"
                                    ? "bg-background text-foreground shadow-lg"
                                    : "text-muted-foreground hover:text-foreground"
                                  }
                                  `}>
                                <Mail className="w-4 h-4" />
                                <span className="hidden sm:inline">Email</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setLoginType("phone")}
                                className={`
                                    flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium
                                    transition-all duration-300 relative z-10
                                    ${loginType === "phone"
                                    ? "bg-background text-foreground shadow-lg"
                                    : "text-muted-foreground hover:text-foreground"
                                  }
                                  `}>
                                <Phone className="w-4 h-4" />
                                <span className="hidden sm:inline">Téléphone</span>
                              </button>
                            </div>
                          </div>
                        )}
                        <div className="text-center mt-2">
                          <p className="text-xs text-muted-foreground">
                            {loginType === "phone"
                              ? "📱 Connectez-vous avec votre numéro de téléphone"
                              : "✉️ Connectez-vous avec votre adresse email"}
                          </p>
                        </div>
                      </div>
                      <div>
                        {loginType === "email" && (
                          <Label
                            htmlFor="identifier"
                            className="text-card-foreground text-sm font-medium mb-2 block">
                            {loginType === "email" ? "Email" : "Téléphone"}
                          </Label>
                        )}

                        {loginType === "email" && (
                          <Input
                            name="email"
                            autoComplete="username webauthn"
                            id="email"
                            type="email"
                            placeholder="exemple@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="bg-background/80 border-border text-foreground placeholder:text-muted-foreground focus:bg-background focus:border-ring transition-all duration-300 rounded-xl h-12"
                          />
                        )}

                        {loginType === "phone" && (
                          <div>
                            <Label className="text-card-foreground text-sm font-medium mb-2 block">
                              Numéro de téléphone
                            </Label>
                            <PhoneInput
                              country={"sn"}
                              value={phone}
                              placeholder="+221 77 123 45 67"
                              onChange={(e) => setPhone(e.valueOf())}
                              inputProps={{
                                name: "phone",
                                required: true,
                                autoComplete: "tel",
                                id: "phone"
                              }}
                              inputClass="!w-full !h-12 !rounded-xl !bg-background/80 !border-border !text-foreground !placeholder:text-muted-foreground"
                              containerClass="!w-full"
                              inputStyle={{
                                width: "100%",
                                height: "3rem",
                                borderRadius: "0.75rem",
                              }}
                            />
                          </div>
                        )}
                      </div>

                      <Label
                        htmlFor="password"
                        className="text-card-foreground text-sm font-medium mb-2 block">
                        Mot de passe
                      </Label>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <Input
                          id="password"
                          type={visible ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="bg-background/80 border-border text-foreground placeholder:text-muted-foreground focus:bg-background focus:border-ring transition-all duration-300 rounded-xl h-12"
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

                    {error && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3">
                        <p className="text-sm text-destructive text-center">{error}</p>
                      </div>
                    )}

                    <Button
                      type="submit"
                      className={`w-full h-12 ${bubbleConfig[selectedBubble].color} hover:scale-[1.02] text-white font-semibold transition-all duration-300 shadow-xl rounded-xl border-0`}>
                      <Lock className="h-5 w-5 mr-2" />
                      Se connecter
                    </Button>
                  </form>

                  <div className="mt-6 text-center">
                    <Button
                      variant="link"
                      className="text-muted-foreground hover:text-foreground transition-colors p-0 h-auto">
                      Mot de passe oublié ?
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Features grid */}
          {!selectedBubble && (
            <div
              className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-3xl mx-auto animate-fade-in"
              style={{ animationDelay: "800ms" }}>
              {[
                { icon: Bell, title: "Notifications", desc: "Temps réel", color: "bg-parent" },
                { icon: Calendar, title: "Planning", desc: "Intégré", color: "bg-teacher" },
                { icon: MessageCircle, title: "Messages", desc: "Instantanés", color: "bg-admin" },
                { icon: BookOpen, title: "Suivi", desc: "Pédagogique", color: "bg-primary" },
              ].map((feature, index) => (
                <div
                  key={feature.title}
                  className="backdrop-blur-xl bg-card/60 border border-border/50 rounded-xl p-3 md:p-4 text-center hover:bg-card/80 transition-all duration-300 hover:scale-105"
                  style={{ animationDelay: `${1000 + index * 100}ms` }}>
                  <div
                    className={`w-8 h-8 md:w-10 md:h-10 mx-auto mb-2 md:mb-3 ${feature.color} rounded-lg flex items-center justify-center shadow-lg`}>
                    <feature.icon className="h-4 w-4 md:h-5 md:w-5 text-white" />
                  </div>
                  <h4 className="text-card-foreground font-semibold text-xs md:text-sm mb-1">
                    {feature.title}
                  </h4>
                  <p className="text-muted-foreground text-xs">{feature.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
