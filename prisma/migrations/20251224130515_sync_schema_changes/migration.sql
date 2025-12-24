-- AlterTable: Remove cin column and index, add nom_interim and prenom_interim
ALTER TABLE "professeurs" DROP COLUMN IF EXISTS "cin";
DROP INDEX IF EXISTS "professeurs_cin_idx";
ALTER TABLE "professeurs" ADD COLUMN IF NOT EXISTS "nom_interim" TEXT;
ALTER TABLE "professeurs" ADD COLUMN IF NOT EXISTS "prenom_interim" TEXT;

-- AlterTable: Remove default from jours_total in soldes_conge
ALTER TABLE "soldes_conge" ALTER COLUMN "jours_total" DROP DEFAULT;

-- AlterTable: Add username to utilisateurs_rh
ALTER TABLE "utilisateurs_rh" ADD COLUMN IF NOT EXISTS "username" TEXT;
CREATE INDEX IF NOT EXISTS "utilisateurs_rh_username_idx" ON "utilisateurs_rh"("username");
CREATE UNIQUE INDEX IF NOT EXISTS "utilisateurs_rh_username_key" ON "utilisateurs_rh"("username");
ALTER TABLE "utilisateurs_rh" ALTER COLUMN "email" DROP NOT NULL;

