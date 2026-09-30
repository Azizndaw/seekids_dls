-- Optimisations pour la table Note
CREATE INDEX IF NOT EXISTS "Note_school_date_idx" ON "Note"("schoolId", "date" DESC);
CREATE INDEX IF NOT EXISTS "Note_school_classe_date_idx" ON "Note"("schoolId", "classeId", "date" DESC);
CREATE INDEX IF NOT EXISTS "Note_student_date_idx" ON "Note"("studentId", "date" DESC);
CREATE INDEX IF NOT EXISTS "Note_school_classe_disc_idx" ON "Note"("schoolId", "classeId", "disciplineId");

-- Optimisations pour la table Cours
CREATE INDEX IF NOT EXISTS "Cours_school_jour_heure_idx" ON "Cours"("schoolId", "jour", "heureDebut");
CREATE INDEX IF NOT EXISTS "Cours_school_classe_jour_idx" ON "Cours"("schoolId", "classeId", "jour", "heureDebut");
CREATE INDEX IF NOT EXISTS "Cours_school_prof_jour_idx" ON "Cours"("schoolId", "professeurId", "jour", "heureDebut");

-- Optimisations pour la table Emargement
CREATE INDEX IF NOT EXISTS "Emargement_school_debut_idx" ON "Emargement"("schoolId", "debut" DESC);
CREATE INDEX IF NOT EXISTS "Emargement_school_prof_debut_idx" ON "Emargement"("schoolId", "professeurId", "debut" DESC);
CREATE INDEX IF NOT EXISTS "Emargement_school_classe_debut_idx" ON "Emargement"("schoolId", "classeId", "debut" DESC);

-- Optimisations pour la table Evaluation
CREATE INDEX IF NOT EXISTS "Evaluation_school_date_idx" ON "Evaluation"("schoolId", "date" DESC);
CREATE INDEX IF NOT EXISTS "Evaluation_school_classe_date_idx" ON "Evaluation"("schoolId", "classeId", "date" DESC);
CREATE INDEX IF NOT EXISTS "Evaluation_prof_date_idx" ON "Evaluation"("professeurId", "date" DESC);

-- Optimisations pour la table Message
CREATE INDEX IF NOT EXISTS "Message_school_sender_date_idx" ON "Message"("schoolId", "senderId", "sentAt" DESC);
CREATE INDEX IF NOT EXISTS "Message_school_receiver_date_idx" ON "Message"("schoolId", "receiverId", "sentAt" DESC);

-- Optimisations pour StudentAttendance
CREATE INDEX IF NOT EXISTS "StudentAttendance_student_date_idx" ON "StudentAttendance"("studentId", "date" DESC);

-- Optimisations pour AppUser (Professeurs & Parents liés à l'école)
CREATE INDEX IF NOT EXISTS "AppUser_schoolId_email_idx" ON "AppUser"("schoolId", "email");
