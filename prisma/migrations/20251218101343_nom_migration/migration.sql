-- CreateTable
CREATE TABLE "utilisateurs_rh" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mot_de_passe" TEXT NOT NULL,
    "nom_complet" TEXT NOT NULL,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "utilisateurs_rh_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professeurs" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "ppr" TEXT NOT NULL,
    "cin" TEXT NOT NULL,
    "specialite" TEXT NOT NULL,
    "telephone" TEXT,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "professeurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "types_conge" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "document_obligatoire" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "types_conge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "soldes_conge" (
    "id" TEXT NOT NULL,
    "professeur_id" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "jours_total" INTEGER NOT NULL DEFAULT 22,
    "jours_restants" INTEGER NOT NULL,
    "expire_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "soldes_conge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conges" (
    "id" TEXT NOT NULL,
    "professeur_id" TEXT NOT NULL,
    "type_conge_id" INTEGER NOT NULL,
    "date_debut" TIMESTAMP(3) NOT NULL,
    "date_fin" TIMESTAMP(3) NOT NULL,
    "duree_jours" INTEGER NOT NULL,
    "reference_doc" TEXT,
    "cree_par_rh_id" TEXT NOT NULL,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_rh_email_key" ON "utilisateurs_rh"("email");

-- CreateIndex
CREATE UNIQUE INDEX "professeurs_ppr_key" ON "professeurs"("ppr");

-- CreateIndex
CREATE UNIQUE INDEX "soldes_conge_professeur_id_annee_key" ON "soldes_conge"("professeur_id", "annee");

-- AddForeignKey
ALTER TABLE "soldes_conge" ADD CONSTRAINT "soldes_conge_professeur_id_fkey" FOREIGN KEY ("professeur_id") REFERENCES "professeurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conges" ADD CONSTRAINT "conges_professeur_id_fkey" FOREIGN KEY ("professeur_id") REFERENCES "professeurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conges" ADD CONSTRAINT "conges_type_conge_id_fkey" FOREIGN KEY ("type_conge_id") REFERENCES "types_conge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conges" ADD CONSTRAINT "conges_cree_par_rh_id_fkey" FOREIGN KEY ("cree_par_rh_id") REFERENCES "utilisateurs_rh"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
