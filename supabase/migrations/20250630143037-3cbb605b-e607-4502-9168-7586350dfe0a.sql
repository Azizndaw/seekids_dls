
-- Activer RLS sur toutes les tables si ce n'est pas déjà fait
ALTER TABLE public.utilisateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eleves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecoles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professeurs_classes ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Users can view users from same ecole" ON public.utilisateurs;
DROP POLICY IF EXISTS "Admins can insert users in their ecole" ON public.utilisateurs;
DROP POLICY IF EXISTS "Admins can update users in their ecole" ON public.utilisateurs;
DROP POLICY IF EXISTS "Users can view classes from same ecole" ON public.classes;
DROP POLICY IF EXISTS "Admins can insert classes in their ecole" ON public.classes;
DROP POLICY IF EXISTS "Admins can create classes in their ecole" ON public.classes;
DROP POLICY IF EXISTS "Admins can update classes in their ecole" ON public.classes;
DROP POLICY IF EXISTS "Users can view eleves from same ecole" ON public.eleves;
DROP POLICY IF EXISTS "Admins can insert eleves in their ecole" ON public.eleves;
DROP POLICY IF EXISTS "Admins can update eleves in their ecole" ON public.eleves;
DROP POLICY IF EXISTS "Users can view their own ecole" ON public.ecoles;
DROP POLICY IF EXISTS "Users can view professeurs_classes from same ecole" ON public.professeurs_classes;
DROP POLICY IF EXISTS "Admins can manage professeurs_classes in their ecole" ON public.professeurs_classes;

-- Créer une fonction pour obtenir le rôle de l'utilisateur connecté
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text AS $$
  SELECT role FROM public.utilisateurs WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Créer une fonction pour vérifier si l'utilisateur est admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.utilisateurs 
    WHERE id = auth.uid() AND role = 'administration'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- POLITIQUES POUR LA TABLE UTILISATEURS
-- Lecture : tous les utilisateurs peuvent voir les utilisateurs de leur école
CREATE POLICY "Users can view users from same ecole" ON public.utilisateurs
  FOR SELECT USING (ecole_id = public.get_current_user_ecole_id());

-- Insertion : seuls les admins peuvent créer des utilisateurs dans leur école
CREATE POLICY "Admins can insert users in their ecole" ON public.utilisateurs
  FOR INSERT WITH CHECK (
    ecole_id = public.get_current_user_ecole_id() AND
    public.is_admin()
  );

-- Modification : seuls les admins peuvent modifier les utilisateurs de leur école
CREATE POLICY "Admins can update users in their ecole" ON public.utilisateurs
  FOR UPDATE USING (
    ecole_id = public.get_current_user_ecole_id() AND
    public.is_admin()
  );

-- Suppression : seuls les admins peuvent supprimer les utilisateurs de leur école
CREATE POLICY "Admins can delete users in their ecole" ON public.utilisateurs
  FOR DELETE USING (
    ecole_id = public.get_current_user_ecole_id() AND
    public.is_admin()
  );

-- POLITIQUES POUR LA TABLE ELEVES
-- Lecture : tous les utilisateurs peuvent voir les élèves de leur école
CREATE POLICY "Users can view eleves from same ecole" ON public.eleves
  FOR SELECT USING (ecole_id = public.get_current_user_ecole_id());

-- Insertion : seuls les admins peuvent créer des élèves dans leur école
CREATE POLICY "Admins can insert eleves in their ecole" ON public.eleves
  FOR INSERT WITH CHECK (
    ecole_id = public.get_current_user_ecole_id() AND
    public.is_admin()
  );

-- Modification : seuls les admins peuvent modifier les élèves de leur école
CREATE POLICY "Admins can update eleves in their ecole" ON public.eleves
  FOR UPDATE USING (
    ecole_id = public.get_current_user_ecole_id() AND
    public.is_admin()
  );

-- Suppression : seuls les admins peuvent supprimer les élèves de leur école
CREATE POLICY "Admins can delete eleves in their ecole" ON public.eleves
  FOR DELETE USING (
    ecole_id = public.get_current_user_ecole_id() AND
    public.is_admin()
  );

-- POLITIQUES POUR LA TABLE CLASSES
-- Lecture : tous les utilisateurs peuvent voir les classes de leur école
CREATE POLICY "Users can view classes from same ecole" ON public.classes
  FOR SELECT USING (ecole_id = public.get_current_user_ecole_id());

-- Insertion : seuls les admins peuvent créer des classes dans leur école
CREATE POLICY "Admins can insert classes in their ecole" ON public.classes
  FOR INSERT WITH CHECK (
    ecole_id = public.get_current_user_ecole_id() AND
    public.is_admin()
  );

-- Modification : seuls les admins peuvent modifier les classes de leur école
CREATE POLICY "Admins can update classes in their ecole" ON public.classes
  FOR UPDATE USING (
    ecole_id = public.get_current_user_ecole_id() AND
    public.is_admin()
  );

-- Suppression : seuls les admins peuvent supprimer les classes de leur école
CREATE POLICY "Admins can delete classes in their ecole" ON public.classes
  FOR DELETE USING (
    ecole_id = public.get_current_user_ecole_id() AND
    public.is_admin()
  );

-- POLITIQUES POUR LA TABLE ECOLES
-- Lecture : les utilisateurs peuvent voir leur propre école
CREATE POLICY "Users can view their own ecole" ON public.ecoles
  FOR SELECT USING (id = public.get_current_user_ecole_id());

-- Modification : seuls les admins peuvent modifier leur école
CREATE POLICY "Admins can update their ecole" ON public.ecoles
  FOR UPDATE USING (
    id = public.get_current_user_ecole_id() AND
    public.is_admin()
  );

-- POLITIQUES POUR LA TABLE PROFESSEURS_CLASSES
-- Lecture : tous les utilisateurs peuvent voir les assignations de leur école
CREATE POLICY "Users can view professeurs_classes from same ecole" ON public.professeurs_classes
  FOR SELECT USING (ecole_id = public.get_current_user_ecole_id());

-- Gestion complète : seuls les admins peuvent gérer les assignations dans leur école
CREATE POLICY "Admins can manage professeurs_classes in their ecole" ON public.professeurs_classes
  FOR ALL USING (
    ecole_id = public.get_current_user_ecole_id() AND
    public.is_admin()
  );
