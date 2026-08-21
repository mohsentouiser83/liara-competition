import { Pool } from "pg";

export type DatabaseSslMode = "disable" | "require" | "verify-full";

export function postgresSsl(connectionString: string, mode: DatabaseSslMode = "verify-full") {
  if (connectionString.includes("localhost") || connectionString.includes("127.0.0.1") || mode === "disable") return undefined;
  if (mode === "require") return { rejectUnauthorized: false };
  return { rejectUnauthorized: true };
}

export function createPostgresPool(connectionString: string, sslMode: DatabaseSslMode = "verify-full") {
  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl: postgresSsl(connectionString, sslMode)
  });
}

export function vectorLiteral(vector: number[]) {
  return `[${vector.join(",")}]`;
}
