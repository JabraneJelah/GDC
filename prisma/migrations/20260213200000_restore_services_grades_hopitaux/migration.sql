-- CreateTable
CREATE TABLE "services" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hopitaux" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hopitaux_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grades" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,

    CONSTRAINT "grades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "services_nom_key" ON "services"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "hopitaux_nom_key" ON "hopitaux"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "grades_nom_key" ON "grades"("nom");

-- AlterTable: make cin optional and add optional FKs to professeurs
ALTER TABLE "professeurs" ALTER COLUMN "cin" DROP NOT NULL;

ALTER TABLE "professeurs" ADD COLUMN "service_id" INTEGER;
ALTER TABLE "professeurs" ADD COLUMN "hopital_id" INTEGER;
ALTER TABLE "professeurs" ADD COLUMN "grade_id" INTEGER;

-- AddForeignKey
ALTER TABLE "professeurs" ADD CONSTRAINT "professeurs_service_id_fkey" 
  FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "professeurs" ADD CONSTRAINT "professeurs_hopital_id_fkey" 
  FOREIGN KEY ("hopital_id") REFERENCES "hopitaux"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "professeurs" ADD CONSTRAINT "professeurs_grade_id_fkey" 
  FOREIGN KEY ("grade_id") REFERENCES "grades"("id") ON DELETE SET NULL ON UPDATE CASCADE;
