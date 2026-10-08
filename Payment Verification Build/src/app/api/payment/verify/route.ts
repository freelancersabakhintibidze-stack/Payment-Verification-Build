import { NextResponse } from "next/server";
import { verifyPaymentByOrderId } from "@/lib/verify-engine";
import { verifyPaymentSchema, formatZodError } from "@/lib/validation";
import { clientIp, hit, rateLimitHeaders } from "@/lib/rate-limit";
import { isDemo } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * POST /api/payment/verify  { orderId }
 *
 * Runs the verification pipeline for one invoice: poll the chain, match
 * memo + amount, progress PENDING -> CONFIRMING -> VERIFIED, and trigger
 * auto-delivery on success. Idempotent for terminal states.
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  const limit = hit(`payment:verify:${ip}`, 30, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many verification attempts." },
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

  const parsed = verifyPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: `Validation failed. ${formatZodError(parsed.error)}` },
      { status: 400 },
    );
  }

  try {
    const outcome = await verifyPaymentByOrderId(parsed.data.orderId);
    if (!outcome) {
      return NextResponse.json(
        { error: "Payment not found." },
        { status: 404 },
      );
    }
    return NextResponse.json(outcome, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error.";
    const isRpc = detail.startsWith("Solana RPC unavailable");
    return NextResponse.json(
      {
        error: detail,
        hint: isRpc
          ? isDemo()
            ? "DEMO_MODE is on, but a real invoice hit the RPC path. Create a demo payment or simulate it from the dashboard."
            : "Check SOLANA_RPC_URL and rate limits on the public endpoint."
          : undefined,
      },
      { status: isRpc ? 503 : 500 },
    );
  }
}
