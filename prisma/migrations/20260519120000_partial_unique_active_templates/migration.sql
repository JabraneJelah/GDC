-- Replace the unconditional unique index on identifiant with a partial unique
-- index that only enforces uniqueness among active (actif = true) templates.
-- This allows inactive templates to share identifiant/usage values so that
-- new active templates can reuse those values after a soft-delete.

DROP INDEX IF EXISTS "documents_templates_identifiant_key";

CREATE UNIQUE INDEX "documents_templates_active_identifiant_key"
ON "documents_templates" ("identifiant")
WHERE "actif" = true;
