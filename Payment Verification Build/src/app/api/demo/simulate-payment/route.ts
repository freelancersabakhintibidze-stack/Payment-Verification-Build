import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isDemo } from "@/lib/env";
import { simulatePaymentSchema, formatZodError } from "@/lib/validation";
import { clientIp, hit, rateLimitHeaders } from "@/lib/rate-limit";
import { serializePayment } from "@/lib/serialize";
import type { PaymentStatus } from "@/lib/status";

export const dynamic = "force-dynamic";

/**
 * POST /api/demo/simulate-payment  { orderId }
 *
 * DEMO_MODE only. Marks an invoice as "paid" by a simulated sender so the
 * verification engine can walk it through the real state machine. All
 * simulated artifacts carry the DEMO- prefix and simulated=true.
 */
export async function POST(req: Request) {
  if (!isDemo()) {
    return NextResponse.json(
      {
        error:
          "Simulation is disabled. Enable DEMO_MODE=true to run the demo loop.",
      },
      { status: 403 },
    );
  }

  const ip = clientIp(req);
  const limit = hit(`demo:simulate:${ip}`, 6, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many simulations. Wait a moment." },
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

  const parsed = simulatePaymentSchema.safeParse(body);
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
  if (status !== "PENDING") {
    return NextResponse.json(
      { error: `Only PENDING invoices can be simulated. Current: ${status}.` },
      { status: 409 },
    );
  }

  const updated = await db.payment.update({
    where: { orderId: payment.orderId },
    data: { simulated: true },
  });

  return NextResponse.json(
    { payment: serializePayment(updated), simulated: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
