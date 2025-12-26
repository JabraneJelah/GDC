/*
  Warnings:

  - Added the required column `Hopital_id` to the `professeurs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "professeurs" ADD COLUMN     "Hopital_id" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "professeurs" ADD CONSTRAINT "professeurs_Hopital_id_fkey" FOREIGN KEY ("Hopital_id") REFERENCES "hopitaux"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
