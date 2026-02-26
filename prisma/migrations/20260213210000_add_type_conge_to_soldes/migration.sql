-- Add type_conge_id to soldes_conge so we can have one solde per (professeur, annee, type) e.g. Annuel 22j + Exceptionnel 10j

-- Step 1: Add column as nullable
ALTER TABLE "soldes_conge" ADD COLUMN "type_conge_id" INTEGER;

-- Step 2: Set existing rows to first type de congé (e.g. Annuel)
UPDATE "soldes_conge"
SET "type_conge_id" = (SELECT "id" FROM "types_conge" ORDER BY "id" LIMIT 1)
WHERE "type_conge_id" IS NULL;

-- Step 3: Make column NOT NULL
ALTER TABLE "soldes_conge" ALTER COLUMN "type_conge_id" SET NOT NULL;

-- Step 4: Drop old unique constraint (professeur_id, annee only)
DROP INDEX IF EXISTS "soldes_conge_professeur_id_annee_key";

-- Step 5: Create new unique constraint (professeur_id, annee, type_conge_id)
CREATE UNIQUE INDEX "soldes_conge_professeur_id_annee_type_conge_id_key" ON "soldes_conge"("professeur_id", "annee", "type_conge_id");

-- Step 6: Index for type_conge_id lookups
CREATE INDEX "soldes_conge_type_conge_id_idx" ON "soldes_conge"("type_conge_id");

-- Step 7: Foreign key to types_conge
ALTER TABLE "soldes_conge" ADD CONSTRAINT "soldes_conge_type_conge_id_fkey" FOREIGN KEY ("type_conge_id") REFERENCES "types_conge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
