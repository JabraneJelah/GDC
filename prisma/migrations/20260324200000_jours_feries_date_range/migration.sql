-- Jours fériés : plage date_debut / date_fin (remplace la colonne unique `date`)

ALTER TABLE "jours_feries" ADD COLUMN "date_debut" TIMESTAMP(3);
ALTER TABLE "jours_feries" ADD COLUMN "date_fin" TIMESTAMP(3);

UPDATE "jours_feries" SET "date_debut" = "date", "date_fin" = "date";

ALTER TABLE "jours_feries" ALTER COLUMN "date_debut" SET NOT NULL;
ALTER TABLE "jours_feries" ALTER COLUMN "date_fin" SET NOT NULL;

DROP INDEX IF EXISTS "jours_feries_date_key";
DROP INDEX IF EXISTS "jours_feries_date_idx";

ALTER TABLE "jours_feries" DROP COLUMN "date";

CREATE INDEX "jours_feries_date_debut_idx" ON "jours_feries"("date_debut");
CREATE INDEX "jours_feries_date_fin_idx" ON "jours_feries"("date_fin");
