# AETHER ARENA

**Solana payment verification, auto-delivery, and a merchant dashboard.**
Watch the chain. Verify the payment. Ship the order.

Aether Arena turns Solana transfers into settled orders. The engine watches
a merchant wallet, matches transactions by memo and exact amount, waits for
network finality, marks the order verified, and fires auto-delivery with
signed webhooks and Telegram notifications. A live ledger gives the merchant
filters, CSV export, and revenue figures that only settle on on-chain proof.

```
Next.js 16 App Router · TypeScript 5 · Prisma 6 · PostgreSQL
@solana/web3.js 1.98 · Tailwind CSS 4 · Zod 4 · Vercel Cron
```

---


## Judging map

Criterion → feature → demo click → source file: see [`JUDGING.md`](./JUDGING.md) and the live page at `/judging`.

## Tests

```bash
npm test   # Vitest: amount window, lamports math, delivery retry backoff
```

## The state machine

Every order walks the same five states, enforced in `src/lib/verify-engine.ts`:

```
PENDING ──tx found, unconfirmed──> CONFIRMING ──finalized──> VERIFIED ──> DELIVERED
   │                                                        │
   └──────window expired (30 min default)──────> FAILED <───┘ (delivery retries exhausted)
```

## How matching works

Every invoice combines three signals so two identical amounts never collide:

1. **Recipient**: the merchant wallet.
2. **Memo**: the order id itself (`ORD-…`), embedded in the invoice and read
   from parsed memo instructions.
3. **Amount**: the invoiced amount plus a unique offset in the ninth decimal
   (sub-lampert, far below rounding). A transaction matches when the memo
   contains the order id **and** the received amount is at least the invoice.
   If a wallet drops the memo, the unique amount alone can match within a
   tight acceptance window (received must be within 5% above the invoice).

Native SOL matching uses balance deltas from `meta.preBalances` /
`meta.postBalances`. SPL token matching uses pre/post token balance deltas
for token accounts owned by the merchant, restricted to the expected mint.

## Quickstart

### Option A · PostgreSQL with Docker (production path)

```bash
cp .env.example .env          # fill values (DEMO_MODE=true works out of the box)
docker compose up -d          # starts postgres on :5432
npm install
npx prisma db push            # create tables in postgres
npm run seed                  # optional: realistic demo history
npm run dev
```

### Option B · Zero setup (fastest demo)

```bash
npm install
npm run seed   # optional
npm run dev
```

No `.env` needed: without `DATABASE_URL` the app runs in zero-configuration
mode on a local SQLite database (`./db/aether-arena.db`), creating its tables
automatically on first use. Everything works — invoices, the state machine,
the dashboard — in clearly-labeled demo mode. Point `DATABASE_URL` at
PostgreSQL whenever you want persistent storage.

Open `http://localhost:3000`. The landing page demo creates real invoices
against the real API; with `DEMO_MODE=true` the sender, confirmations, and
notifications are simulated and always labeled `DEMO-` / `Simulated`.

### Going live

1. Set `MERCHANT_WALLET` to your Solana address and `DEMO_MODE=false`.
2. Point `SOLANA_RPC_URL` at a paid RPC endpoint (public mainnet rate limits
   aggressively and will miss scans under load).
3. Optional: Telegram (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`) and/or a
   signed delivery webhook (`DELIVERY_WEBHOOK_URL`, `WEBHOOK_SECRET`).
4. Set `CRON_SECRET` so the sweep endpoint authenticates, and deploy with
   `vercel.json` (a daily cron hits the sweep; Hobby plans only allow daily crons), or call
   `GET /api/cron/verify-pending` from any scheduler every 2 minutes (e.g. cron-job.org on the Hobby plan):

   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" https://your-host/api/cron/verify-pending
   ```

### Deploy to Vercel

The build is environment-safe: `next build` collects page data and prerenders
without runtime secrets, so a missing `DATABASE_URL` on the build machine can
never break the deployment. The environment contract is enforced lazily on
first use at runtime, where a missing or malformed variable still fails fast
with a readable message instead of failing silently later.

**Zero-configuration deploy (demo mode).** Push this folder to a Git
repository, import it in Vercel, press Deploy. That is the whole process: no
environment variables are required. The app starts in clearly-labeled demo
mode on an ephemeral SQLite database with tables created automatically, the
landing demo works, and the cron sweep runs. Data is per-instance and resets
on cold start — upgrade to the persistent setup below when you want real
payments.

**Persistent / live deploy.** Same import, then:

1. Create a Postgres database (Vercel Postgres, Neon, or Supabase) and create
   the tables once against the production URL:

   ```bash
   DATABASE_URL="postgres://..." npx prisma db push
   ```

2. In Project -> Settings -> Environment Variables, add:

   | Variable | Required | Notes |
   | --- | --- | --- |
   | `DATABASE_URL` | yes | Postgres connection string |
   | `CRON_SECRET` | for cron | Vercel sends it as the sweep bearer token |
   | `DEMO_MODE` | for live | unset/`true` simulates; set `false` for real payments |
   | `MERCHANT_WALLET` | for live | your Solana address; required when `DEMO_MODE=false` |
   | `SOLANA_RPC_URL` | recommended | paid endpoint (Helius, QuickNode) for real traffic |
   | `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | optional | Telegram delivery notifications |
   | `DELIVERY_WEBHOOK_URL` / `WEBHOOK_SECRET` | optional | signed webhook delivery |
   | `NEXT_PUBLIC_APP_URL` | optional | absolute payment links in responses |

3. Deploy. Prisma client generation runs automatically on install
   (`postinstall`, both schemas), and the cron sweep starts with the
   deployment. Note: the
   Hobby plan caps Vercel Cron at one run per day — upgrade to Pro for the
   shipped `*/2` schedule, or call `GET /api/cron/verify-pending` from any
   external scheduler every 2 minutes with the bearer token.

## API

| Method | Route | Auth | Responsibility |
| ------ | ----- | ---- | -------------- |
| POST | `/api/payment/create` | rate limited (10/min/IP) | Write an invoice; returns order, payment link, Solana Pay URL, and QR SVG |
| GET | `/api/payment/[orderId]` | rate limited (120/min/IP) | Public status projection for pollers and receipts |
| POST | `/api/payment/verify` | rate limited (30/min/IP) | Run the matching pipeline for one order; idempotent |
| POST | `/api/delivery/trigger` | rate limited (10/min/IP) | Execute or retry auto-delivery; per-channel audit rows |
| GET | `/api/cron/verify-pending` | `Authorization: Bearer $CRON_SECRET` | Sweep: verify stale invoices, expire old ones, retry deliveries |
| GET | `/api/dashboard/payments` | rate limited | Filtered feed + revenue summary; `?csv=1` streams an export |
| POST | `/api/demo/simulate-payment` | demo mode only (6/min/IP) | Fake a sender payment; rejected outside demo mode |

Example:

```bash
curl -X POST http://localhost:3000/api/payment/create \
  -H "Content-Type: application/json" \
  -d '{"amount": 0.75, "expiresInMinutes": 30}'
```

## The two-minute sweep

Each run (`src/app/api/cron/verify-pending/route.ts`):

1. Re-verifies `PENDING` invoices older than 5 minutes and everything in
   `CONFIRMING` (max 50 per run, oldest first).
2. Marks `PENDING` invoices past `expiresAt` as `FAILED`.
3. Re-runs delivery for `VERIFIED` orders that are not delivered yet.
   `runDelivery` enforces its own backoff: attempts at 0s, +60s, +300s,
   then it stops and asks for manual retry.

## Security measures

- **Schema validation**: Zod parses every body and query before handlers run.
- **Rate limiting**: per-IP sliding windows on all write endpoints, with
  `X-RateLimit-*` and `Retry-After` headers. In-process by default; swap
  `src/lib/rate-limit.ts` for Redis when you scale past one instance.
- **Cron authentication**: bearer secret compared in constant time when
  `CRON_SECRET` is set; without it (zero-config mode) the sweep is public but
  rate-limited per IP.
- **Signed webhooks**: `X-Aether-Signature` is an HMAC-SHA256 over the raw
  body keyed with `WEBHOOK_SECRET` (`src/lib/webhook.ts`).
- **Environment contract**: Zod-validated env at boot; degraded capabilities
  are disclosed, never silent.
- **Honest demo mode**: simulated money only exists with `DEMO_MODE=true`,
  always carries the `DEMO-` prefix and a `simulated` flag.

## Project structure

```
src/
  app/
    api/payment/create/route.ts        POST   invoice creation
    api/payment/[orderId]/route.ts     GET    public status
    api/payment/verify/route.ts        POST   verification pipeline
    api/delivery/trigger/route.ts      POST   auto-delivery
    api/cron/verify-pending/route.ts   GET    scheduled sweep
    api/dashboard/payments/route.ts    GET    feed + summary + CSV
    api/demo/simulate-payment/route.ts POST   demo sender
    dashboard/page.tsx                 merchant ledger
    pay/[orderId]/page.tsx             public receipt + QR
    terms/ , privacy/                  legal pages
    page.tsx                           landing (hero, loop, live demo,
                                       architecture, stack, security, FAQ)
  lib/
    env.ts         Zod environment contract
    db.ts          Prisma singleton
    solana.ts      RPC engine: signature scan, memo + amount matching
    verify-engine.ts  PENDING -> CONFIRMING -> VERIFIED state machine
    delivery.ts    auto-delivery with retry and audit log
    telegram.ts    Bot API sender
    webhook.ts     HMAC signing + constant-time comparisons
    qr.ts          Solana Pay URL + QR SVG
    rate-limit.ts  sliding windows
    validation.ts  Zod schemas
    serialize.ts   public-safe projections
    csv.ts         RFC 4180 writer
    status.ts      status vocabulary shared client/server
  components/      PaymentTable, StatusBadge, RevenueCard, DashboardClient,
                   PayClient, DemoLoop, SkeletonRows, CopyButton, landing/, site/
prisma/
  schema.postgres.prisma   primary schema (enum Status)
  schema.sqlite.prisma     zero-setup variant
scripts/seed.ts            realistic demo history
```

## Design system

The interface is an editorial ledger: warm paper (`#F4F3EF`), printer's ink
(`#262521`), ledger red (`#C00000`), hairline rules, and register marks.
Zero rounded corners and zero drop shadows are enforced globally.
Type is Fraunces (variable serif, vendored locally in `src/fonts`) for
display and body, IBM Plex Mono for labels, figures, and anything
machine-verbatim. Dark mode flips the tokens through `next-themes`;
`prefers-reduced-motion` is respected; focus states and a skip link are built in.

## Scripts

| Command | What it does |
| ------- | ------------ |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run db:push` | Push the primary (PostgreSQL) schema |
| `npm run db:push:sqlite` | Push the SQLite variant |
| `npm run db:generate:sqlite` | Generate the client from the SQLite variant |
| `npm run seed` | Seed a realistic, clearly-labeled demo history |

## Honest limits

- The rate limiter is in-process; run one instance or bring Redis.
- Solana Pay deep links open the payer's wallet app; wallet support for the
  `solana:` scheme with memo/amount is broad but not uniform.
- Public RPC endpoints throttle aggressively; use a paid endpoint for real
  volume and keep `REQUIRE_MEMO=true` on busy wallets.
- Nothing in this repository takes custody of funds. The merchant wallet
  receives payments directly.
- Zero-configuration mode runs on an ephemeral SQLite database (Vercel:
  `/tmp`, locally: `./db`): each server instance holds its own copy and data
  resets on cold start. Real, persistent payments require `DATABASE_URL`.
