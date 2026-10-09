-- SeeKids D1 Database Schema
-- Auto-generated from prod_db

CREATE TABLE "AppUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "password" TEXT NOT NULL,
    "schoolId" TEXT,
    "nom" TEXT,
    "prenom" TEXT,
    "telephone" TEXT,
    "profession" TEXT,
    "biographie" TEXT,
    "adresse" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppUser_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Classe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "niveau" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "schoolId" TEXT,
    CONSTRAINT "Classe_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ClasseProfesseur" (
    "classeId" TEXT NOT NULL,
    "professeurId" TEXT NOT NULL,

    PRIMARY KEY ("classeId", "professeurId"),
    CONSTRAINT "ClasseProfesseur_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "Classe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClasseProfesseur_professeurId_fkey" FOREIGN KEY ("professeurId") REFERENCES "AppUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Cours" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disciplineId" TEXT NOT NULL,
    "jour" TEXT NOT NULL,
    "heure" TEXT NOT NULL,
    "professeurId" TEXT NOT NULL,
    "classeId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    CONSTRAINT "Cours_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "Discipline" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Cours_professeurId_fkey" FOREIGN KEY ("professeurId") REFERENCES "AppUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Cours_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "Classe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Cours_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Discipline" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

CREATE TABLE "Emargement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "classeId" TEXT NOT NULL,
    "disciplineId" TEXT NOT NULL,
    "professeurId" TEXT NOT NULL,
    "debut" DATETIME NOT NULL,
    "fin" DATETIME NOT NULL,
    "seanceCounter" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "additionalInfo" TEXT,
    "schoolId" TEXT NOT NULL,
    CONSTRAINT "Emargement_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "Classe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Emargement_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "Discipline" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Emargement_professeurId_fkey" FOREIGN KEY ("professeurId") REFERENCES "AppUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Emargement_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'EVALUATION',
    "professeurId" TEXT NOT NULL,
    "disciplineId" TEXT NOT NULL,
    "classeId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    CONSTRAINT "Evaluation_professeurId_fkey" FOREIGN KEY ("professeurId") REFERENCES "AppUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Evaluation_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "Discipline" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Evaluation_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "Classe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Evaluation_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT NOT NULL,
    "schoolId" TEXT,
    CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "AppUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Message_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "AppUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Message_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Note" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "classeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "devoir" BOOLEAN NOT NULL,
    "note" REAL NOT NULL,
    "date" DATETIME NOT NULL,
    "appreciation" TEXT,
    "coefficient" REAL NOT NULL,
    "disciplineId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "professeurId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL, "semester" TEXT,
    CONSTRAINT "Note_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "Classe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Note_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "Discipline" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Note_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Note_professeurId_fkey" FOREIGN KEY ("professeurId") REFERENCES "AppUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Note_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "receiverType" TEXT NOT NULL,
    "opened" BOOLEAN NOT NULL DEFAULT false,
    "type" TEXT NOT NULL,
    "time" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "urgent" BOOLEAN NOT NULL,
    "content" TEXT NOT NULL,
    "schoolId" TEXT,
    CONSTRAINT "Notification_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "AppUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "AppUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

CREATE TABLE "School" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
, "adresse" TEXT, "email" TEXT, "siteWeb" TEXT, "telephone" TEXT, "schoolreportGenerated" INTEGER DEFAULT 0, "studentReportGenerated" INTEGER DEFAULT 0);

CREATE TABLE "Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "dateOfBirth" DATETIME NOT NULL,
    "schoolId" TEXT,
    "parentId" TEXT,
    "classeId" TEXT NOT NULL,
    CONSTRAINT "Student_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Student_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "AppUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Student_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "Classe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "StudentAttendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "disciplineId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" DATETIME NOT NULL, "reason" TEXT,
    CONSTRAINT "StudentAttendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentAttendance_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "Discipline" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "UserRole" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    PRIMARY KEY ("userId", "roleId"),
    CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Visits" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roles" TEXT NOT NULL,
    "visitTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visitorType" TEXT NOT NULL,
    "userId" TEXT,
    "schoolId" TEXT NOT NULL,
    CONSTRAINT "Visits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Visits_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "_TeacherDisciplines" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_TeacherDisciplines_A_fkey" FOREIGN KEY ("A") REFERENCES "AppUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_TeacherDisciplines_B_fkey" FOREIGN KEY ("B") REFERENCES "Discipline" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);


-- Indexes
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");
CREATE UNIQUE INDEX "School_name_key" ON "School"("name");
CREATE UNIQUE INDEX "Discipline_name_key" ON "Discipline"("name");
CREATE UNIQUE INDEX "_TeacherDisciplines_AB_unique" ON "_TeacherDisciplines"("A", "B");
CREATE INDEX "_TeacherDisciplines_B_index" ON "_TeacherDisciplines"("B");
CREATE UNIQUE INDEX "AppUser_schoolId_email_key" ON "AppUser"("schoolId", "email");
CREATE UNIQUE INDEX "AppUser_schoolId_telephone_key" ON "AppUser"("schoolId", "telephone");
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");
CREATE INDEX "Message_receiverId_idx" ON "Message"("receiverId");
CREATE INDEX "Message_schoolId_idx" ON "Message"("schoolId");
