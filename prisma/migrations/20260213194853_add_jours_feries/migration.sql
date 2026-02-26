/*
  Warnings:

  - You are about to drop the column `nom_interim` on the `conges` table. All the data in the column will be lost.
  - You are about to drop the column `prenom_interim` on the `conges` table. All the data in the column will be lost.
  - You are about to drop the column `Hopital_id` on the `professeurs` table. All the data in the column will be lost.
  - You are about to drop the column `grade_id` on the `professeurs` table. All the data in the column will be lost.
  - You are about to drop the column `service_id` on the `professeurs` table. All the data in the column will be lost.
  - You are about to drop the column `type_conge_id` on the `soldes_conge` table. All the data in the column will be lost.
  - You are about to drop the `grades` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `hopitaux` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `services` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[professeur_id,annee]` on the table `soldes_conge` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `cin` to the `professeurs` table without a default value. This is not possible if the table is not empty.
  - Made the column `categorie_personnel_id` on table `professeurs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `specialite_id` on table `professeurs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `titre_id` on table `professeurs` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "professeurs" DROP CONSTRAINT "professeurs_Hopital_id_fkey";

-- DropForeignKey
ALTER TABLE "professeurs" DROP CONSTRAINT "professeurs_categorie_personnel_id_fkey";

-- DropForeignKey
ALTER TABLE "professeurs" DROP CONSTRAINT "professeurs_grade_id_fkey";

-- DropForeignKey
ALTER TABLE "professeurs" DROP CONSTRAINT "professeurs_service_id_fkey";

-- DropForeignKey
ALTER TABLE "professeurs" DROP CONSTRAINT "professeurs_specialite_id_fkey";

-- DropForeignKey
ALTER TABLE "professeurs" DROP CONSTRAINT "professeurs_titre_id_fkey";

-- DropForeignKey
ALTER TABLE "soldes_conge" DROP CONSTRAINT "soldes_conge_type_conge_id_fkey";

-- DropIndex
DROP INDEX "conges_date_debut_date_fin_idx";

-- DropIndex
DROP INDEX "conges_date_debut_idx";

-- DropIndex
DROP INDEX "conges_date_fin_idx";

-- DropIndex
DROP INDEX "conges_professeur_id_idx";

-- DropIndex
DROP INDEX "conges_type_conge_id_idx";

-- DropIndex
DROP INDEX "professeurs_nom_idx";

-- DropIndex
DROP INDEX "professeurs_nom_prenom_idx";

-- DropIndex
DROP INDEX "professeurs_prenom_idx";

-- DropIndex
DROP INDEX "soldes_conge_annee_idx";

-- DropIndex
DROP INDEX "soldes_conge_expire_le_idx";

-- DropIndex
DROP INDEX "soldes_conge_professeur_id_annee_idx";

-- DropIndex
DROP INDEX "soldes_conge_professeur_id_annee_type_conge_id_key";

-- DropIndex
DROP INDEX "soldes_conge_type_conge_id_idx";

-- AlterTable
ALTER TABLE "conges" DROP COLUMN "nom_interim",
DROP COLUMN "prenom_interim";

-- AlterTable
ALTER TABLE "professeurs" DROP COLUMN "Hopital_id",
DROP COLUMN "grade_id",
DROP COLUMN "service_id",
ADD COLUMN     "cin" TEXT NOT NULL,
ALTER COLUMN "categorie_personnel_id" SET NOT NULL,
ALTER COLUMN "specialite_id" SET NOT NULL,
ALTER COLUMN "titre_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "soldes_conge" DROP COLUMN "type_conge_id",
ALTER COLUMN "jours_total" SET DEFAULT 22;

-- DropTable
DROP TABLE "grades";

-- DropTable
DROP TABLE "hopitaux";

-- DropTable
DROP TABLE "services";

-- CreateTable
CREATE TABLE "jours_feries" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "nom" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "jours_feries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "jours_feries_date_key" ON "jours_feries"("date");

-- CreateIndex
CREATE INDEX "jours_feries_date_idx" ON "jours_feries"("date");

-- CreateIndex
CREATE INDEX "jours_feries_actif_idx" ON "jours_feries"("actif");

-- CreateIndex
CREATE UNIQUE INDEX "soldes_conge_professeur_id_annee_key" ON "soldes_conge"("professeur_id", "annee");

-- AddForeignKey
ALTER TABLE "professeurs" ADD CONSTRAINT "professeurs_specialite_id_fkey" FOREIGN KEY ("specialite_id") REFERENCES "specialites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professeurs" ADD CONSTRAINT "professeurs_categorie_personnel_id_fkey" FOREIGN KEY ("categorie_personnel_id") REFERENCES "categories_personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professeurs" ADD CONSTRAINT "professeurs_titre_id_fkey" FOREIGN KEY ("titre_id") REFERENCES "titres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
