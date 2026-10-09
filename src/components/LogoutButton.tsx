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
  const isAdmin = location.pathname.includes("admin");

  const [academicYear, setAcademicYear] = React.useState(localStorage.getItem("academicYear") || "2026-2027");

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = e.target.value;
    localStorage.setItem("academicYear", newYear);
    setAcademicYear(newYear);
    window.location.reload();
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const handleSettings = () => {
    if (location.pathname.includes("teacher")) {
      navigate("/teacher-settings");
    } else if (location.pathname.includes("parent")) {
      navigate("/parent-settings");
    } else if (location.pathname.includes("admin")) {
      navigate("/admin-settings");
    }
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {isAdmin && (
        <select
          value={academicYear}
          onChange={handleYearChange}
          className="hidden sm:block h-10 w-[140px] appearance-none rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          style={{ backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right .5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
        >
          <option value="2025-2026">2025 - 2026</option>
          <option value="2026-2027">2026 - 2027</option>
        </select>
      )}
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
