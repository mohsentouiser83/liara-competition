import { z } from "zod";

const optionalNonEmptyString = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().min(1).optional()
);

const envSchema = z.object({
  APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
  AVALAI_API_KEY: optionalNonEmptyString,
  AVALAI_BASE_URL: z.string().url().default("https://api.avalai.ir/v1"),
  AVALAI_MODEL: optionalNonEmptyString,
  AVALAI_FAST_MODEL: optionalNonEmptyString,
  AVALAI_REASONING_MODEL: optionalNonEmptyString,
  AVALAI_EMBEDDING_MODEL: optionalNonEmptyString,
  DATABASE_URL: optionalNonEmptyString,
  DATABASE_SSL_MODE: z.enum(["disable", "require", "verify-full"]).default("verify-full"),
  REDIS_URL: optionalNonEmptyString,
  RAG_MODE: z.enum(["auto", "local", "postgres"]).default("auto"),
  EMBEDDING_PROVIDER: z.enum(["deterministic", "avalai"]).default("deterministic"),
  EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(1536),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info")
}).superRefine((value, context) => {
  if (value.APP_ENV !== "production") return;

  const required = [
    ["AVALAI_API_KEY", value.AVALAI_API_KEY],
    ["AVALAI_MODEL", value.AVALAI_MODEL],
    ["AVALAI_EMBEDDING_MODEL", value.AVALAI_EMBEDDING_MODEL],
    ["DATABASE_URL", value.DATABASE_URL],
    ["REDIS_URL", value.REDIS_URL]
  ] as const;
  for (const [name, configured] of required) {
    if (!configured) context.addIssue({ code: "custom", path: [name], message: `${name} is required in production` });
  }
  if (value.RAG_MODE !== "postgres") {
    context.addIssue({ code: "custom", path: ["RAG_MODE"], message: "RAG_MODE must be postgres in production" });
  }
  if (value.EMBEDDING_PROVIDER !== "avalai") {
    context.addIssue({ code: "custom", path: ["EMBEDDING_PROVIDER"], message: "EMBEDDING_PROVIDER must be avalai in production" });
  }
});

export function parseEnv(input: Record<string, string | undefined>) {
  return envSchema.parse(input);
}

export const env = parseEnv(process.env);
