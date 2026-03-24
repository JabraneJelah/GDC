-- AlterTable
ALTER TABLE "conges" ADD COLUMN "hors_solde" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: PPR optional for imports without PPR column
ALTER TABLE "professeurs" ALTER COLUMN "ppr" DROP NOT NULL;
