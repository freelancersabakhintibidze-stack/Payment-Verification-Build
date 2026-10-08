import { z } from "zod";
import path from "node:path";

/**
 * Environment contract.
 *
 * Validation is lazy and build-safe:
 *   - Importing this module NEVER throws. During `next build`, Next.js
 *     imports every route module to collect page data and prerenders static
 *     pages, and on a build machine (Vercel, CI, Docker) runtime secrets such
 *     as DATABASE_URL are usually absent. Throwing there would break the
 *     build instead of surfacing a real deployment problem.
 *   - The strict contract is enforced on the FIRST actual property access at
 *     runtime, where a missing or malformed variable fails fast with a
 *     readable message instead of failing silently later.
 *   - During the build phase (NEXT_PHASE=phase-production-build) the real
 *     values are preferred when the build machine has them; otherwise schema
 *     defaults apply, so prerendering stays safe and honest.
 *
 * DEMO_MODE=true keeps the whole product runnable with zero configuration:
 * verification is simulated end to end and clearly labeled "simulated".
 */
const envSchema = z.object({
  // Optional by design: when missing, the app runs in zero-configuration
  // mode on an ephemeral SQLite database (see databaseUrl() below).
  DATABASE_URL: z.string().optional(),

  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // Solana
  SOLANA_RPC_URL: z
    .string()
    .min(1)
    .default("https://api.mainnet-beta.solana.com"),
  SOLANA_COMMITMENT: z
    .enum(["processed", "confirmed", "finalized"])
    .default("confirmed"),
  MERCHANT_WALLET: z.string().min(32).max(44).optional().or(z.literal("")),
  REQUIRE_MEMO: z
    .string()
    .optional()
    .transform((v) => v !== "false" && v !== "0"),

  // Demo
  DEMO_MODE: z
    .string()
    .optional()
    .transform((v) => v !== "false" && v !== "0"),

  // Cron
  CRON_SECRET: z.string().min(8).optional(),

  // Delivery channels (optional; delivery degrades honestly without them)
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
  DELIVERY_WEBHOOK_URL: z.string().optional(),
  WEBHOOK_SECRET: z.string().min(16).optional(),

  // Public origin used to build payment links
  NEXT_PUBLIC_APP_URL: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

/**
 * Build-time twin of the contract: identical, except DATABASE_URL is only
 * required at runtime, so a build machine without secrets still gets a fully
 * typed Env object with schema defaults.
 */
const buildEnvSchema = envSchema.extend({
  DATABASE_URL: z.string().default(""),
});

interface LoadedEnv {
  env: Env;
  warnings: string[];
}

/** Set by Next.js while `next build` runs (route collection + prerendering). */
const BUILD_PHASE = process.env.NEXT_PHASE === "phase-production-build";

let cache: LoadedEnv | undefined;

/** Configuration degradations worth surfacing in API responses (not errors). */
function collectWarnings(env: Env): string[] {
  const warnings: string[] = [];

  if (!env.DATABASE_URL?.trim()) {
    warnings.push(
      "DATABASE_URL is not set: running in zero-config mode on an ephemeral SQLite database (data resets on cold start). Set DATABASE_URL for persistent storage.",
    );
  }
  if (env.DEMO_MODE) {
    warnings.push(
      "DEMO_MODE is enabled: verification runs in simulated mode and is labeled as such.",
    );
  }
  if (!env.CRON_SECRET) {
    warnings.push("CRON_SECRET is not set: the cron endpoint rejects requests.");
  }
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    warnings.push("Telegram is not configured: notifications will be logged as skipped.");
  }
  if (!env.DELIVERY_WEBHOOK_URL) {
    warnings.push("DELIVERY_WEBHOOK_URL is not set: webhook delivery disabled.");
  }
  if (env.DELIVERY_WEBHOOK_URL && !env.WEBHOOK_SECRET) {
    warnings.push("WEBHOOK_SECRET is not set: webhook is sent unsigned.");
  }

  return warnings;
}

/** Strict runtime contract. Throws with a readable message on any violation. */
function loadStrict(): LoadedEnv {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(
      `Invalid environment configuration. ${issues}. Copy .env.example to .env and fill the values.`,
    );
  }

  const env = parsed.data;

  if (!env.DEMO_MODE && !env.MERCHANT_WALLET) {
    throw new Error(
      "MERCHANT_WALLET is required when DEMO_MODE is disabled. Set the merchant's Solana address or enable DEMO_MODE=true.",
    );
  }

  if (!env.DEMO_MODE && !env.DATABASE_URL?.trim()) {
    throw new Error(
      "Real verification needs a persistent ledger. Set DATABASE_URL (PostgreSQL) or keep DEMO_MODE enabled.",
    );
  }

  return { env, warnings: collectWarnings(env) };
}

/**
 * Lenient build-time contract. Prefer the real values when the build machine
 * has them (Vercel injects project env into builds, keeping prerendered
 * output accurate); otherwise fall back to pure schema defaults. With zero
 * configuration DEMO_MODE defaults to true, which is exactly what an
 * unconfigured runtime would do.
 */
function loadBuildTime(): LoadedEnv {
  const parsed = envSchema.safeParse(process.env);
  if (parsed.success) {
    return { env: parsed.data, warnings: collectWarnings(parsed.data) };
  }
  return { env: buildEnvSchema.parse({}), warnings: [] };
}

function load(): LoadedEnv {
  if (!cache) {
    cache = BUILD_PHASE ? loadBuildTime() : loadStrict();
  }
  return cache;
}

/**
 * Lazily validated environment. Importing is always safe; the first property
 * read applies the strict contract. Implemented as a Proxy so existing
 * `env.SOME_VAR` call sites keep working unchanged.
 */
export const env: Env = new Proxy({} as Env, {
  get(_target, prop) {
    return Reflect.get(load().env as object, prop);
  },
  has(_target, prop) {
    return prop in (load().env as object);
  },
  ownKeys() {
    return Reflect.ownKeys(load().env as object);
  },
  getOwnPropertyDescriptor(_target, prop) {
    const descriptor = Reflect.getOwnPropertyDescriptor(
      load().env as object,
      prop,
    );
    return descriptor ? { ...descriptor, configurable: true } : undefined;
  },
});

/** Warnings collected while validating (config degradations, not errors). */
export function getEnvWarnings(): string[] {
  return load().warnings;
}

/** Absolute SQLite URL used when DATABASE_URL is not configured. */
function fallbackSqliteUrl(): string {
  if (process.env.VERCEL) {
    return "file:/tmp/aether-arena.db";
  }
  return `file:${path.join(process.cwd(), "db", "aether-arena.db")}`;
}

interface ResolvedDatabase {
  url: string;
  /** True when running on the zero-config ephemeral fallback. */
  fallback: boolean;
}

let databaseCache: ResolvedDatabase | undefined;

/**
 * The database connection URL. When DATABASE_URL is configured it is passed
 * through untouched (Prisma resolves relative `file:` URLs against the schema
 * directory, matching the CLI). When it is missing the app is still fully
 * functional in zero-configuration mode: an ephemeral SQLite database is used
 * (on Vercel /tmp, locally ./db), its tables are created automatically, and
 * the missing configuration is surfaced as a warning instead of an error.
 */
export function databaseUrl(): ResolvedDatabase {
  if (!databaseCache) {
    const configured = load().env.DATABASE_URL?.trim();
    databaseCache = configured
      ? { url: configured, fallback: false }
      : { url: fallbackSqliteUrl(), fallback: true };
  }
  return databaseCache;
}

/** True when the active database is SQLite (a `file:` URL). */
export function isSqliteDatabase(): boolean {
  return databaseUrl().url.startsWith("file:");
}

/** True when the app runs on the zero-config ephemeral fallback. */
export function isFallbackDatabase(): boolean {
  return databaseUrl().fallback;
}

/** True when verification is simulated end to end. */
export function isDemo(): boolean {
  return load().env.DEMO_MODE;
}

/** Demo escrow address used when no merchant wallet is configured. */
export const DEMO_MERCHANT_WALLET =
  "5PPZPeRh5VpuCq9HYPvTguoJk3WTTW6XLD2f2vsTs7wk";

/** The configured merchant wallet, or the demo escrow address. */
export function merchantWallet(): string {
  const configured = load().env.MERCHANT_WALLET;
  return configured && configured.length >= 32
    ? configured
    : DEMO_MERCHANT_WALLET;
}
