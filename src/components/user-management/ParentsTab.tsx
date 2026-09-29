import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Student } from "@/hooks/useUsers";
import { Parent } from "@/hooks/useParents";
import AddParentForm from "./AddParentForm";
import EditParentModal from "./EditParentModal";

interface ParentsTabProps {
  parents: Parent[];
  students: Student[];
}

const ParentsTab: React.FC<ParentsTabProps> = ({ parents, students }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredParents = parents.filter(
    (parent) =>
      parent.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      parent.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      parent.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <CardTitle>Gestion des Parents</CardTitle>
          <CardDescription>Créer des accès parents </CardDescription>
        </div>
        <AddParentForm />
      </CardHeader>
      <CardContent>
        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un parent..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom Complet</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Enfants</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParents.map((parent) => {
                const children = students.filter((student) => student.parentId === parent.id);
                return (
                  <TableRow key={parent.id}>
                    <TableCell>
                      {parent.prenom} {parent.nom}
                    </TableCell>
                    <TableCell>{parent.email}</TableCell>
                    <TableCell>{parent.telephone || "Non renseigné"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {children.length > 0 ? (
                          children.map((child) => (
                            <Badge key={child.id} variant="outline" className="text-xs">
                              {child.prenom} {child.nom}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-gray-500 text-sm">Aucun enfant</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <EditParentModal parent={parent} students={students} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ParentsTab;
