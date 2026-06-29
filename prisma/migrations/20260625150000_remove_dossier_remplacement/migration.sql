-- DropForeignKey
ALTER TABLE "dossiers_explicatifs" DROP CONSTRAINT IF EXISTS "dossiers_explicatifs_dossier_remplacement_id_fkey";

-- AlterTable
ALTER TABLE "dossiers_explicatifs" DROP COLUMN IF EXISTS "dossier_remplacement_id";
