UPDATE AppUser 
SET password = '$2b$10$brT93TCLa/WD.m.sJAPF.uyneurQoDHeA/uBUCR0ZhhjbOOI3G7Iy' 
WHERE id IN (
  SELECT userId FROM UserRole 
  INNER JOIN Role ON UserRole.roleId = Role.id 
  WHERE Role.name = 'PARENT'
);
