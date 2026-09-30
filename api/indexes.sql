-- Index for Note
CREATE INDEX IF NOT EXISTS "Note_schoolId_idx" ON "Note"("schoolId");
CREATE INDEX IF NOT EXISTS "Note_classeId_idx" ON "Note"("classeId");
CREATE INDEX IF NOT EXISTS "Note_studentId_idx" ON "Note"("studentId");
CREATE INDEX IF NOT EXISTS "Note_disciplineId_idx" ON "Note"("disciplineId");

-- Index for Emargement
CREATE INDEX IF NOT EXISTS "Emargement_schoolId_idx" ON "Emargement"("schoolId");
CREATE INDEX IF NOT EXISTS "Emargement_classeId_idx" ON "Emargement"("classeId");
CREATE INDEX IF NOT EXISTS "Emargement_professeurId_idx" ON "Emargement"("professeurId");

-- Index for Cours
CREATE INDEX IF NOT EXISTS "Cours_schoolId_idx" ON "Cours"("schoolId");
CREATE INDEX IF NOT EXISTS "Cours_classeId_idx" ON "Cours"("classeId");
CREATE INDEX IF NOT EXISTS "Cours_professeurId_idx" ON "Cours"("professeurId");

-- Index for Evaluation
CREATE INDEX IF NOT EXISTS "Evaluation_schoolId_idx" ON "Evaluation"("schoolId");
CREATE INDEX IF NOT EXISTS "Evaluation_classeId_idx" ON "Evaluation"("classeId");
CREATE INDEX IF NOT EXISTS "Evaluation_professeurId_idx" ON "Evaluation"("professeurId");

-- Index for Student
CREATE INDEX IF NOT EXISTS "Student_schoolId_idx" ON "Student"("schoolId");
CREATE INDEX IF NOT EXISTS "Student_classeId_idx" ON "Student"("classeId");

-- Index for UserRole
CREATE INDEX IF NOT EXISTS "UserRole_userId_idx" ON "UserRole"("userId");
CREATE INDEX IF NOT EXISTS "UserRole_roleId_idx" ON "UserRole"("roleId");

-- Index for AppUser (for faster lookup of users by school)
CREATE INDEX IF NOT EXISTS "AppUser_schoolId_idx" ON "AppUser"("schoolId");
