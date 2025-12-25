/*
  Warnings:

  - You are about to drop the column `nom_interim` on the `professeurs` table. All the data in the column will be lost.
  - You are about to drop the column `prenom_interim` on the `professeurs` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[professeur_id,annee,type_conge_id]` on the table `soldes_conge` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `type_conge_id` to the `soldes_conge` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "soldes_conge_professeur_id_annee_key";

-- AlterTable
ALTER TABLE "conges" ADD COLUMN     "nom_interim" TEXT,
ADD COLUMN     "prenom_interim" TEXT;

-- AlterTable
ALTER TABLE "professeurs" DROP COLUMN "nom_interim",
DROP COLUMN "prenom_interim";

-- AlterTable
ALTER TABLE "soldes_conge" ADD COLUMN     "type_conge_id" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "soldes_conge_type_conge_id_idx" ON "soldes_conge"("type_conge_id");

-- CreateIndex
CREATE UNIQUE INDEX "soldes_conge_professeur_id_annee_type_conge_id_key" ON "soldes_conge"("professeur_id", "annee", "type_conge_id");

-- AddForeignKey
ALTER TABLE "soldes_conge" ADD CONSTRAINT "soldes_conge_type_conge_id_fkey" FOREIGN KEY ("type_conge_id") REFERENCES "types_conge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
