/**
 * Seed the ledger with a realistic, clearly-labeled demo history.
 * Run: bun run scripts/seed.ts
 */
import { PrismaClient as PostgresClient } from "@prisma/client";
import { PrismaClient as SqliteClient } from "aether-prisma-sqlite";
import { bootstrapSqliteSchema } from "../src/lib/sqlite-bootstrap";
import { databaseUrl, isSqliteDatabase } from "../src/lib/env";

// The SQLite and PostgreSQL clients share an identical model surface for this
// schema, so the SQLite client provides the canonical type.
type SeedDb = SqliteClient;

function makeDb(): SeedDb {
  const { url, fallback } = databaseUrl();
  if (!isSqliteDatabase()) {
    return new PostgresClient() as unknown as SeedDb;
  }
  return fallback
    ? (new SqliteClient({ datasourceUrl: url }) as unknown as SeedDb)
    : (new SqliteClient() as unknown as SeedDb);
}

const db = makeDb();

const MERCHANT = "5PPZPeRh5VpuCq9HYPvTguoJk3WTTW6XLD2f2vsTs7wk";

type SeedStatus = "PENDING" | "CONFIRMING" | "VERIFIED" | "FAILED" | "DELIVERED";

function demoSig(): string {
  const A = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let s = "DEMO";
  for (let i = 0; i < 40; i += 1) s += A[Math.floor(Math.random() * A.length)];
  return s;
}

function orderId(i: number): string {
  const stamp = (Date.now() - i * 3_600_000).toString(36).toUpperCase();
  return `ORD-${stamp}-DEMO00${i}`;
}

async function main() {
  await ensureTables();
  await db.deliveryLog.deleteMany();
  await db.payment.deleteMany();

  const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);
  const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000);
  const expires = (m: number) => new Date(Date.now() + m * 60_000);

  const rows: {
    orderId: string;
    amount: number;
    status: SeedStatus;
    simulated: boolean;
    txHash?: string;
    createdAt: Date;
    verifiedAt?: Date;
    deliveredAt?: Date;
    deliveredTo?: string;
    expiresAt: Date;
    senderWallet: string;
  }[] = [
    // Settled + delivered history
    {
      orderId: orderId(1),
      amount: 1.250000412,
      status: "DELIVERED",
      simulated: true,
      txHash: demoSig(),
      createdAt: minutesAgo(52),
      verifiedAt: minutesAgo(51),
      deliveredAt: minutesAgo(51),
      deliveredTo: "in-app",
      expiresAt: minutesAgo(22),
      senderWallet: "8Kx9LmQpVt3nJ4cWdYeFgHbR2sTuVwXyZ6aBcDeFgHiJ",
    },
    {
      orderId: orderId(2),
      amount: 0.480000775,
      status: "DELIVERED",
      simulated: true,
      txHash: demoSig(),
      createdAt: minutesAgo(127),
      verifiedAt: minutesAgo(126),
      deliveredAt: minutesAgo(126),
      deliveredTo: "in-app",
      expiresAt: minutesAgo(97),
      senderWallet: "FgHiJ8Kx9LmQpVt3nJ4cWdYe2sTuVwXyZ6aBcDe",
    },
    {
      orderId: orderId(3),
      amount: 2.100000239,
      status: "DELIVERED",
      simulated: true,
      txHash: demoSig(),
      createdAt: daysAgo(2),
      verifiedAt: daysAgo(2),
      deliveredAt: daysAgo(2),
      deliveredTo: "in-app",
      expiresAt: daysAgo(2),
      senderWallet: "",
    },
    {
      orderId: orderId(4),
      amount: 0.900000156,
      status: "DELIVERED",
      simulated: true,
      txHash: demoSig(),
      createdAt: daysAgo(9),
      verifiedAt: daysAgo(9),
      deliveredAt: daysAgo(9),
      deliveredTo: "in-app",
      expiresAt: daysAgo(9),
      senderWallet: "",
    },
    // Verified, delivery still queued (cron will retry it)
    {
      orderId: orderId(5),
      amount: 3.500000834,
      status: "VERIFIED",
      simulated: true,
      txHash: demoSig(),
      createdAt: minutesAgo(9),
      verifiedAt: minutesAgo(8),
      expiresAt: expires(21),
      senderWallet: "9LmQpVt3nJ4cWdYeFgHiJ8Kx2sTuVwXyZ6aBcDe",
    },
    // In flight
    {
      orderId: orderId(6),
      amount: 0.750000919,
      status: "CONFIRMING",
      simulated: true,
      txHash: demoSig(),
      createdAt: minutesAgo(2),
      expiresAt: expires(28),
      senderWallet: "Vt3nJ4cWdYeFgHiJ8Kx9LmQp2sTuVwXyZ6aBcDe",
    },
    {
      orderId: orderId(7),
      amount: 0.300000247,
      status: "PENDING",
      simulated: false,
      createdAt: minutesAgo(1),
      expiresAt: expires(29),
      senderWallet: "",
    },
    // Failed history
    {
      orderId: orderId(8),
      amount: 5.000000111,
      status: "FAILED",
      simulated: false,
      createdAt: daysAgo(1),
      expiresAt: daysAgo(1),
      senderWallet: "",
    },
    {
      orderId: orderId(9),
      amount: 0.600000538,
      status: "FAILED",
      simulated: false,
      createdAt: daysAgo(4),
      expiresAt: daysAgo(4),
      senderWallet: "",
    },
  ];

  for (const row of rows) {
    await db.payment.create({
      data: {
        orderId: row.orderId,
        amount: row.amount,
        senderWallet: row.senderWallet,
        txHash: row.txHash ?? null,
        status: row.status,
        verifiedAt: row.verifiedAt ?? null,
        deliveredAt: row.deliveredAt ?? null,
        deliveredTo: row.deliveredTo ?? null,
        paymentAddress: MERCHANT,
        memo: row.orderId,
        simulated: row.simulated,
        expiresAt: row.expiresAt,
        createdAt: row.createdAt,
        lastCheckedAt: row.createdAt,
        checks: row.status === "PENDING" ? 0 : 2,
      },
    });
  }

  // Delivery audit trail for the settled orders
  const delivered = await db.payment.findMany({
    where: { status: "DELIVERED" },
  });
  for (const p of delivered) {
    await db.deliveryLog.create({
      data: {
        paymentId: p.id,
        attempt: 1,
        channel: "telegram",
        status: "SKIPPED",
        detail: "Telegram not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID).",
        createdAt: p.deliveredAt ?? p.createdAt,
      },
    });
    await db.deliveryLog.create({
      data: {
        paymentId: p.id,
        attempt: 1,
        channel: "webhook",
        status: "SKIPPED",
        detail: "DELIVERY_WEBHOOK_URL not configured.",
        createdAt: p.deliveredAt ?? p.createdAt,
      },
    });
  }

  const count = await db.payment.count();
  console.log(`Seeded ${count} payments with delivery audit trail.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

async function ensureTables(): Promise<void> {
  if (isSqliteDatabase()) {
    await bootstrapSqliteSchema(db);
  }
}
