-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StatutDossierExplicatif" ADD VALUE 'A_ARCHIVER';
ALTER TYPE "StatutDossierExplicatif" ADD VALUE 'ARCHIVE';

-- AlterTable
ALTER TABLE "dossiers_explicatifs" ADD COLUMN     "archive_par_rh_id" TEXT,
ADD COLUMN     "date_archivage" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "dossiers_explicatifs" ADD CONSTRAINT "dossiers_explicatifs_archive_par_rh_id_fkey" FOREIGN KEY ("archive_par_rh_id") REFERENCES "utilisateurs_rh"("id") ON DELETE SET NULL ON UPDATE CASCADE;
