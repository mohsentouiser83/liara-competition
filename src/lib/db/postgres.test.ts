import { describe, expect, it } from "vitest";
import { postgresSsl } from "./postgres";

describe("PostgreSQL TLS policy", () => {
  it("verifies remote certificates by default", () => {
    expect(postgresSsl("postgresql://db.example/app")).toEqual({ rejectUnauthorized: true });
  });

  it("supports explicitly required but unverified TLS", () => {
    expect(postgresSsl("postgresql://db.example/app", "require")).toEqual({ rejectUnauthorized: false });
  });

  it("does not enable TLS for local development", () => {
    expect(postgresSsl("postgresql://localhost/app")).toBeUndefined();
  });
});
