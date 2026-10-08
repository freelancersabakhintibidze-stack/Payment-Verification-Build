# Judging map — Aether Arena

One-page map of Colosseum / Superteam judging criteria to concrete features in this repo. Factual only.

Criteria source: Colosseum founder-first scoring (Founder–market fit, Unique insight, Execution quality, Market size, Communication, Business model, Traction) as published across Superteam regional tracks and Colosseum materials.

| Criterion | Feature that answers it | Where to click in the demo | File path that proves it |
|---|---|---|---|
| **Founder–market fit** | Merchant payment verification + auto-delivery for Solana native/SPL transfers; problem is missed or delayed settlement for digital goods sellers | Landing → Demo section → Create invoice | `src/lib/verify-engine.ts`, `src/lib/delivery.ts`, `README.md` |
| **Unique insight** | Triple-signal matching (recipient + order-id memo + unique amount window) so identical amounts never collide; amount-only fallback within 5% when memo is dropped | Pay page after creating an invoice; status poll shows match mode | `src/lib/solana.ts` (`findMatchingTransaction`, `extractMemo`, `nativeDelta` / `splReceived`), `src/lib/verify-engine.ts` (`AMOUNT_WINDOW`) |
| **Execution quality** | Live public URL path: Next.js App Router, real RPC path + labeled simulation fallback, Vercel Cron sweep, idempotent verify, delivery retry with backoff and DeliveryLog audit | `/` → create invoice → `/pay/[orderId]` → `/dashboard` | `src/app/api/payment/*`, `src/app/api/cron/verify-pending/route.ts`, `vercel.json`, `next.config.ts` |
| **Market size** | Any merchant receiving SOL or SPL who needs automated fulfillment after on-chain proof; dashboard shows settled volume and pending queue | `/dashboard` revenue cards and filters | `src/components/DashboardClient.tsx`, `src/app/api/dashboard/payments/route.ts` |
| **Communication** | One-liner on landing; state machine documented; `/judging` and this file map criteria to clicks and code | `/`, `/judging`, README top section | `src/app/page.tsx`, `src/components/landing/Hero.tsx`, `JUDGING.md`, `src/app/judging/page.tsx` |
| **Business model** | Infrastructure for merchants: verify → deliver → ledger; channels are Telegram + signed webhook; no tokenomics required | Delivery runs after VERIFIED; webhook/Telegram optional via env | `src/lib/delivery.ts`, `src/lib/webhook.ts`, `src/lib/telegram.ts`, `.env.example` |
| **Traction** | Demo mode creates real invoices against the real API with simulated chain labeled `DEMO-` / Simulated; seed script for ledger history; zero-config SQLite so judges can run without secrets | Landing demo loop; `npm run seed`; dashboard after seed | `src/app/api/demo/simulate-payment/route.ts`, `scripts/seed.ts`, `src/lib/sqlite-bootstrap.ts`, `src/lib/env.ts` |

## Demo path (3 clicks)

1. Open `/` → use the on-page demo to create an invoice (or `POST /api/payment/create`).
2. Open `/pay/[orderId]` → watch status poll PENDING → CONFIRMING → VERIFIED → DELIVERED (DEMO_MODE labels simulation).
3. Open `/dashboard` → filter statuses, export CSV, see settled volume and action queue (pending/confirming/verified awaiting delivery).

## State machine (enforced)

```
PENDING → CONFIRMING → VERIFIED → DELIVERED
    └──────────────→ FAILED (window expired / delivery exhausted)
```

Implemented in `src/lib/verify-engine.ts` and `src/lib/delivery.ts`.
