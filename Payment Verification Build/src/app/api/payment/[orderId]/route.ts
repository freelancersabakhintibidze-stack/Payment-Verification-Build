import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orderIdSchema, formatZodError } from "@/lib/validation";
import { clientIp, hit, rateLimitHeaders } from "@/lib/rate-limit";
import { serializePayment } from "@/lib/serialize";
import { isDemo } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * GET /api/payment/[orderId]
 * Public status endpoint for pollers (payment page, receipts, integrations).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const ip = clientIp(req);
  const limit = hit(`payment:status:${ip}`, 120, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: rateLimitHeaders(limit) },
    );
  }

  const { orderId } = await params;
  const parsed = orderIdSchema.safeParse(orderId);
  if (!parsed.success) {
    return NextResponse.json(
      { error: `Invalid orderId. ${formatZodError(parsed.error)}` },
      { status: 400 },
    );
  }

  const payment = await db.payment.findUnique({
    where: { orderId: parsed.data },
  });
  if (!payment) {
    return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  }

  return NextResponse.json(
    { payment: serializePayment(payment), demo: isDemo() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
