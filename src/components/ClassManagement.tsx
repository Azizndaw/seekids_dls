import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Trash2, Save, Loader2, Edit, AlertTriangle } from "lucide-react";
import {
  useClasses,
  useUsers,
  useCreateClass,
  useAssignTeacherToClass,
  useRemoveTeacherFromClass,
  useDeleteClass,
  useUpdateClass,
  User,
} from "@/hooks/useUsers";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";

interface ClasseTabProps {
  users: User[];
  classes: Array<{
    id: string;
    nom: string;
    niveau: string;
    schoolId: string;
    created_at?: string;
    professeurs?: Array<{
      professeurId: string;
    }>;
  }>;
}

const ClassManagement: React.FC<ClasseTabProps> = ({ classes, users }) => {
  const { authUser } = useAuth();

  const createClassMutation = useCreateClass();
  const assignTeacherMutation = useAssignTeacherToClass();
  const removeTeacherMutation = useRemoveTeacherFromClass();
  const updateClassMutation = useUpdateClass(authUser);
  const deleteClassMutation = useDeleteClass(authUser);

  const [isAddingClass, setIsAddingClass] = useState(false);
  const [isAssigningTeacher, setIsAssigningTeacher] = useState(false);
  const [isEditingClass, setIsEditingClass] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [editingClass, setEditingClass] = useState<{
    id: string;
    nom: string;
    niveau: string;
  } | null>(null);

  const [classForm, setClassForm] = useState({
    nom: "",
    niveau: "",
  });
  const [assignmentForm, setAssignmentForm] = useState({
    professeur_id: "",
    classe_id: "",
  });

  // Filtrer les professeurs
  const teachers = users;

  const handleAddClass = async () => {
    if (classForm.nom && classForm.niveau) {
      await createClassMutation.mutateAsync({
        nom: classForm.nom,
        niveau: classForm.niveau,
        schoolId: "",
      });
      setClassForm({ nom: "", niveau: "" });
      setIsAddingClass(false);
    }
  };

  const handleAssignTeacher = async () => {
    if (assignmentForm.professeur_id && assignmentForm.classe_id) {
      await assignTeacherMutation.mutateAsync({
        professeur_id: assignmentForm.professeur_id,
        classe_id: assignmentForm.classe_id,
      });
      setAssignmentForm({ professeur_id: "", classe_id: "" });
      setIsAssigningTeacher(false);
    }
  };

  const handleRemoveTeacher = async (professeur_id: string, classe_id: string) => {
    await removeTeacherMutation.mutateAsync({ professeur_id, classe_id });
  };

  const handleEditClass = (classe: any) => {
    setEditingClass({ id: classe.id, nom: classe.nom, niveau: classe.niveau });
    setIsEditingClass(true);
  };

  const handleUpdateClass = async () => {
    if (editingClass && (editingClass.nom || editingClass.niveau)) {
      await updateClassMutation.mutateAsync({
        classe_id: editingClass.id,
        nom: editingClass.nom,
        niveau: editingClass.niveau,
      });
      setEditingClass(null);
      setIsEditingClass(false);
    }
  };

  const handleDeleteClass = async (id: string) => {
    await deleteClassMutation.mutateAsync(id);
  };

  if (!classes || !users) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gestion des Classes */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Gestion des Classes</CardTitle>
            <CardDescription>Créer et gérer les classes de l'école</CardDescription>
          </div>
          <div className="flex gap-2">
            <Dialog open={isAddingClass} onOpenChange={setIsAddingClass}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter une classe
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Créer une nouvelle classe</DialogTitle>
                  <DialogDescription>Remplissez les informations de la classe</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="class-nom">Nom de la classe</Label>
                    <Input
                      id="class-nom"
                      placeholder="ex: A, B, C..."
                      value={classForm.nom}
                      onChange={(e) => setClassForm({ ...classForm, nom: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="class-niveau">Niveau</Label>
                    <Input
                      id="class-niveau"
                      placeholder="ex: CP, CE1, 6ème..."
                      value={classForm.niveau}
                      onChange={(e) => setClassForm({ ...classForm, niveau: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddingClass(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleAddClass} disabled={createClassMutation.isPending}>
                    {createClassMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Créer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isAssigningTeacher} onOpenChange={setIsAssigningTeacher}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Users className="w-4 h-4 mr-2" />
                  Assigner professeur
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Assigner un professeur à une classe</DialogTitle>
                  <DialogDescription>Sélectionnez le professeur et la classe</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="teacher-select">Professeur</Label>
                    <Select
                      value={assignmentForm.professeur_id}
                      onValueChange={(value) =>
                        setAssignmentForm({ ...assignmentForm, professeur_id: value })
                      }>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un professeur" />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.prenom} {teacher.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="class-select">Classe</Label>
                    <Select
                      value={assignmentForm.classe_id}
                      onValueChange={(value) =>
                        setAssignmentForm({ ...assignmentForm, classe_id: value })
                      }>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une classe" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((classe) => (
                          <SelectItem key={classe.id} value={classe.id}>
                            {classe.niveau} - {classe.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAssigningTeacher(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleAssignTeacher} disabled={assignTeacherMutation.isPending}>
                    {assignTeacherMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Users className="w-4 h-4 mr-2" />
                    )}
                    Assigner
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Dialog de modification de classe */}
            <Dialog open={isEditingClass} onOpenChange={setIsEditingClass}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Modifier la classe</DialogTitle>
                  <DialogDescription>Modifiez les informations de la classe</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-class-nom">Nom de la classe</Label>
                    <Input
                      id="edit-class-nom"
                      placeholder="ex: A, B, C..."
                      value={editingClass?.nom || ""}
                      onChange={(e) =>
                        setEditingClass((prev) => (prev ? { ...prev, nom: e.target.value } : null))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-class-niveau">Niveau</Label>
                    <Input
                      id="edit-class-niveau"
                      placeholder="ex: CP, CE1, 6ème..."
                      value={editingClass?.niveau || ""}
                      onChange={(e) =>
                        setEditingClass((prev) =>
                          prev ? { ...prev, niveau: e.target.value } : null
                        )
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditingClass(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleUpdateClass} disabled={updateClassMutation.isPending}>
                    {updateClassMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Valider
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Classe</TableHead>
                  <TableHead>Niveau</TableHead>
                  <TableHead>Professeurs assignés</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((classe) => (
                  <TableRow key={classe.id}>
                    <TableCell className="font-medium">{classe.nom}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{classe.niveau}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {classe.professeurs && classe.professeurs.length > 0 ? (
                          classe.professeurs.map((assignment) => (
                            <div key={assignment.professeurId} className="flex items-center gap-1">
                              <Badge variant="outline" className="text-xs">
                                {assignment.professeur.prenom} {assignment.professeur.nom}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0"
                                onClick={() =>
                                  handleRemoveTeacher(assignment.professeurId, classe.id)
                                }
                                disabled={removeTeacherMutation.isPending}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))
                        ) : (
                          <span className="text-gray-500 text-sm">Aucun professeur assigné</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditClass(classe)}>
                          <Edit className="w-4 h-4 mr-1" />
                          Modifier
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="w-4 h-4 mr-1" />
                              Supprimer
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action ne peut pas être annulée. Cela supprimera
                                définitivement la classe "{classe.niveau} - {classe.nom}".
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteClass(classe.id)}
                                disabled={deleteClassMutation.isPending}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                {deleteClassMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4 mr-2" />
                                )}
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClassManagement;
