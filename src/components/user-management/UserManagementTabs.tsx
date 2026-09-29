
import React from 'react';
import { Button } from "@/components/ui/button";
import { GraduationCap, User, Users, Building2 } from "lucide-react";

interface UserManagementTabsProps {
  activeTab: 'students' | 'teachers' | 'parents' | 'classes';
  onTabChange: (tab: 'students' | 'teachers' | 'parents' | 'classes') => void;
  counts: {
    students: number;
    teachers: number;
    parents: number;
    classes: number;
  };
}

const UserManagementTabs: React.FC<UserManagementTabsProps> = ({
  activeTab,
  onTabChange,
  counts
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
      <Button
        variant={activeTab === 'students' ? 'default' : 'ghost'}
        onClick={() => onTabChange('students')}
        className="w-full sm:w-auto text-xs sm:text-sm py-2 px-3 h-auto justify-start sm:justify-center"
      >
        <GraduationCap className="w-4 h-4 mr-1 sm:mr-2" />
        <span>Élèves ({counts.students})</span>
      </Button>
      <Button
        variant={activeTab === 'teachers' ? 'default' : 'ghost'}
        onClick={() => onTabChange('teachers')}
        className="w-full sm:w-auto text-xs sm:text-sm py-2 px-3 h-auto justify-start sm:justify-center"
      >
        <User className="w-4 h-4 mr-1 sm:mr-2" />
        <span>Professeurs ({counts.teachers})</span>
      </Button>
      <Button
        variant={activeTab === 'parents' ? 'default' : 'ghost'}
        onClick={() => onTabChange('parents')}
        className="w-full sm:w-auto text-xs sm:text-sm py-2 px-3 h-auto justify-start sm:justify-center"
      >
        <Users className="w-4 h-4 mr-1 sm:mr-2" />
        <span>Parents ({counts.parents})</span>
      </Button>
      <Button
        variant={activeTab === 'classes' ? 'default' : 'ghost'}
        onClick={() => onTabChange('classes')}
        className="w-full sm:w-auto text-xs sm:text-sm py-2 px-3 h-auto justify-start sm:justify-center"
      >
        <Building2 className="w-4 h-4 mr-1 sm:mr-2" />
        <span>Classes ({counts.classes})</span>
      </Button>
    </div>
  );
};

export default UserManagementTabs;
