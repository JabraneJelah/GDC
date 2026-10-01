# Database architecture

Verified against `prisma/schema.prisma`, all 40 migration directories, `prisma/seed.js`, Prisma configuration, and database-using route handlers, re-verified at commit `3ba4298` on 2026-09-30 — the schema and migration set are unchanged since the 2026-09-15 verification (no migration was added by the `3ba4298` release).

The repository was audited without querying or changing a live database. A deployed database can differ because migrations may be partially applied and the repository contains raw-DDL API endpoints. For production decisions, compare this documentation and the repository with `_prisma_migrations` and the actual database catalog.

## Current schema

Prisma uses PostgreSQL and `prisma-client-js`. Prisma 7 obtains `DATABASE_URL` from `prisma.config.js`; the datasource block in `schema.prisma` declares only `provider = "postgresql"`.

### Enums

| Enum | Values |
|---|---|
| `StatutDossierExplicatif` | `ENREGISTRE`, `DOCUMENTS_INITIAUX_GENERES`, `BROUILLON`, `NOTIFIE`, `EN_ATTENTE_REPONSE`, `REPONSE_RECUE`, `REPONSE_CONVAINCANTE`, `REPONSE_NON_CONVAINCANTE`, `PROCEDURE_SUIVANTE_GENEREE`, `EN_EVALUATION`, `CLOTURE`, `A_ARCHIVER`, `ARCHIVE`, `ANNULE` |
| `DecisionReponseExplicative` | `CONVAINCANTE`, `NON_CONVAINCANTE` |
| `TypeProcedureExplicative` | `AVERTISSEMENT`, `RETENUE` |
| `OrigineDocumentDossier` | `TELEVERSE`, `GENERE` |
| `FormatTemplateDocument` | `DOCX`, `PDF` |
| `TemplateUsage` | `LETTRE_EXPLICATIVE`, `BORDEREAU_NOTIFICATION`, `AVERTISSEMENT`, `RETENUE`, `PROCEDURE_DISCIPLINAIRE` |

`BROUILLON`, `EN_ATTENTE_REPONSE`, `EN_EVALUATION`, and `CLOTURE` remain valid historical enum values even though current routes do not normally create them.

### `UtilisateurRH` → `utilisateurs_rh`

| Field | Type | Null? | Default/constraint |
|---|---|---:|---|
| `id` | String | no | UUID primary key |
| `email` | String | yes | unique |
| `username` | String | yes | unique |
| `mot_de_passe` | String | no | bcrypt hash by current creation paths; login upgrades accepted legacy plaintext |
| `nom_complet` | String | no | — |
| `role` | String | no | `UTILISATEUR_RH` |
| `actif` | Boolean | no | `true` |
| `cree_le` | DateTime | no | `now()` |

Reverse relations cover created leave, templates, dossiers, dossier decisions, closures, archives, documents, and history actions. The role is a free-form string at database level; allowed values are enforced only by selected application routes.

### `TypeFaute` → `types_faute`

| Field | Type | Null? | Constraint/default |
|---|---|---:|---|
| `id` | Int | no | autoincrement primary key |
| `code` | String | no | unique |
| `nom` | String | no | — |
| `description` | String | yes | — |
| `actif` | Boolean | no | `true` |
| `cree_le` | DateTime | no | `now()` |

It has one-to-many relations to templates and dossiers.

### `DocumentTemplate` → `documents_templates`

| Field | Type | Null? | Default/meaning |
|---|---|---:|---|
| `id` | String | no | UUID primary key |
| `identifiant` | String | no | active-row uniqueness is database-only; see below |
| `nom` | String | no | display name |
| `code` | String | yes | optional code |
| `description` | String | yes | — |
| `format_source` | `FormatTemplateDocument` | no | — |
| `usage` | `TemplateUsage` | yes | nullable for historical/legacy records |
| `chemin_fichier` | String | no | stored source path |
| `version` | Int | no | `1` |
| `actif` | Boolean | no | `true` |
| `cree_le` | DateTime | no | `now()` |
| `type_faute_id` | Int | yes | null means generic |
| `cree_par_rh_id` | String | yes | optional creator |

Relations:

- optional `type_faute`, `onDelete: SetNull`;
- optional creator, `onDelete: SetNull`;
- referenced by dossier documents, whose template relation uses `SetNull`;
- referenced as a dossier’s selected procedure template, using `SetNull`.

### `DossierExplicatif` → `dossiers_explicatifs`

| Field | Type | Null? | Default/meaning |
|---|---|---:|---|
| `id` | String | no | UUID primary key |
| `reference` | String | no | unique |
| `nom_complet` | String | no | identity snapshot |
| `matricule` | String | no | PPR/matricule snapshot; empty string is possible |
| `profil` | String | no | grade/title/category snapshot; empty string is possible |
| `service` | String | no | service snapshot; empty string is possible |
| `professeur_id` | String | yes | optional live professor relation |
| `date_faute` | DateTime | no | — |
| `details` | String | yes | — |
| `donnees_supplementaires` | Json | yes | fault-code-specific metadata |
| `statut` | `StatutDossierExplicatif` | no | schema default `BROUILLON`; creation route writes `ENREGISTRE` |
| `decision_reponse` | `DecisionReponseExplicative` | yes | — |
| `type_procedure_selectionne` | `TypeProcedureExplicative` | yes | — |
| `date_notification` | DateTime | yes | — |
| `date_limite_reponse` | DateTime | yes | currently unused by application routes |
| `date_reponse_recue` | DateTime | yes | — |
| `en_retard` | Boolean | no | `false`; currently not calculated by application routes |
| `cree_le` | DateTime | no | `now()` |
| `type_faute_id` | Int | no | required, `onDelete: Restrict` |
| `cree_par_rh_id` | String | no | required, `onDelete: Restrict` |
| `decision_par_rh_id` | String | yes | `onDelete: SetNull` |
| `cloture_par_rh_id` | String | yes | `onDelete: SetNull` |
| `date_archivage` | DateTime | yes | set by archive endpoint |
| `archive_par_rh_id` | String | yes | `onDelete: SetNull` |
| `template_procedure_id` | String | yes | selected template, `onDelete: SetNull` |
| `motif_annulation` | String | yes | set by cancellation endpoint |

The professor relation uses `onDelete: SetNull`. Documents and history cascade when the dossier is deleted at database level. No current dossier DELETE API exists.

There is no `date_cloture`, persisted evaluation comment, or persisted closure comment field.

### `DossierDocument` → `dossiers_documents`

| Field | Type | Null? | Constraint/default |
|---|---|---:|---|
| `id` | String | no | UUID primary key |
| `identifiant` | String | no | unique |
| `titre` | String | no | — |
| `chemin_fichier` | String | no | may reference generated/uploaded content |
| `origine` | `OrigineDocumentDossier` | no | — |
| `categorie` | String | yes | free-form application category |
| `cree_le` | DateTime | no | `now()` |
| `dossier_id` | String | no | cascade delete |
| `template_id` | String | yes | `SetNull` |
| `cree_par_rh_id` | String | yes | `SetNull` |

Current categories include `correspondance_service`, `lettre_explicative`, `bordereau_notification`, `preuve_notification`, `reponse_agent`, and `procedure_suivante`. The database does not constrain category strings.

### `DossierHistory` → `dossiers_historique`

| Field | Type | Null? | Meaning |
|---|---|---:|---|
| `id` | String | no | UUID primary key |
| `dossier_id` | String | no | cascade delete |
| `action` | String | no | free-form action code |
| `description` | String | yes | — |
| `ancien_statut` | `StatutDossierExplicatif` | yes | — |
| `nouveau_statut` | `StatutDossierExplicatif` | yes | — |
| `cree_le` | DateTime | no | `now()` |
| `effectue_par_rh_id` | String | no | required RH actor, `Restrict` |

Only cancellation currently creates a history row consistently.

### Personnel referentials

`CategoriePersonnel`, `Specialite`, `Titre`, `Service`, and `Grade` each have an autoincrement integer `id`, unique required `nom`, and a professor collection. `Hopital` additionally has `cree_le @default(now())`.

Professor relations to category, specialty, and title are required and use Prisma/PostgreSQL default restrictive deletion. Relations to service, hospital, and grade are nullable with `onDelete: SetNull`.

### `Professeur` → `professeurs`

| Field | Type | Null? | Constraint/default |
|---|---|---:|---|
| `id` | String | no | UUID primary key |
| `nom`, `prenom` | String | no | Latin/default identity |
| `ppr` | String | yes | unique when non-null |
| `cin` | String | yes | indexed, not unique |
| `adresse` | String | yes | — |
| `sexe` | String | yes | application-normalized string, no DB enum |
| `lieu_naissance`, `ville` | String | yes | — |
| `specialite_id` | Int | no | required relation |
| `categorie_personnel_id` | Int | no | required relation |
| `titre_id` | Int | no | required relation |
| `service_id`, `hopital_id`, `grade_id` | Int | yes | optional `SetNull` relations |
| `telephone` | String | yes | — |
| `nom_ar`, `prenom_ar` | String | yes | Arabic names |
| `cree_le` | DateTime | no | `now()` |

Reverse relations:

- `conges`: cascade when professor is deleted;
- `soldes`: cascade when professor is deleted;
- `dossiers_explicatifs`: dossier `professeur_id` becomes null, preserving dossier snapshots.

### Leave models

`TypeConge` → `types_conge`:

- `id`: autoincrement integer primary key;
- `nom`: required, not unique;
- `document_obligatoire`: required, default false;
- one-to-many relations to leave and balances.

`SoldeConge` → `soldes_conge`:

| Field | Type | Null? | Constraint/default |
|---|---|---:|---|
| `id` | String | no | UUID primary key |
| `professeur_id` | String | no | cascade delete |
| `annee` | Int | no | — |
| `type_conge_id` | Int | no | `Restrict` |
| `jours_total` | Int | no | schema default `22` |
| `jours_restants` | Int | no | — |
| `expire_le` | DateTime | no | — |

Unique key: `(professeur_id, annee, type_conge_id)`.

`Conge` → `conges`:

| Field | Type | Null? | Meaning |
|---|---|---:|---|
| `id` | String | no | UUID primary key |
| `professeur_id` | String | no | cascade delete |
| `type_conge_id` | Int | no | restrictive/default FK |
| `date_debut`, `date_fin` | DateTime | no | start and server-computed end |
| `duree_jours` | Int | no | working-day duration |
| `hors_solde` | Boolean | no | default false |
| `nom_interim` | String | yes | full substitute name |
| `reference_doc` | String | yes | usually JSON metadata serialized into text |
| `decision_doc` | String | yes | JSON metadata serialized into text |
| `cree_par_rh_id` | String | no | restrictive/default FK |
| `cree_le` | DateTime | no | `now()` |

`JourFerie` → `jours_feries` stores inclusive required `date_debut` and `date_fin`, required `nom`, and `actif` defaulting true.

## Database-only constraints and indexes

The migration history contains behavior Prisma cannot fully express:

- `documents_templates_active_identifiant_key` is a partial unique index on `identifiant WHERE actif = true`. `identifiant` is intentionally not marked `@unique` in the Prisma schema.
- The partial index is case-sensitive under normal PostgreSQL text comparison. API checks try to prevent case-insensitive duplicates, but that stronger rule is not database-enforced.
- There is no database unique constraint for active `(type_faute_id, usage)` pairs.
- Dossier `reference` has both a unique index generated by `@unique` and a separate non-unique search index.
- Current migration history reintroduces professor search indexes for `nom`, `prenom`, `nom_ar`, `prenom_ar`, and `cin`.
- Earlier leave/performance indexes were dropped by `20260213194853_add_jours_feries` and were not recreated by later migrations. The unauthenticated raw `/api/migrate-indexes` endpoint, which could previously create some of them outside Prisma migration history, has been deleted; restoring these indexes now requires a proper tracked Prisma migration, which has not yet been created (see [Technical debt](technical-debt.md)). A database where that endpoint was invoked before its removal may still have indexes not reflected in migration history.

## Application-level constraints

These behaviors are enforced by selected routes, not the database:

- allowed RH roles are `UTILISATEUR_RH` and `LECTEUR_RH`;
- template usage must belong to the current five-value allowlist in template mutation routes;
- only one active template per `(type_faute_id, usage)` is checked before create/update/reactivation;
- template identifier conflicts are checked case-insensitively by application queries;
- new dossiers require an active `TypeFaute`;
- workflow transitions are guarded route by route;
- dossier document category values and supplemental JSON keys are allowlisted in application code;
- professor field validation and referential existence are route-level;
- balance totals, remaining-day limits, and expiration formulas are application logic;
- file MIME, size, and path checks live in upload/download handlers.

Because several checks are read-then-write operations without matching database constraints, concurrent requests can bypass their intended uniqueness or balance guarantees.

## Migration history

The migration directory is an evolution log, not a sequence of uniformly safe migrations.

| Migration | Actual effect |
|---|---|
| `20251218101343_nom_migration` | Creates users, professors, leave types, balances, and leave tables. |
| `20251218134006_add_categories_specialites_titres` | Drops professor text specialty; adds three required FKs and referential tables without a data backfill. |
| `20251222100228_add_actif_to_utilisateurrh` | Adds user active flag safely with default true. |
| `20251222115430_add_service_to_professeur` | Creates services, inserts a default, backfills service, then sets the FK non-null. |
| `20251222120000_add_performance_indexes` | Adds professor, leave, balance, and user indexes. |
| `20251223141114_test` | Empty migration. |
| `20251224085105_changetousername` | Empty migration. |
| `20251224130515_sync_schema_changes` | Drops professor CIN, adds then-current interim fields, changes balance default, adds username, and makes email nullable. |
| `20251225084301_added_hopitale` | Moves interim fields to leave, removes professor interim fields, and adds required typed balance without a backfill. |
| `20251225150315_add_hopital` | Creates hospitals. |
| `20251226092641_add_hopital_id` | Adds required mixed-case `Hopital_id` without a backfill. |
| `20251226141602_make_grad_optional` | Creates grades and nullable professor grade FK. |
| `20251229145535_make_professor_fields_optional` | Makes several professor referential FKs nullable and changes their delete actions to `SetNull`. |
| `20251229150513_make_professor_fields_optional` | Empty migration. |
| `20260213194853_add_jours_feries` | Destructively removes interim fields, service/hospital/grade links, typed balances, indexes, and three referential tables; makes several professor fields required; creates single-date holidays. |
| `20260213200000_restore_services_grades_hopitaux` | Recreates the removed referentials, restores lowercase nullable FKs, and makes CIN nullable. It cannot restore data dropped by the prior migration. |
| `20260213210000_add_type_conge_to_soldes` | Re-adds `type_conge_id` nullable, backfills every row to the first leave type, then sets it non-null and restores composite uniqueness. |
| `20260324120000_hors_solde_optional_ppr` | Adds `hors_solde`; makes PPR nullable. |
| `20260324193938_hybrid_feature` | Drops the balance type lookup index. |
| `20260324200000_jours_feries_date_range` | Adds holiday ranges, backfills from `date`, then drops the old date column/indexes. |
| `20260328120000_add_conge_decision_doc` | Adds nullable decision document text metadata. |
| `20260422083350_add_dossiers_explicatifs` | Creates initial dossier enums, types, templates, dossiers, documents, history, indexes, and FKs. Templates initially require a fault type. |
| `20260422090034_add_enregistre_to_dossier_status` | Adds `ENREGISTRE`. |
| `20260422091133_add_documents_initiaux_generes_status` | Adds `DOCUMENTS_INITIAUX_GENERES`. |
| `20260430120000_add_procedure_suivante` | Adds procedure type/status and selected procedure template fields. |
| `20260501093939_add_professeur_relation_to_dossier` | Adds convincing/non-convincing statuses and nullable professor relation. |
| `20260502101625_add_template_usage` | Adds the first four `TemplateUsage` values and nullable usage column. |
| `20260505115449_add_dossier_archive_lifecycle` | Adds `A_ARCHIVER`, `ARCHIVE`, archive date, and archive actor. |
| `20260514000000_add_procedure_disciplinaire_usage` | Adds `PROCEDURE_DISCIPLINAIRE`. |
| `20260518202512_add_dossier_extra_metadata` | Adds JSON supplemental metadata. |
| `20260519120000_partial_unique_active_templates` | Replaces unconditional template-identifier uniqueness with active-row partial uniqueness. |
| `20260519140000_add_nom_interim_to_conge` | Adds the consolidated leave substitute-name field. |
| `20260602000000_add_role_to_utilisateurs_rh` | Adds role as required text with `UTILISATEUR_RH` default. |
| `20260609000000_add_adresse_to_professeurs` | Adds professor address. |
| `20260610000000_add_employee_personal_fields` | Adds sex, birthplace, and city. |
| `20260622195513_add_professeur_arabic_names` | Adds Arabic surname and given name. |
| `20260623052330_make_type_faute_optional_on_template` | Makes template fault type nullable and changes deletion to `SetNull`. |
| `20260625113024_add_search_indexes` | Adds dossier and professor search indexes. |
| `20260625144932_add_dossier_annulation` | Adds `ANNULE`, cancellation reason, and a proposed self-referencing replacement relation. |
| `20260625150000_remove_dossier_remplacement` | Immediately removes the replacement relation and column; cancellation reason remains. |

## Known migration hazards

1. `20251218134006_add_categories_specialites_titres` drops data and adds required columns without a populated-table migration plan.
2. `20251225084301_added_hopitale` drops fields and adds a required balance type without a backfill.
3. `20251226092641_add_hopital_id` adds a required field without a backfill.
4. `20260213194853_add_jours_feries` explicitly drops business columns, indexes, and whole referential tables. The next migration recreates structures, not lost data.
5. `20260213210000_add_type_conge_to_soldes` assigns all existing balances to whichever leave type has the lowest ID, which may not represent their original meaning.
6. `20260324200000_jours_feries_date_range` drops the old holiday date after backfill.
7. `20260625150000_remove_dossier_remplacement` drops a column added by the immediately preceding migration.
8. Multiple enum migrations add values. Removing or renaming existing enum values later would require explicit data-aware handling.
9. The Docker scanner skips all scanning when the database has zero finished migrations. A fresh bootstrap can replay the destructive historical sequence.
10. Raw migration API routes can change database structure outside `_prisma_migrations`, creating drift from both schema and migration history.

## Seed behavior and mismatches

`prisma/seed.js` currently attempts to:

- upsert six leave types;
- upsert `admin` / `admin@example.com` with development password `admin123`;
- upsert twelve fault types;
- create an explanatory-letter DOCX and notification PDF template record per fault type.

Known mismatches:

- `DocumentTemplate.identifiant` is not a Prisma unique field after the partial-index migration, but the seed uses `upsert({ where: { identifiant } })`. This may fail Prisma validation/runtime and should not be documented as reliably idempotent.
- Partial unique indexes are not expressible as an ordinary Prisma `@unique`, so the seed needs a different lookup/update strategy if repaired later.
- Seed template paths use `templates/dossiers-explicatifs/...`, whereas interactive uploads use `/uploads/templates/...`.
- The seed declares notification templates as PDF, while current document generation passes selected template content through `docxtemplater`, which expects a DOCX ZIP package.
- The default credentials are development-oriented and must not be treated as production provisioning.
- Running the seed is not part of Docker entrypoint startup.
