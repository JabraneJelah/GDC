-- CreateEnum
CREATE TYPE "TypeProcedureExplicative" AS ENUM ('AVERTISSEMENT', 'RETENUE');

-- AlterEnum
ALTER TYPE "StatutDossierExplicatif" ADD VALUE 'PROCEDURE_SUIVANTE_GENEREE';

-- AlterTable
ALTER TABLE "dossiers_explicatifs"
ADD COLUMN "type_procedure_selectionne" "TypeProcedureExplicative",
ADD COLUMN "template_procedure_id" TEXT;

-- CreateIndex
CREATE INDEX "dossiers_explicatifs_template_procedure_id_idx" ON "dossiers_explicatifs"("template_procedure_id");

-- AddForeignKey
ALTER TABLE "dossiers_explicatifs" ADD CONSTRAINT "dossiers_explicatifs_template_procedure_id_fkey" FOREIGN KEY ("template_procedure_id") REFERENCES "documents_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
