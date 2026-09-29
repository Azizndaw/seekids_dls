
-- Créer la table classes si elle n'existe pas déjà
CREATE TABLE IF NOT EXISTS public.classes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom text NOT NULL,
  niveau text NOT NULL,
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now()
);

-- Créer la table eleves si elle n'existe pas déjà
CREATE TABLE IF NOT EXISTS public.eleves (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom text NOT NULL,
  prenom text NOT NULL,
  matricule text UNIQUE NOT NULL,
  date_naissance date,
  classe_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  parent_id uuid REFERENCES public.utilisateurs(id) ON DELETE SET NULL,
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  photo text,
  created_at timestamp with time zone DEFAULT now()
);

-- Activer RLS sur toutes les tables
ALTER TABLE public.utilisateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecoles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eleves ENABLE ROW LEVEL SECURITY;

-- Créer une fonction pour obtenir l'école de l'utilisateur connecté
CREATE OR REPLACE FUNCTION public.get_current_user_ecole_id()
RETURNS uuid AS $$
  SELECT ecole_id FROM public.utilisateurs WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Politiques RLS pour utilisateurs (seuls les utilisateurs de la même école peuvent se voir)
CREATE POLICY "Users can view users from same ecole" ON public.utilisateurs
  FOR SELECT USING (ecole_id = public.get_current_user_ecole_id());

CREATE POLICY "Admins can insert users in their ecole" ON public.utilisateurs
  FOR INSERT WITH CHECK (
    ecole_id = public.get_current_user_ecole_id() AND
    EXISTS (SELECT 1 FROM public.utilisateurs WHERE id = auth.uid() AND role = 'administration')
  );

CREATE POLICY "Admins can update users in their ecole" ON public.utilisateurs
  FOR UPDATE USING (
    ecole_id = public.get_current_user_ecole_id() AND
    EXISTS (SELECT 1 FROM public.utilisateurs WHERE id = auth.uid() AND role = 'administration')
  );

-- Politiques RLS pour classes
CREATE POLICY "Users can view classes from same ecole" ON public.classes
  FOR SELECT USING (ecole_id = public.get_current_user_ecole_id());

CREATE POLICY "Admins can insert classes in their ecole" ON public.classes
  FOR INSERT WITH CHECK (
    ecole_id = public.get_current_user_ecole_id() AND
    EXISTS (SELECT 1 FROM public.utilisateurs WHERE id = auth.uid() AND role = 'administration')
  );

-- Politiques RLS pour eleves
CREATE POLICY "Users can view eleves from same ecole" ON public.eleves
  FOR SELECT USING (ecole_id = public.get_current_user_ecole_id());

CREATE POLICY "Admins can insert eleves in their ecole" ON public.eleves
  FOR INSERT WITH CHECK (
    ecole_id = public.get_current_user_ecole_id() AND
    EXISTS (SELECT 1 FROM public.utilisateurs WHERE id = auth.uid() AND role = 'administration')
  );

CREATE POLICY "Admins can update eleves in their ecole" ON public.eleves
  FOR UPDATE USING (
    ecole_id = public.get_current_user_ecole_id() AND
    EXISTS (SELECT 1 FROM public.utilisateurs WHERE id = auth.uid() AND role = 'administration')
  );

-- Politiques RLS pour ecoles (utilisateurs peuvent voir leur propre école)
CREATE POLICY "Users can view their own ecole" ON public.ecoles
  FOR SELECT USING (id = public.get_current_user_ecole_id());
