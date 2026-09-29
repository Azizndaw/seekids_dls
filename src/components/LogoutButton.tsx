import React from "react";
import { Button } from "@/components/ui/button";
import { LogOut, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface LogoutButtonProps {
  className?: string;
}

const LogoutButton: React.FC<LogoutButtonProps> = ({ className }) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const handleSettings = () => {
    // Déterminer la page de paramètres selon le rôle ou la page actuelle
    if (location.pathname.includes("teacher")) {
      navigate("/teacher-settings");
    } else if (location.pathname.includes("parent")) {
      navigate("/parent-settings");
    } else if (location.pathname.includes("admin")) {
      navigate("/admin-settings");
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button variant="outline" onClick={handleSettings} className="flex items-center gap-2">
        <Settings className="w-4 h-4" />
        <span className="hidden sm:inline">Paramètres</span>
      </Button>
      <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
        <LogOut className="w-4 h-4" />
        <span className="hidden sm:inline">Déconnexion</span>
      </Button>
    </div>
  );
};

export default LogoutButton;
