/*
  Warnings:

  - You are about to drop the column `specialite` on the `professeurs` table. All the data in the column will be lost.
  - Added the required column `categorie_personnel_id` to the `professeurs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `specialite_id` to the `professeurs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `titre_id` to the `professeurs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "professeurs" DROP COLUMN "specialite",
ADD COLUMN     "categorie_personnel_id" INTEGER NOT NULL,
ADD COLUMN     "specialite_id" INTEGER NOT NULL,
ADD COLUMN     "titre_id" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "categories_personnel" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,

    CONSTRAINT "categories_personnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specialites" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,

    CONSTRAINT "specialites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "titres" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,

    CONSTRAINT "titres_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_personnel_nom_key" ON "categories_personnel"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "specialites_nom_key" ON "specialites"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "titres_nom_key" ON "titres"("nom");

-- AddForeignKey
ALTER TABLE "professeurs" ADD CONSTRAINT "professeurs_specialite_id_fkey" FOREIGN KEY ("specialite_id") REFERENCES "specialites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professeurs" ADD CONSTRAINT "professeurs_categorie_personnel_id_fkey" FOREIGN KEY ("categorie_personnel_id") REFERENCES "categories_personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professeurs" ADD CONSTRAINT "professeurs_titre_id_fkey" FOREIGN KEY ("titre_id") REFERENCES "titres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
