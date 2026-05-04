-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StatutDossierExplicatif" ADD VALUE 'REPONSE_CONVAINCANTE';
ALTER TYPE "StatutDossierExplicatif" ADD VALUE 'REPONSE_NON_CONVAINCANTE';

-- AlterTable
ALTER TABLE "dossiers_explicatifs" ADD COLUMN     "professeur_id" TEXT;

-- CreateIndex
CREATE INDEX "dossiers_explicatifs_professeur_id_idx" ON "dossiers_explicatifs"("professeur_id");

-- AddForeignKey
ALTER TABLE "dossiers_explicatifs" ADD CONSTRAINT "dossiers_explicatifs_professeur_id_fkey" FOREIGN KEY ("professeur_id") REFERENCES "professeurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
