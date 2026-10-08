import { PrismaClient as PostgresClient } from "@prisma/client";
import { PrismaClient as SqliteClient } from "aether-prisma-sqlite";
import { databaseUrl } from "@/lib/env";
import { bootstrapSqliteSchema } from "@/lib/sqlite-bootstrap";

/**
 * Data layer.
 *
 * Two Prisma clients are generated from the two shipped schemas:
 *   - `@prisma/client`        -> PostgreSQL (the primary, persistent target)
 *   - `aether-prisma-sqlite`  -> SQLite (zero-configuration fallback)
 *
 * The right client is selected at runtime from the resolved database URL.
 * Both share an identical model surface, so the SQLite client provides the
 * canonical TypeScript type and the Postgres instance is structurally
 * identical at every call site used by this app.
 *
 * On SQLite the exact schema is created automatically on first use (see
 * sqlite-bootstrap.ts), so a fresh deployment works with zero setup.
 */
export type Db = SqliteClient;

const globalForPrisma = globalThis as unknown as { aetherDb?: Db };

function logLevels(): Array<"error" | "warn"> {
  return process.env.NODE_ENV === "development"
    ? ["error", "warn"]
    : ["error"];
}

function createDb(): Db {
  const log = logLevels();
  const { url, fallback } = databaseUrl();

  if (url.startsWith("file:")) {
    // When DATABASE_URL is configured, let the client resolve it from the
    // environment (schema-relative semantics, same as the Prisma CLI). The
    // zero-config fallback URL is absolute, so it is passed explicitly.
    const client = fallback
      ? new SqliteClient({ log, datasourceUrl: url })
      : new SqliteClient({ log });

    // Create the schema exactly once per process, before the first query.
    // A failed attempt clears the promise so the next query can retry.
    let ready: Promise<void> | null = null;
    const extended = client.$extends({
      query: {
        $allModels: {
          async $allOperations({ args, query }) {
            if (!ready) {
              ready = bootstrapSqliteSchema(client).catch((error) => {
                ready = null;
                throw error;
              });
            }
            await ready;
            return query(args);
          },
        },
      },
    });
    return extended as unknown as Db;
  }

  return new PostgresClient({ log }) as unknown as Db;
}

export const db: Db = globalForPrisma.aetherDb ?? createDb();

if (process.env.NODE_ENV !== "production") globalForPrisma.aetherDb = db;
