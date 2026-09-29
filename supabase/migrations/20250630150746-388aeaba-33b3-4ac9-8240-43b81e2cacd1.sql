
-- Ajouter le champ est_approuve à la table utilisateurs
ALTER TABLE public.utilisateurs 
ADD COLUMN est_approuve BOOLEAN NOT NULL DEFAULT false;

-- Mettre à jour les utilisateurs existants avec le rôle administration pour qu'ils soient approuvés
UPDATE public.utilisateurs 
SET est_approuve = true 
WHERE role = 'administration';
