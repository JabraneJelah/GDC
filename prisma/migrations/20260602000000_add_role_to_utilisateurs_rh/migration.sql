-- AddColumn: role to utilisateurs_rh with safe default
ALTER TABLE "utilisateurs_rh" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'UTILISATEUR_RH';
