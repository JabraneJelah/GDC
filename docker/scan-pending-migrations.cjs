/**
 * Pending migration SQL guard (deployment safety only).
 *
 * Pending set = folders under prisma/migrations/ containing migration.sql whose
 * directory name is not listed in _prisma_migrations with finished_at set.
 * If _prisma_migrations is missing (fresh DB), every local migration is treated as pending.
 *
 * Pattern-based scan only (not full SQL parsing). Conservative: DELETE FROM requires
 * a WHERE clause in the same statement segment (split on ';' after comment stripping).
 *
 * Bootstrap: if the database has zero finished migrations, this guard is skipped with a
 * warning. The first `migrate deploy` may legitimately replay a long history that includes
 * historical DROP statements; the guard targets incremental deploys once a baseline exists.
 */

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const MIGRATIONS_DIR = path.join(process.cwd(), "prisma", "migrations");

function stripSqlComments(sql) {
  let s = sql.replace(/\/\*[\s\S]*?\*\//g, " ");
  s = s.replace(/--[^\n\r]*/g, " ");
  return s;
}

function normalizeForKeywords(sql) {
  return stripSqlComments(sql).replace(/\s+/g, " ").trim().toLowerCase();
}

function findDestructivePatterns(sql) {
  const n = normalizeForKeywords(sql);
  const hits = [];

  if (/\bdrop\s+table\b/.test(n)) hits.push("DROP TABLE");
  if (/\bdrop\s+column\b/.test(n)) hits.push("DROP COLUMN");
  if (/\btruncate\b/.test(n)) hits.push("TRUNCATE");
  if (/\bdrop\s+schema\b/.test(n)) hits.push("DROP SCHEMA");
  if (/\bdrop\s+database\b/.test(n)) hits.push("DROP DATABASE");

  // CREATE TABLE ... AS SELECT — often replaces population semantics; treat as high-risk.
  if (/\bcreate\s+table\s+(?:"[^"]+"|\S+)\s+as\s+select\b/.test(n)) {
    hits.push("CREATE TABLE ... AS SELECT");
  }

  // ALTER COLUMN ... TYPE — type changes can truncate or fail destructively in prod.
  if (/\balter\s+table\b[\s\S]{0,4000}?\balter\s+column\b[\s\S]{0,500}?\btype\b/.test(n)) {
    hits.push("ALTER COLUMN ... TYPE");
  }

  // DELETE FROM without WHERE in the same statement (split on ';' after comment strip).
  const stripped = stripSqlComments(sql);
  const segments = stripped.split(";").map((x) => x.trim()).filter(Boolean);
  for (const seg of segments) {
    const low = seg.replace(/\s+/g, " ").trim().toLowerCase();
    if (/\bdelete\s+from\b/.test(low) && !/\bwhere\b/.test(low)) {
      hits.push("DELETE FROM without WHERE");
      break;
    }
  }

  // Obvious table recreation in one migration: DROP TABLE then CREATE TABLE same name (identifier).
  const dropTables = [];
  const reDrop = /\bdrop\s+table\s+(?:if\s+exists\s+)?(?:"([^"]+)"|(\w+))\b/gi;
  let m;
  while ((m = reDrop.exec(n)) !== null) {
    dropTables.push((m[1] || m[2] || "").toLowerCase());
  }
  if (dropTables.length) {
    const reCreate = /\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?(?:"([^"]+)"|(\w+))\b/gi;
    while ((m = reCreate.exec(n)) !== null) {
      const t = (m[1] || m[2] || "").toLowerCase();
      if (t && dropTables.includes(t)) {
        hits.push(`table recreation pattern (DROP then CREATE "${t}")`);
        break;
      }
    }
  }

  return [...new Set(hits)];
}

async function loadAppliedMigrationNames(client) {
  try {
    const r = await client.query(
      `SELECT "migration_name" FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL`,
    );
    return new Set(r.rows.map((row) => row.migration_name));
  } catch (e) {
    if (e && e.code === "42P01") {
      return new Set();
    }
    throw e;
  }
}

function listPendingMigrationDirs(applied) {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    throw new Error(`Migrations directory missing: ${MIGRATIONS_DIR}`);
  }
  const names = fs
    .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const pending = [];
  for (const name of names) {
    if (applied.has(name)) continue;
    const sqlPath = path.join(MIGRATIONS_DIR, name, "migration.sql");
    if (!fs.existsSync(sqlPath)) continue;
    pending.push({ name, sqlPath });
  }
  return pending;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("ERROR: DATABASE_URL is required for migration scan.");
    process.exit(1);
  }

  const client = new Client({ connectionString: url });
  await client.connect();
  let applied;
  try {
    applied = await loadAppliedMigrationNames(client);
  } finally {
    await client.end();
  }

  const pending = listPendingMigrationDirs(applied);
  if (pending.length === 0) {
    console.log("[startup] migration safety scan: no pending migrations (nothing to scan).");
    process.exit(0);
  }

  if (applied.size === 0) {
    console.warn(
      "[startup] migration safety scan: SKIPPED (no finished migrations on this database yet — bootstrap).",
    );
    console.warn(
      "[startup] Destructive-pattern blocking applies on subsequent deploys when incremental pending migrations exist.",
    );
    process.exit(0);
  }

  console.log(
    `[startup] migration safety scan: checking ${pending.length} pending migration(s): ${pending
      .map((p) => p.name)
      .join(", ")}`,
  );

  const blocked = [];
  for (const { name, sqlPath } of pending) {
    const sql = fs.readFileSync(sqlPath, "utf8");
    const rel = path.relative(process.cwd(), sqlPath).split(path.sep).join("/");
    const hits = findDestructivePatterns(sql);
    if (hits.length) {
      blocked.push({ name, rel, hits });
    }
  }

  if (blocked.length === 0) {
    console.log("[startup] migration safety scan: no destructive patterns detected in pending SQL.");
    process.exit(0);
  }

  const override =
    String(process.env.ALLOW_DESTRUCTIVE_MIGRATIONS || "").toLowerCase() === "true";
  console.error("");
  console.error("================================================================================");
  console.error("ERROR: startup blocked — destructive SQL patterns in pending migration(s).");
  console.error("================================================================================");
  for (const b of blocked) {
    console.error(`  - migration: ${b.name}`);
    console.error(`    file: ${b.rel}`);
    console.error(`    patterns: ${b.hits.join(", ")}`);
  }
  console.error("");
  console.error(
    "To proceed anyway (dangerous), set ALLOW_DESTRUCTIVE_MIGRATIONS=true explicitly.",
  );
  console.error("================================================================================");
  console.error("");

  if (!override) {
    process.exit(1);
  }

  console.warn("");
  console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.warn("WARNING: ALLOW_DESTRUCTIVE_MIGRATIONS=true — bypassing destructive migration guard.");
  console.warn("Destructive SQL may run next (prisma migrate deploy). Use only with intent.");
  console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.warn("");
  process.exit(0);
}

main().catch((err) => {
  console.error("ERROR: migration safety scan failed:", err.message || err);
  process.exit(1);
});
