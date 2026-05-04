-- CreateEnum
CREATE TYPE "TemplateUsage" AS ENUM ('LETTRE_EXPLICATIVE', 'BORDEREAU_NOTIFICATION', 'AVERTISSEMENT', 'RETENUE');

-- AlterTable
ALTER TABLE "documents_templates" ADD COLUMN     "usage" "TemplateUsage";
