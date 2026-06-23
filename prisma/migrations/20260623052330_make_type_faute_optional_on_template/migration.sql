-- DropForeignKey
ALTER TABLE "documents_templates" DROP CONSTRAINT "documents_templates_type_faute_id_fkey";

-- AlterTable
ALTER TABLE "documents_templates" ALTER COLUMN "type_faute_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "documents_templates" ADD CONSTRAINT "documents_templates_type_faute_id_fkey" FOREIGN KEY ("type_faute_id") REFERENCES "types_faute"("id") ON DELETE SET NULL ON UPDATE CASCADE;
