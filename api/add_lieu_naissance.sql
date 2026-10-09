ALTER TABLE Student ADD COLUMN lieu_naissance TEXT DEFAULT 'Dakar';
UPDATE Student SET lieu_naissance = 'Dakar' WHERE lieu_naissance IS NULL OR lieu_naissance = '';
