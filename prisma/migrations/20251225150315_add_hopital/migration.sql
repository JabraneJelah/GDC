-- CreateTable
CREATE TABLE "hopitaux" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hopitaux_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hopitaux_nom_key" ON "hopitaux"("nom");
