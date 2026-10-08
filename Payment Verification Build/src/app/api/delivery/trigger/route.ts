import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runDelivery } from "@/lib/delivery";
import { deliveryTriggerSchema, formatZodError } from "@/lib/validation";
import { clientIp, hit, rateLimitHeaders } from "@/lib/rate-limit";
import { serializePayment } from "@/lib/serialize";
import type { PaymentStatus } from "@/lib/status";

export const dynamic = "force-dynamic";

/**
 * POST /api/delivery/trigger  { orderId }
 *
 * Executes (or retries) auto-delivery for a VERIFIED payment: marks the
 * order DELIVERED, sends Telegram/webhook notifications, and records one
 * DeliveryLog row per channel per attempt.
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  const limit = hit(`delivery:trigger:${ip}`, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many delivery attempts." },
      { status: 429, headers: rateLimitHeaders(limit) },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsed = deliveryTriggerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: `Validation failed. ${formatZodError(parsed.error)}` },
      { status: 400 },
    );
  }

  const payment = await db.payment.findUnique({
    where: { orderId: parsed.data.orderId },
  });
  if (!payment) {
    return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  }

  const status = payment.status as PaymentStatus;
  if (status !== "VERIFIED" && status !== "DELIVERED") {
    return NextResponse.json(
      {
        error: `Delivery requires VERIFIED status. Current status: ${status}.`,
      },
      { status: 409 },
    );
  }

  const result = await runDelivery(payment.id);
  const fresh = await db.payment.findUniqueOrThrow({
    where: { orderId: parsed.data.orderId },
  });

  return NextResponse.json(
    { delivery: result, payment: serializePayment(fresh) },
    { status: result.ok ? 200 : 500, headers: { "Cache-Control": "no-store" } },
  );
}
