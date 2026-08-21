import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

describe("production environment", () => {
  it("rejects missing production dependencies", () => {
    expect(() => parseEnv({ APP_ENV: "production" })).toThrow();
  });

  it("accepts a complete production configuration", () => {
    const parsed = parseEnv({
      APP_ENV: "production",
      AVALAI_API_KEY: "test-key",
      AVALAI_MODEL: "chat-model",
      AVALAI_EMBEDDING_MODEL: "embedding-model",
      DATABASE_URL: "postgresql://db.example/app",
      REDIS_URL: "redis://redis.example",
      RAG_MODE: "postgres",
      EMBEDDING_PROVIDER: "avalai"
    });
    expect(parsed.APP_ENV).toBe("production");
  });
});
