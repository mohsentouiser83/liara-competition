import { access, mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import type { Pool, PoolClient } from "pg";
import { createEmbeddingProvider } from "../src/lib/embeddings/factory";
import { createPostgresPool, vectorLiteral, type DatabaseSslMode } from "../src/lib/db/postgres";
import { loadDocuments } from "../src/lib/rag/ingestion/loader";
import type { ParsedDocument } from "../src/lib/rag/types";

const args = new Set(process.argv.slice(2));
const sourceArgument = process.argv.find((argument) => argument.startsWith("--source="))?.slice("--source=".length);
const sourceRoot = path.resolve(sourceArgument ?? path.join(process.cwd(), ".cache", "liara-docs", "src", "pages"));
const repositoryRoot = path.resolve(sourceRoot, "..", "..");
const dataDirectory = path.resolve(process.cwd(), ".data");
const indexPath = path.join(dataDirectory, "liara-index.json");
const databaseUrl = process.env.DATABASE_URL;
const dimensions = Number(process.env.EMBEDDING_DIMENSIONS ?? 1536);
const embeddingProvider = createEmbeddingProvider({
  provider: process.env.EMBEDDING_PROVIDER === "avalai" ? "avalai" : "deterministic",
  dimensions,
  apiKey: process.env.AVALAI_API_KEY,
  baseUrl: process.env.AVALAI_BASE_URL ?? "https://api.avalai.ir/v1",
  model: process.env.AVALAI_EMBEDDING_MODEL
});

function run(command: string, commandArgs: string[]) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, commandArgs, { stdio: ["ignore", "pipe", "inherit"] });
    let output = "";
    child.stdout.on("data", (chunk) => { output += String(chunk); });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve(output.trim()) : reject(new Error(`${command} exited with ${code}`)));
  });
}

async function exists(target: string) {
  return access(target).then(() => true, () => false);
}

async function upsertDocument(client: PoolClient, document: ParsedDocument) {
  const metadata = document.metadata;
  await client.query({
    text: `
      INSERT INTO knowledge_documents
        (id, source, title, url, service, topic, framework, language, version, content_hash, source_path, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now())
      ON CONFLICT (id) DO UPDATE SET
        title=EXCLUDED.title, url=EXCLUDED.url, service=EXCLUDED.service, topic=EXCLUDED.topic,
        framework=EXCLUDED.framework, language=EXCLUDED.language, version=EXCLUDED.version,
        content_hash=EXCLUDED.content_hash, source_path=EXCLUDED.source_path, updated_at=now()
    `,
    values: [document.id, metadata.source, metadata.title, metadata.url, metadata.service ?? null, metadata.topic ?? null, metadata.framework ?? null, metadata.language, metadata.version, metadata.contentHash, metadata.sourcePath]
  });
}

async function ingestDatabase(pool: Pool, documents: ParsedDocument[]) {
  if (dimensions !== 1536) throw new Error("PostgreSQL schema currently requires EMBEDDING_DIMENSIONS=1536");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const document of documents) {
      await upsertDocument(client, document);
      await client.query("DELETE FROM knowledge_chunks WHERE document_id = $1", [document.id]);
      for (let offset = 0; offset < document.chunks.length; offset += 32) {
        const batch = document.chunks.slice(offset, offset + 32);
        const embeddings = await embeddingProvider.embedMany(batch.map((chunk) => `${chunk.title}\n${chunk.section}\n${chunk.content}`));
        for (let index = 0; index < batch.length; index += 1) {
          const chunk = batch[index]!;
          await client.query({
            text: `
              INSERT INTO knowledge_chunks
                (id, document_id, chunk_index, section, heading_path, content, token_count, content_hash, embedding, metadata, updated_at)
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::vector,$10::jsonb,now())
            `,
            values: [chunk.id, chunk.documentId, chunk.chunkIndex, chunk.section, chunk.headingPath, chunk.content, chunk.tokenCount, chunk.contentHash, vectorLiteral(embeddings[index]!), JSON.stringify(chunk.metadata)]
          });
        }
      }
    }
    if (args.has("--prune")) {
      await client.query("DELETE FROM knowledge_documents WHERE source = 'liara-docs' AND NOT (id = ANY($1::text[]))", [documents.map((document) => document.id)]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  if (!(await exists(sourceRoot))) throw new Error(`Documentation source not found at ${sourceRoot}. Run pnpm docs:sync first.`);
  const version = await run("git", ["-C", repositoryRoot, "rev-parse", "--short", "HEAD"]).catch(() => "local");
  const documents = await loadDocuments(sourceRoot, version);
  const chunks = documents.flatMap((document) => document.chunks);

  await mkdir(dataDirectory, { recursive: true });
  const temporaryPath = `${indexPath}.tmp`;
  await writeFile(temporaryPath, JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), sourceVersion: version, chunks }));
  await rename(temporaryPath, indexPath);

  if (databaseUrl) {
    const pool = createPostgresPool(databaseUrl, (process.env.DATABASE_SSL_MODE ?? "verify-full") as DatabaseSslMode);
    try {
      const migrationDirectory = path.resolve(process.cwd(), "db/migrations");
      const migrations = (await readdir(migrationDirectory)).filter((file) => file.endsWith(".sql")).sort();
      for (const file of migrations) await pool.query(await readFile(path.join(migrationDirectory, file), "utf8"));
      await ingestDatabase(pool, documents);
    } finally {
      await pool.end();
    }
  }

  console.log(JSON.stringify({ documents: documents.length, chunks: chunks.length, sourceVersion: version, embeddingProvider: embeddingProvider.name, localIndex: indexPath, database: Boolean(databaseUrl) }, null, 2));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
