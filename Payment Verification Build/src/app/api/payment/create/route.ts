import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isDemo, merchantWallet, env, getEnvWarnings } from "@/lib/env";
import { createPaymentSchema, formatZodError } from "@/lib/validation";
import { clientIp, hit, rateLimitHeaders } from "@/lib/rate-limit";
import { solanaPayUrl, qrSvg } from "@/lib/qr";
import { serializePayment } from "@/lib/serialize";

export const dynamic = "force-dynamic";

/**
 * POST /api/payment/create
 *
 * Creates a PENDING payment intent. The invoice is made uniquely matchable
 * by combining the merchant address, a memo equal to the orderId, and a
 * sub-lamport unique amount offset.
 */
const UNIQUE_OFFSET_MAX = 999;

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limit = hit(`payment:create:${ip}`, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Slow down." },
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

  const parsed = createPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: `Validation failed. ${formatZodError(parsed.error)}` },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const asset = input.asset;
  const mint = input.mint ? input.mint : null;

  // Unique-amount strategy: add a random offset in the 9th decimal so two
  // identical invoices never collide on-chain.
  const offsetUnits = randomBytes(2).readUInt16BE(0) % (UNIQUE_OFFSET_MAX + 1);
  const amount =
    asset === "SOL" && !mint
      ? Number((input.amount + offsetUnits * 1e-9).toFixed(9))
      : input.amount;

  const orderId = generateOrderId();
  const memo = orderId;
  const expiresAt = new Date(Date.now() + input.expiresInMinutes * 60_000);

  try {
    const payment = await db.payment.create({
      data: {
        orderId,
        amount,
        senderWallet: input.senderWallet ?? "",
        status: "PENDING",
        paymentAddress: merchantWallet(),
        memo,
        asset,
        mint,
        expiresAt,
      },
    });

    const payPath = `/pay/${payment.orderId}`;
    const base = (env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
    const solanaUrl = solanaPayUrl({
      recipient: payment.paymentAddress,
      amount: Number(payment.amount),
      memo,
      mint,
      label: "Aether Arena",
      message: orderId,
    });
    const qr = await qrSvg(solanaUrl);
    const envWarnings = getEnvWarnings();

    return NextResponse.json(
      {
        payment: serializePayment(payment),
        payUrl: payPath,
        payUrlAbsolute: base ? `${base}${payPath}` : null,
        solanaPayUrl: solanaUrl,
        qrSvg: qr,
        demo: isDemo(),
        warnings: envWarnings.length ? envWarnings : undefined,
      },
      { status: 201 },
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error.";
    return NextResponse.json(
      { error: `Could not create payment. ${detail}` },
      { status: 500 },
    );
  }
}

function generateOrderId(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = randomBytes(4).toString("hex").toUpperCase();
  return `ORD-${stamp}-${rand}`;
}
