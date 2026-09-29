
-- Créer la table parents avec l'authentification Supabase
CREATE TABLE public.parents (
  id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nom text NOT NULL,
  prenom text NOT NULL,
  telephone text,
  email text NOT NULL,
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id),
  created_at timestamp with time zone DEFAULT now()
);

-- Activer RLS sur la table parents
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;

-- Politique pour que les parents voient seulement leurs propres données
CREATE POLICY "Parents can view their own data" 
  ON public.parents 
  FOR SELECT 
  USING (auth.uid() = id);

-- Politique pour que les admins de l'école voient tous les parents de leur école
CREATE POLICY "School admins can view all parents" 
  ON public.parents 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.utilisateurs 
      WHERE id = auth.uid() 
      AND role = 'administration' 
      AND ecole_id = parents.ecole_id
    )
  );

-- Politique pour l'insertion (création de nouveaux parents)
CREATE POLICY "Allow parent creation" 
  ON public.parents 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Politique pour la mise à jour
CREATE POLICY "Parents can update their own data" 
  ON public.parents 
  FOR UPDATE 
  USING (auth.uid() = id);

-- Politique pour la suppression par les admins
CREATE POLICY "School admins can delete parents" 
  ON public.parents 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.utilisateurs 
      WHERE id = auth.uid() 
      AND role = 'administration' 
      AND ecole_id = parents.ecole_id
    )
  );

-- Mettre à jour la table eleves pour référencer la nouvelle table parents
ALTER TABLE public.eleves 
DROP CONSTRAINT IF EXISTS eleves_parent_id_fkey;

ALTER TABLE public.eleves 
ADD CONSTRAINT eleves_parent_id_fkey 
FOREIGN KEY (parent_id) REFERENCES public.parents(id);
