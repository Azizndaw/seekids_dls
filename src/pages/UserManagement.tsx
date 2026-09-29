import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LogoutButton from "@/components/LogoutButton";
import ClassManagement from "@/components/ClassManagement";
import UserManagementTabs from "@/components/user-management/UserManagementTabs";
import StudentsTab from "@/components/user-management/StudentsTab";
import TeachersTab from "@/components/user-management/TeachersTab";
import ParentsTab from "@/components/user-management/ParentsTab";
import { useUsers, useClasses } from "@/hooks/useUsers";
import { useParents } from "@/hooks/useParents";

const UserManagement = () => {
  const navigate = useNavigate();

  // Requêtes pour récupérer les données
  const { data: users = [], isLoading: usersLoading } = useUsers();
  const { data: classes = [], isLoading: classesLoading } = useClasses();
  const { data: parents = [], isLoading: parentsLoading } = useParents();

  // État pour l'onglet actif
  const [activeTab, setActiveTab] = useState<"students" | "teachers" | "parents" | "classes">(
    "students"
  );

  // Filtrer les utilisateurs par rôle (garder seulement les professeurs pour l'ancien système)
  //const teachers = users.filter((user) => user.role === "professeur");
  const teachers = users;

  if (usersLoading || classesLoading || parentsLoading) {
    // ICI
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }
  const students = classes.flatMap((cls) => cls.students);

  return (
    <div className="min-h-screen bg-background dark:bg-background p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate("/admin-dashboard")}
              className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Gestion des Utilisateurs
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Gérer les élèves, professeurs, parents et classes
              </p>
            </div>
          </div>
          <LogoutButton className="w-full sm:w-auto" />
        </div>

        {/* Onglets */}
        <UserManagementTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          counts={{
            students: students.length,
            teachers: teachers.length,
            parents: parents.length,
            classes: classes.length,
          }}
        />

        {/* Contenu des onglets */}
        {activeTab === "students" && (
          <StudentsTab students={students} classe={classes} parents={parents} />
        )}

        {activeTab === "teachers" && <TeachersTab teachers={teachers} classes={classes} />}

        {activeTab === "parents" && <ParentsTab parents={parents} students={students} />}

        {activeTab === "classes" && <ClassManagement users={teachers} classes={classes} />}
      </div>
    </div>
  );
};

export default UserManagement;
