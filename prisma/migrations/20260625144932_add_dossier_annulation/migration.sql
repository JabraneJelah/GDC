-- AlterEnum
ALTER TYPE "StatutDossierExplicatif" ADD VALUE 'ANNULE';

-- AlterTable
ALTER TABLE "dossiers_explicatifs" ADD COLUMN     "dossier_remplacement_id" TEXT,
ADD COLUMN     "motif_annulation" TEXT;

-- AddForeignKey
ALTER TABLE "dossiers_explicatifs" ADD CONSTRAINT "dossiers_explicatifs_dossier_remplacement_id_fkey" FOREIGN KEY ("dossier_remplacement_id") REFERENCES "dossiers_explicatifs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
