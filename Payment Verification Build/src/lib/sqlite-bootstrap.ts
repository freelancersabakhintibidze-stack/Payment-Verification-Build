/**
 * SQLite bootstrap DDL, generated from prisma/schema.sqlite.prisma via
 * `prisma migrate diff --from-empty` and made idempotent (IF NOT EXISTS).
 *
 * Zero-configuration mode: when the app starts without DATABASE_URL it runs
 * on an ephemeral SQLite database (Vercel: /tmp, locally: ./db), and these
 * statements create the exact schema on first use. Safe to run repeatedly;
 * executed once per process before the first query (see src/lib/db.ts).
 */
export const SQLITE_BOOTSTRAP: readonly string[] = [
  "CREATE TABLE IF NOT EXISTS \"Payment\" ( \"id\" TEXT NOT NULL PRIMARY KEY, \"orderId\" TEXT NOT NULL, \"amount\" DECIMAL NOT NULL, \"senderWallet\" TEXT NOT NULL, \"txHash\" TEXT, \"status\" TEXT NOT NULL DEFAULT 'PENDING', \"verifiedAt\" DATETIME, \"createdAt\" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, \"updatedAt\" DATETIME NOT NULL, \"paymentAddress\" TEXT NOT NULL, \"memo\" TEXT NOT NULL, \"asset\" TEXT NOT NULL DEFAULT 'SOL', \"mint\" TEXT, \"simulated\" BOOLEAN NOT NULL DEFAULT false, \"expiresAt\" DATETIME NOT NULL, \"lastCheckedAt\" DATETIME, \"checks\" INTEGER NOT NULL DEFAULT 0, \"deliveredAt\" DATETIME, \"deliveredTo\" TEXT );",
  "CREATE TABLE IF NOT EXISTS \"DeliveryLog\" ( \"id\" TEXT NOT NULL PRIMARY KEY, \"paymentId\" TEXT NOT NULL, \"attempt\" INTEGER NOT NULL DEFAULT 1, \"channel\" TEXT NOT NULL, \"status\" TEXT NOT NULL, \"detail\" TEXT, \"createdAt\" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT \"DeliveryLog_paymentId_fkey\" FOREIGN KEY (\"paymentId\") REFERENCES \"Payment\" (\"id\") ON DELETE CASCADE ON UPDATE CASCADE );",
  "CREATE UNIQUE INDEX IF NOT EXISTS \"Payment_orderId_key\" ON \"Payment\"(\"orderId\");",
  "CREATE UNIQUE INDEX IF NOT EXISTS \"Payment_txHash_key\" ON \"Payment\"(\"txHash\");",
  "CREATE INDEX IF NOT EXISTS \"Payment_status_idx\" ON \"Payment\"(\"status\");",
  "CREATE INDEX IF NOT EXISTS \"Payment_createdAt_idx\" ON \"Payment\"(\"createdAt\");",
  "CREATE INDEX IF NOT EXISTS \"Payment_status_createdAt_idx\" ON \"Payment\"(\"status\", \"createdAt\");",
  "CREATE INDEX IF NOT EXISTS \"DeliveryLog_paymentId_idx\" ON \"DeliveryLog\"(\"paymentId\");",
  "CREATE INDEX IF NOT EXISTS \"DeliveryLog_createdAt_idx\" ON \"DeliveryLog\"(\"createdAt\");",
];

/**
 * Execute the bootstrap statements. Idempotent; call before the first query
 * on any SQLite connection (data layer and seed script share this helper).
 */
export async function bootstrapSqliteSchema(client: {
  $executeRawUnsafe: (query: string) => Promise<number>;
}): Promise<void> {
  for (const statement of SQLITE_BOOTSTRAP) {
    await client.$executeRawUnsafe(statement);
  }
}
