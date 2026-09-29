
-- Créer la table de relation professeurs_classes si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.professeurs_classes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professeur_id uuid NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  classe_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(professeur_id, classe_id)
);

-- Activer RLS sur la table professeurs_classes
ALTER TABLE public.professeurs_classes ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour professeurs_classes
CREATE POLICY "Users can view professeurs_classes from same ecole" ON public.professeurs_classes
  FOR SELECT USING (ecole_id = public.get_current_user_ecole_id());

CREATE POLICY "Admins can manage professeurs_classes in their ecole" ON public.professeurs_classes
  FOR ALL USING (
    ecole_id = public.get_current_user_ecole_id() AND
    EXISTS (SELECT 1 FROM public.utilisateurs WHERE id = auth.uid() AND role = 'administration')
  );

-- Ajouter une politique pour permettre la création de classes
CREATE POLICY "Admins can create classes in their ecole" ON public.classes
  FOR INSERT WITH CHECK (
    ecole_id = public.get_current_user_ecole_id() AND
    EXISTS (SELECT 1 FROM public.utilisateurs WHERE id = auth.uid() AND role = 'administration')
  );

CREATE POLICY "Admins can update classes in their ecole" ON public.classes
  FOR UPDATE USING (
    ecole_id = public.get_current_user_ecole_id() AND
    EXISTS (SELECT 1 FROM public.utilisateurs WHERE id = auth.uid() AND role = 'administration')
  );
