import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Judging map",
  description:
    "Criterion → feature → demo click → source file for Aether Arena Colosseum submission.",
};

const ROWS: {
  criterion: string;
  feature: string;
  demo: string;
  path: string;
}[] = [
  {
    criterion: "Founder–market fit",
    feature:
      "Merchant payment verification and auto-delivery for Solana native/SPL transfers; addresses delayed settlement for digital goods.",
    demo: "Landing → Demo → Create invoice",
    path: "src/lib/verify-engine.ts, src/lib/delivery.ts",
  },
  {
    criterion: "Unique insight",
    feature:
      "Triple-signal match: recipient + order-id memo + unique amount window (5% acceptance when memo absent).",
    demo: "Pay page status poll shows match mode (memo | amount)",
    path: "src/lib/solana.ts, src/lib/verify-engine.ts",
  },
  {
    criterion: "Execution quality",
    feature:
      "App Router APIs, real RPC + labeled DEMO simulation, Vercel Cron sweep, idempotent verify, delivery retry + DeliveryLog.",
    demo: "/ → /pay/[orderId] → /dashboard",
    path: "src/app/api/*, vercel.json, next.config.ts",
  },
  {
    criterion: "Market size",
    feature:
      "Any merchant receiving SOL/SPL who needs automated fulfillment after on-chain proof; ledger shows settled volume.",
    demo: "/dashboard revenue cards and status filters",
    path: "src/components/DashboardClient.tsx",
  },
  {
    criterion: "Communication",
    feature:
      "Landing one-liner, documented state machine, this page and JUDGING.md map criteria to code.",
    demo: "/, /judging, README",
    path: "src/app/judging/page.tsx, JUDGING.md",
  },
  {
    criterion: "Business model",
    feature:
      "Verify → deliver → ledger infrastructure; Telegram + signed webhook channels; no tokenomics required.",
    demo: "After VERIFIED, delivery runs; optional env channels",
    path: "src/lib/delivery.ts, src/lib/webhook.ts, .env.example",
  },
  {
    criterion: "Traction",
    feature:
      "Demo mode creates real invoices via real API with simulated chain labeled DEMO-; seed history; zero-config SQLite.",
    demo: "Landing demo loop; npm run seed; dashboard",
    path: "src/app/api/demo/simulate-payment/route.ts, scripts/seed.ts",
  },
];

export default function JudgingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <p className="label text-muted mb-2">Colosseum submission</p>
      <h1 className="font-display text-3xl sm:text-4xl mb-3">Judging map</h1>
      <p className="text-secondary max-w-2xl mb-8">
        Factual mapping of Colosseum founder-first criteria to features in this
        repository. Full table also lives in{" "}
        <code className="font-mono text-sm">JUDGING.md</code> at the repo root.
      </p>

      <div className="frame overflow-x-auto mb-10">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-muted font-mono text-[0.65rem] uppercase tracking-[0.12em]">
              <th className="p-3">Criterion</th>
              <th className="p-3">Feature</th>
              <th className="p-3">Demo click</th>
              <th className="p-3">Source</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.criterion} className="border-b border-line last:border-0 align-top">
                <td className="p-3 font-medium whitespace-nowrap">{row.criterion}</td>
                <td className="p-3 text-secondary">{row.feature}</td>
                <td className="p-3 font-mono text-[0.75rem]">{row.demo}</td>
                <td className="p-3 font-mono text-[0.7rem] text-muted">{row.path}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="font-display text-xl mb-3">Three-click demo</h2>
      <ol className="list-decimal pl-5 space-y-2 text-secondary mb-8">
        <li>
          <Link href="/" className="underline underline-offset-2">
            Home
          </Link>{" "}
          — create an invoice via the landing demo (or API).
        </li>
        <li>
          <code className="font-mono text-sm">/pay/[orderId]</code> — watch
          PENDING → CONFIRMING → VERIFIED → DELIVERED (simulation labeled when
          DEMO_MODE is on).
        </li>
        <li>
          <Link href="/dashboard" className="underline underline-offset-2">
            Dashboard
          </Link>{" "}
          — filter statuses, CSV export, settled volume.
        </li>
      </ol>

      <p className="text-muted text-sm">
        State machine: PENDING → CONFIRMING → VERIFIED → DELIVERED (or FAILED).
        Enforced in{" "}
        <code className="font-mono text-xs">src/lib/verify-engine.ts</code>.
      </p>
    </div>
  );
}
