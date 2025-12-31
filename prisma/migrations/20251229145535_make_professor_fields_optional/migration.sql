-- DropForeignKey
ALTER TABLE "professeurs" DROP CONSTRAINT "professeurs_Hopital_id_fkey";

-- DropForeignKey
ALTER TABLE "professeurs" DROP CONSTRAINT "professeurs_categorie_personnel_id_fkey";

-- DropForeignKey
ALTER TABLE "professeurs" DROP CONSTRAINT "professeurs_service_id_fkey";

-- DropForeignKey
ALTER TABLE "professeurs" DROP CONSTRAINT "professeurs_specialite_id_fkey";

-- DropForeignKey
ALTER TABLE "professeurs" DROP CONSTRAINT "professeurs_titre_id_fkey";

-- AlterTable
ALTER TABLE "professeurs" ALTER COLUMN "categorie_personnel_id" DROP NOT NULL,
ALTER COLUMN "specialite_id" DROP NOT NULL,
ALTER COLUMN "titre_id" DROP NOT NULL,
ALTER COLUMN "service_id" DROP NOT NULL,
ALTER COLUMN "Hopital_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "professeurs" ADD CONSTRAINT "professeurs_categorie_personnel_id_fkey" FOREIGN KEY ("categorie_personnel_id") REFERENCES "categories_personnel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professeurs" ADD CONSTRAINT "professeurs_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professeurs" ADD CONSTRAINT "professeurs_specialite_id_fkey" FOREIGN KEY ("specialite_id") REFERENCES "specialites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professeurs" ADD CONSTRAINT "professeurs_titre_id_fkey" FOREIGN KEY ("titre_id") REFERENCES "titres"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professeurs" ADD CONSTRAINT "professeurs_Hopital_id_fkey" FOREIGN KEY ("Hopital_id") REFERENCES "hopitaux"("id") ON DELETE SET NULL ON UPDATE CASCADE;
