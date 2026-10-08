import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/**
 * Outgoing webhook signing: X-Aether-Signature holds the hex HMAC-SHA256 of
 * the raw request body, keyed with WEBHOOK_SECRET. Receivers verify with
 * verifyWebhookSignature below.
 */
export function signPayload(rawBody: string): string | null {
  if (!env.WEBHOOK_SECRET) return null;
  return createHmac("sha256", env.WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
}

export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
): boolean {
  if (!env.WEBHOOK_SECRET) return false;
  const expected = signPayload(rawBody);
  if (!expected) return false;
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Constant-time string comparison for bearer secrets. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
