-- CreateIndex
CREATE INDEX "dossiers_explicatifs_reference_idx" ON "dossiers_explicatifs"("reference");

-- CreateIndex
CREATE INDEX "dossiers_explicatifs_nom_complet_idx" ON "dossiers_explicatifs"("nom_complet");

-- CreateIndex
CREATE INDEX "professeurs_nom_idx" ON "professeurs"("nom");

-- CreateIndex
CREATE INDEX "professeurs_prenom_idx" ON "professeurs"("prenom");

-- CreateIndex
CREATE INDEX "professeurs_nom_ar_idx" ON "professeurs"("nom_ar");

-- CreateIndex
CREATE INDEX "professeurs_prenom_ar_idx" ON "professeurs"("prenom_ar");

-- CreateIndex
CREATE INDEX "professeurs_cin_idx" ON "professeurs"("cin");
