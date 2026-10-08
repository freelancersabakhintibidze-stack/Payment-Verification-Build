import type { Metadata } from "next";
import Link from "next/link";
import DashboardClient from "@/components/DashboardClient";
import { db } from "@/lib/db";
import { serializePayment, type PublicPayment } from "@/lib/serialize";
import { SETTLED_STATUSES } from "@/lib/status";

export const metadata: Metadata = {
  title: "Merchant Dashboard",
  description:
    "Real-time payment ledger: filter by status, date, and amount, export CSV, and watch deliveries land.",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [payments, total, settledAgg, pendingCount, confirmingCount, failedCount, deliveredCount, volume24hAgg] =
    await Promise.all([
      db.payment.findMany({
        orderBy: { createdAt: "desc" },
        take: 25,
      }),
      db.payment.count(),
      db.payment.aggregate({
        where: { status: { in: SETTLED_STATUSES } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      db.payment.count({ where: { status: "PENDING" } }),
      db.payment.count({ where: { status: "CONFIRMING" } }),
      db.payment.count({ where: { status: "FAILED" } }),
      db.payment.count({ where: { status: "DELIVERED" } }),
      db.payment.aggregate({
        where: {
          status: { in: SETTLED_STATUSES },
          verifiedAt: { gte: new Date(Date.now() - 86_400_000) },
        },
        _sum: { amount: true },
      }),
    ]);

  const initialPayments: PublicPayment[] = payments.map(serializePayment);

  return (
    <div className="border-b border-line">
      <div className="shell pb-[clamp(4rem,8vw,7rem)] pt-[clamp(2.5rem,5vw,4rem)]">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6 border-b border-line pb-8">
          <div>
            <p className="label text-secondary">
              <span className="mr-3 inline-block h-1.5 w-1.5 bg-accent" aria-hidden="true" />
              Merchant dashboard
            </p>
            <h1 className="display-lg mt-5 text-inkdeep">The ledger.</h1>
          </div>
          <div className="flex items-center gap-6">
            <p className="label max-w-[16rem] text-muted">
              Live feed, polled every 8 seconds. Figures settle only on
              on-chain proof.
            </p>
            <Link href="/#demo" className="btn-ghost">
              Create a test payment
            </Link>
          </div>
        </div>

        <DashboardClient
          initialPayments={initialPayments}
          initialTotal={total}
          initialSummary={{
            volumeTotal: Number(settledAgg._sum.amount ?? 0),
            settledCount: settledAgg._count._all,
            pendingCount,
            confirmingCount,
            failedCount,
            deliveredCount,
            volume24h: Number(volume24hAgg._sum.amount ?? 0),
          }}
        />
      </div>
    </div>
  );
}
