import dotenv from "dotenv";
dotenv.config();

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool, closeDb } from "../config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations() {
  const res = await pool.query(`SELECT filename FROM schema_migrations ORDER BY filename;`);
  return new Set(res.rows.map((r) => r.filename));
}

async function getMigrationFiles() {
  const migrationsDir = path.resolve(__dirname, "../../migrations");
  const files = await fs.readdir(migrationsDir);
  return files
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => ({ filename: f, fullPath: path.join(migrationsDir, f) }));
}

async function applyMigration({ filename, fullPath }) {
  const sql = await fs.readFile(fullPath, "utf8");

  await pool.query("BEGIN");
  try {
    await pool.query(sql);
    await pool.query(`INSERT INTO schema_migrations (filename) VALUES ($1);`, [filename]);
    await pool.query("COMMIT");
    console.log(`✅ Applied: ${filename}`);
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error(`❌ Failed: ${filename}`);
    throw err;
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing. Add it to server/.env");
  }

  await ensureMigrationsTable();

  const applied = await getAppliedMigrations();
  const files = await getMigrationFiles();

  const pending = files.filter((f) => !applied.has(f.filename));

  if (pending.length === 0) {
    console.log("✅ No pending migrations.");
    return;
  }

  console.log(`Found ${pending.length} pending migration(s).`);
  for (const m of pending) {
    await applyMigration(m);
  }

  console.log("✅ Migrations complete.");
}

main()
  .then(() => closeDb())
  .catch(async (err) => {
    console.error(err);
    await closeDb();
    process.exit(1);
  });
