import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dashboardQuerySchema, formatZodError } from "@/lib/validation";
import { clientIp, hit, rateLimitHeaders } from "@/lib/rate-limit";
import { serializePayment, type PublicPayment } from "@/lib/serialize";
import { toCSV, type CsvColumn } from "@/lib/csv";
import { fileStamp, formatDateTime } from "@/lib/format";
import { SETTLED_STATUSES } from "@/lib/status";

export const dynamic = "force-dynamic";

/**
 * GET /api/dashboard/payments
 *
 * Filtered, paginated payment feed plus revenue summary in one call so the
 * dashboard can poll a single endpoint. `csv=1` streams an export instead.
 */
export async function GET(req: Request) {
  const ip = clientIp(req);
  const limit = hit(`dashboard:${ip}`, 120, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: rateLimitHeaders(limit) },
    );
  }

  const url = new URL(req.url);
  const raw = Object.fromEntries(url.searchParams.entries());
  const parsed = dashboardQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: `Invalid query. ${formatZodError(parsed.error)}` },
      { status: 400 },
    );
  }

  const { status, range, min, max, q, page, pageSize, csv } = parsed.data;

  const where = {
    ...(status ? { status } : {}),
    ...(range !== "all"
      ? {
          createdAt: {
            gte: new Date(
              Date.now() -
                (range === "24h" ? 1 : range === "7d" ? 7 : 30) * 86_400_000,
            ),
          },
        }
      : {}),
    ...(min !== undefined || max !== undefined
      ? {
          amount: {
            ...(min !== undefined ? { gte: min } : {}),
            ...(max !== undefined ? { lte: max } : {}),
          },
        }
      : {}),
    ...(q
      ? {
          OR: [
            { orderId: { contains: q } },
            { txHash: { contains: q } },
            { senderWallet: { contains: q } },
          ],
        }
      : {}),
  };

  const [total, payments] = await Promise.all([
    db.payment.count({ where }),
    db.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: csv ? 0 : (page - 1) * pageSize,
      take: csv ? 1000 : pageSize,
    }),
  ]);

  if (csv) {
    const columns: CsvColumn<PublicPayment>[] = [
      { header: "orderId", value: (p) => p.orderId },
      { header: "amount", value: (p) => p.amount },
      { header: "asset", value: (p) => p.asset },
      { header: "status", value: (p) => p.status },
      { header: "txHash", value: (p) => p.txHash ?? "" },
      { header: "senderWallet", value: (p) => p.senderWallet },
      { header: "simulated", value: (p) => (p.simulated ? "yes" : "no") },
      { header: "createdAt", value: (p) => formatDateTime(p.createdAt) },
      { header: "verifiedAt", value: (p) => formatDateTime(p.verifiedAt) },
      { header: "deliveredAt", value: (p) => formatDateTime(p.deliveredAt) },
      { header: "expiresAt", value: (p) => formatDateTime(p.expiresAt) },
    ];
    const body = toCSV(payments.map(serializePayment), columns);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="aether-payments-${fileStamp()}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  // Revenue summary across the whole ledger (independent of table filters
  // so merchants always see true totals while narrowing the table)
  const [
    settledAgg,
    pendingCount,
    confirmingCount,
    failedCount,
    deliveredCount,
    volume24hAgg,
  ] = await Promise.all([
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

  return NextResponse.json(
    {
      payments: payments.map(serializePayment),
      total,
      page,
      pageSize,
      summary: {
        volumeTotal: Number(settledAgg._sum.amount ?? 0),
        settledCount: settledAgg._count._all,
        pendingCount,
        confirmingCount,
        failedCount,
        deliveredCount,
        volume24h: Number(volume24hAgg._sum.amount ?? 0),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
