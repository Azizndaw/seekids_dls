import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User } from "lucide-react";

interface Child {
  id: string;
  prenom: string;
  nom: string;
  classe: { nom: string; niveau: string };
  photo: string;
  average: number;
  absences: number;
  delays: number;
}

interface ChildSelectorProps {
  children: Child[];
  selectedChild: Child;
  onSelectChild: (child: Child) => void;
}

const ChildSelector = ({ children, selectedChild, onSelectChild }: ChildSelectorProps) => {
  return (
    <div className="flex items-center space-x-3 mb-4">
      <User className="h-5 w-5 text-gray-600" />
      <Select
        value={selectedChild.id}
        onValueChange={(childId) => {
          const child = children.find((c) => c.id === childId);
          if (child) onSelectChild(child);
        }}>
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Sélectionner un enfant" />
        </SelectTrigger>
        <SelectContent>
          {children.map((child) => (
            <SelectItem key={child.id} value={child.id}>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">
                  {child.prenom}
                </div>
                <span>
                  {child.prenom} {child.nom}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ChildSelector;
