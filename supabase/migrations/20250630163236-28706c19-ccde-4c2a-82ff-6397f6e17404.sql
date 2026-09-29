
-- Créer la table plannings
CREATE TABLE public.plannings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  classe TEXT NOT NULL,
  semaine TEXT NOT NULL,
  contenu TEXT NOT NULL,
  ecole_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer Row Level Security
ALTER TABLE public.plannings ENABLE ROW LEVEL SECURITY;

-- Politique pour que les utilisateurs ne voient que les plannings de leur école
CREATE POLICY "Utilisateurs peuvent voir les plannings de leur école" 
  ON public.plannings 
  FOR SELECT 
  USING (ecole_id IN (
    SELECT ecole_id FROM public.utilisateurs WHERE id = auth.uid()
    UNION
    SELECT ecole_id FROM public.parents WHERE id = auth.uid()
  ));

-- Politique pour que les admins et professeurs puissent créer des plannings
CREATE POLICY "Admins et professeurs peuvent créer des plannings" 
  ON public.plannings 
  FOR INSERT 
  WITH CHECK (ecole_id IN (
    SELECT ecole_id FROM public.utilisateurs 
    WHERE id = auth.uid() AND role IN ('administration', 'professeur')
  ));

-- Politique pour que les admins et professeurs puissent modifier des plannings
CREATE POLICY "Admins et professeurs peuvent modifier des plannings" 
  ON public.plannings 
  FOR UPDATE 
  USING (ecole_id IN (
    SELECT ecole_id FROM public.utilisateurs 
    WHERE id = auth.uid() AND role IN ('administration', 'professeur')
  ));

-- Politique pour que les admins peuvent supprimer des plannings
CREATE POLICY "Admins peuvent supprimer des plannings" 
  ON public.plannings 
  FOR DELETE 
  USING (ecole_id IN (
    SELECT ecole_id FROM public.utilisateurs 
    WHERE id = auth.uid() AND role = 'administration'
  ));
