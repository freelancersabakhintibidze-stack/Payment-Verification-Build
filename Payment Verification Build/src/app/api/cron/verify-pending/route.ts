import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { safeEqual } from "@/lib/webhook";
import { verifyPayment } from "@/lib/verify-engine";
import { runDelivery } from "@/lib/delivery";
import { clientIp, hit, rateLimitHeaders } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/verify-pending
 *
 * Scheduled by Vercel Cron once a day (see vercel.json). Hobby plans only allow
 * daily crons; on Pro you can raise the schedule to every 2 minutes.
 *
 * Auth: when CRON_SECRET is set, requests must carry
 * `Authorization: Bearer ${CRON_SECRET}`, which Vercel injects automatically.
 * When CRON_SECRET is not configured (zero-configuration mode), Vercel Cron
 * sends no header at all, so the sweep stays reachable and is protected by
 * per-IP rate limiting instead.
 *
 * Sweep:
 *   1. PENDING invoices older than 5 minutes: run the verification pipeline.
 *   2. CONFIRMING invoices: re-check confirmation depth.
 *   3. PENDING invoices past expiresAt: mark FAILED.
 *   4. VERIFIED invoices without delivery: run delivery with backoff.
 */
export async function GET(req: Request) {
  if (env.CRON_SECRET) {
    const auth = req.headers.get("authorization") ?? "";
    const expected = `Bearer ${env.CRON_SECRET}`;
    if (!safeEqual(auth, expected)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  } else {
    const ip = clientIp(req);
    const limit = hit(`cron:sweep:${ip}`, 6, 60_000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many sweep requests." },
        { status: 429, headers: rateLimitHeaders(limit) },
      );
    }
  }

  const summary = {
    checked: 0,
    confirmed: 0,
    verified: 0,
    failed: 0,
    delivered: 0,
    errors: [] as { orderId: string; detail: string }[],
  };

  const now = Date.now();
  const fiveMinutesAgo = new Date(now - 5 * 60_000);

  try {
    // 1 + 2: stale PENDING and everything CONFIRMING
    const candidates = await db.payment.findMany({
      where: {
        AND: [
          { status: { in: ["PENDING", "CONFIRMING"] } },
          {
            OR: [
              { status: "CONFIRMING" },
              { createdAt: { lt: fiveMinutesAgo } },
            ],
          },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 50,
    });

    for (const payment of candidates) {
      summary.checked += 1;
      try {
        const outcome = await verifyPayment(payment.id);
        if (
          outcome.transition === "verified" ||
          outcome.transition === "delivered"
        ) {
          summary.verified += 1;
          if (outcome.transition === "delivered") summary.delivered += 1;
        } else if (outcome.transition === "confirming") {
          summary.confirmed += 1;
        } else if (outcome.transition === "failed") {
          summary.failed += 1;
        }
      } catch (error) {
        summary.errors.push({
          orderId: payment.orderId,
          detail: error instanceof Error ? error.message : "Unknown error.",
        });
      }
    }

    // 3: expire invoices whose window passed
    const expired = await db.payment.updateMany({
      where: { status: "PENDING", expiresAt: { lt: new Date() } },
      data: { status: "FAILED" },
    });
    summary.failed += expired.count;

    // 4: retry pending deliveries (runDelivery enforces its own backoff)
    const awaitingDelivery = await db.payment.findMany({
      where: { status: "VERIFIED", deliveredAt: null },
      take: 25,
    });
    for (const payment of awaitingDelivery) {
      summary.checked += 1;
      try {
        const result = await runDelivery(payment.id);
        if (result.status === "DELIVERED") summary.delivered += 1;
      } catch (error) {
        summary.errors.push({
          orderId: payment.orderId,
          detail: error instanceof Error ? error.message : "Unknown error.",
        });
      }
    }

    return NextResponse.json({ ok: true, summary, ranAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Cron sweep failed.",
        summary,
      },
      { status: 500 },
    );
  }
}
