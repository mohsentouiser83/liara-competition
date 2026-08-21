import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { createPostgresPool, type DatabaseSslMode } from "../src/lib/db/postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const requiredDatabaseUrl = databaseUrl;
const dimensions = Number(process.env.EMBEDDING_DIMENSIONS ?? 1536);
if (dimensions !== 1536) throw new Error("Migration 001 uses vector(1536); set EMBEDDING_DIMENSIONS=1536");

async function main() {
  const pool = createPostgresPool(requiredDatabaseUrl, (process.env.DATABASE_SSL_MODE ?? "verify-full") as DatabaseSslMode);
  try {
    const directory = path.resolve(process.cwd(), "db/migrations");
    const migrations = (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort();
    for (const file of migrations) await pool.query(await readFile(path.join(directory, file), "utf8"));
    console.log(`${migrations.length} database migrations applied successfully`);
  } finally {
    await pool.end();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
