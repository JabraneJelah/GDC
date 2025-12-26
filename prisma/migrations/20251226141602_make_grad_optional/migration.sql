-- AlterTable
ALTER TABLE "professeurs" ADD COLUMN     "grade_id" INTEGER;

-- CreateTable
CREATE TABLE "grades" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,

    CONSTRAINT "grades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "grades_nom_key" ON "grades"("nom");

-- AddForeignKey
ALTER TABLE "professeurs" ADD CONSTRAINT "professeurs_grade_id_fkey" FOREIGN KEY ("grade_id") REFERENCES "grades"("id") ON DELETE SET NULL ON UPDATE CASCADE;
