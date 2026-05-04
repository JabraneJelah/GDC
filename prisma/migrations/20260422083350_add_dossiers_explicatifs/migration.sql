-- CreateEnum
CREATE TYPE "StatutDossierExplicatif" AS ENUM ('BROUILLON', 'NOTIFIE', 'EN_ATTENTE_REPONSE', 'REPONSE_RECUE', 'EN_EVALUATION', 'CLOTURE');

-- CreateEnum
CREATE TYPE "DecisionReponseExplicative" AS ENUM ('CONVAINCANTE', 'NON_CONVAINCANTE');

-- CreateEnum
CREATE TYPE "OrigineDocumentDossier" AS ENUM ('TELEVERSE', 'GENERE');

-- CreateEnum
CREATE TYPE "FormatTemplateDocument" AS ENUM ('DOCX', 'PDF');

-- CreateTable
CREATE TABLE "types_faute" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "types_faute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents_templates" (
    "id" TEXT NOT NULL,
    "identifiant" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "format_source" "FormatTemplateDocument" NOT NULL,
    "chemin_fichier" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type_faute_id" INTEGER NOT NULL,
    "cree_par_rh_id" TEXT,

    CONSTRAINT "documents_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dossiers_explicatifs" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "nom_complet" TEXT NOT NULL,
    "matricule" TEXT NOT NULL,
    "profil" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "date_faute" TIMESTAMP(3) NOT NULL,
    "details" TEXT,
    "statut" "StatutDossierExplicatif" NOT NULL DEFAULT 'BROUILLON',
    "decision_reponse" "DecisionReponseExplicative",
    "date_notification" TIMESTAMP(3),
    "date_limite_reponse" TIMESTAMP(3),
    "date_reponse_recue" TIMESTAMP(3),
    "en_retard" BOOLEAN NOT NULL DEFAULT false,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type_faute_id" INTEGER NOT NULL,
    "cree_par_rh_id" TEXT NOT NULL,
    "decision_par_rh_id" TEXT,
    "cloture_par_rh_id" TEXT,

    CONSTRAINT "dossiers_explicatifs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dossiers_documents" (
    "id" TEXT NOT NULL,
    "identifiant" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "chemin_fichier" TEXT NOT NULL,
    "origine" "OrigineDocumentDossier" NOT NULL,
    "categorie" TEXT,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dossier_id" TEXT NOT NULL,
    "template_id" TEXT,
    "cree_par_rh_id" TEXT,

    CONSTRAINT "dossiers_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dossiers_historique" (
    "id" TEXT NOT NULL,
    "dossier_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "ancien_statut" "StatutDossierExplicatif",
    "nouveau_statut" "StatutDossierExplicatif",
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectue_par_rh_id" TEXT NOT NULL,

    CONSTRAINT "dossiers_historique_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "types_faute_code_key" ON "types_faute"("code");

-- CreateIndex
CREATE INDEX "types_faute_actif_idx" ON "types_faute"("actif");

-- CreateIndex
CREATE UNIQUE INDEX "documents_templates_identifiant_key" ON "documents_templates"("identifiant");

-- CreateIndex
CREATE INDEX "documents_templates_actif_idx" ON "documents_templates"("actif");

-- CreateIndex
CREATE INDEX "documents_templates_type_faute_id_idx" ON "documents_templates"("type_faute_id");

-- CreateIndex
CREATE UNIQUE INDEX "dossiers_explicatifs_reference_key" ON "dossiers_explicatifs"("reference");

-- CreateIndex
CREATE INDEX "dossiers_explicatifs_statut_idx" ON "dossiers_explicatifs"("statut");

-- CreateIndex
CREATE INDEX "dossiers_explicatifs_matricule_idx" ON "dossiers_explicatifs"("matricule");

-- CreateIndex
CREATE INDEX "dossiers_explicatifs_type_faute_id_idx" ON "dossiers_explicatifs"("type_faute_id");

-- CreateIndex
CREATE UNIQUE INDEX "dossiers_documents_identifiant_key" ON "dossiers_documents"("identifiant");

-- CreateIndex
CREATE INDEX "dossiers_documents_dossier_id_idx" ON "dossiers_documents"("dossier_id");

-- CreateIndex
CREATE INDEX "dossiers_documents_template_id_idx" ON "dossiers_documents"("template_id");

-- CreateIndex
CREATE INDEX "dossiers_documents_origine_idx" ON "dossiers_documents"("origine");

-- CreateIndex
CREATE INDEX "dossiers_historique_dossier_id_idx" ON "dossiers_historique"("dossier_id");

-- CreateIndex
CREATE INDEX "dossiers_historique_cree_le_idx" ON "dossiers_historique"("cree_le");

-- AddForeignKey
ALTER TABLE "documents_templates" ADD CONSTRAINT "documents_templates_type_faute_id_fkey" FOREIGN KEY ("type_faute_id") REFERENCES "types_faute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents_templates" ADD CONSTRAINT "documents_templates_cree_par_rh_id_fkey" FOREIGN KEY ("cree_par_rh_id") REFERENCES "utilisateurs_rh"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossiers_explicatifs" ADD CONSTRAINT "dossiers_explicatifs_type_faute_id_fkey" FOREIGN KEY ("type_faute_id") REFERENCES "types_faute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossiers_explicatifs" ADD CONSTRAINT "dossiers_explicatifs_cree_par_rh_id_fkey" FOREIGN KEY ("cree_par_rh_id") REFERENCES "utilisateurs_rh"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossiers_explicatifs" ADD CONSTRAINT "dossiers_explicatifs_decision_par_rh_id_fkey" FOREIGN KEY ("decision_par_rh_id") REFERENCES "utilisateurs_rh"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossiers_explicatifs" ADD CONSTRAINT "dossiers_explicatifs_cloture_par_rh_id_fkey" FOREIGN KEY ("cloture_par_rh_id") REFERENCES "utilisateurs_rh"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossiers_documents" ADD CONSTRAINT "dossiers_documents_dossier_id_fkey" FOREIGN KEY ("dossier_id") REFERENCES "dossiers_explicatifs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossiers_documents" ADD CONSTRAINT "dossiers_documents_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "documents_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossiers_documents" ADD CONSTRAINT "dossiers_documents_cree_par_rh_id_fkey" FOREIGN KEY ("cree_par_rh_id") REFERENCES "utilisateurs_rh"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossiers_historique" ADD CONSTRAINT "dossiers_historique_dossier_id_fkey" FOREIGN KEY ("dossier_id") REFERENCES "dossiers_explicatifs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossiers_historique" ADD CONSTRAINT "dossiers_historique_effectue_par_rh_id_fkey" FOREIGN KEY ("effectue_par_rh_id") REFERENCES "utilisateurs_rh"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
