-- Add performance indexes for Professeurs table
CREATE INDEX IF NOT EXISTS "professeurs_nom_idx" ON "professeurs"("nom");
CREATE INDEX IF NOT EXISTS "professeurs_prenom_idx" ON "professeurs"("prenom");
CREATE INDEX IF NOT EXISTS "professeurs_cin_idx" ON "professeurs"("cin");
CREATE INDEX IF NOT EXISTS "professeurs_nom_prenom_idx" ON "professeurs"("nom", "prenom");

-- Add performance indexes for Conges table
CREATE INDEX IF NOT EXISTS "conges_professeur_id_idx" ON "conges"("professeur_id");
CREATE INDEX IF NOT EXISTS "conges_date_debut_idx" ON "conges"("date_debut");
CREATE INDEX IF NOT EXISTS "conges_date_fin_idx" ON "conges"("date_fin");
CREATE INDEX IF NOT EXISTS "conges_type_conge_id_idx" ON "conges"("type_conge_id");
CREATE INDEX IF NOT EXISTS "conges_date_debut_date_fin_idx" ON "conges"("date_debut", "date_fin");

-- Add performance indexes for SoldesConge table
CREATE INDEX IF NOT EXISTS "soldes_conge_professeur_id_annee_idx" ON "soldes_conge"("professeur_id", "annee");
CREATE INDEX IF NOT EXISTS "soldes_conge_annee_idx" ON "soldes_conge"("annee");
CREATE INDEX IF NOT EXISTS "soldes_conge_expire_le_idx" ON "soldes_conge"("expire_le");

-- Add performance indexes for UtilisateurRH table
CREATE INDEX IF NOT EXISTS "utilisateurs_rh_actif_idx" ON "utilisateurs_rh"("actif");
CREATE INDEX IF NOT EXISTS "utilisateurs_rh_email_actif_idx" ON "utilisateurs_rh"("email", "actif");

