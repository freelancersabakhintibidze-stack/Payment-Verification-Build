import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { formatSol } from "@/lib/format";
import { sendTelegram, formatPaymentMessage } from "@/lib/telegram";
import { signPayload } from "@/lib/webhook";
import type { PaymentStatus } from "@/lib/status";
import {
  MAX_DELIVERY_ATTEMPTS,
  RETRY_DELAYS_MS,
} from "@/lib/match-math";

export { MAX_DELIVERY_ATTEMPTS, RETRY_DELAYS_MS };

/**
 * Auto-delivery orchestrator.
 *
 * Runs whenever a payment reaches VERIFIED. Marks the order DELIVERED and
 * pushes notifications through every configured channel. All attempts are
 * persisted in DeliveryLog for audit and replay.
 *
 * Retry policy: attempts are allowed at 0s, +60s, +300s. The cron sweep
 * re-invokes runDelivery for VERIFIED payments that are not delivered yet,
 * so failures back off and retry without any manual work.
 */


export type DeliveryResult = {
  ok: boolean;
  status: "DELIVERED" | "RETRY" | "FAILED" | "SKIPPED";
  attemptsUsed: number;
  detail: string;
};

function appUrl(): string {
  return (env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
}

export function payUrlFor(orderId: string): string {
  const base = appUrl();
  return base ? `${base}/pay/${orderId}` : `/pay/${orderId}`;
}

export async function runDelivery(paymentId: string): Promise<DeliveryResult> {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { deliveryLogs: { orderBy: { createdAt: "desc" } } },
  });

  if (!payment) {
    return { ok: false, status: "FAILED", attemptsUsed: 0, detail: "Payment not found." };
  }
  if ((payment.status as PaymentStatus) !== "VERIFIED") {
    return {
      ok: false,
      status: "SKIPPED",
      attemptsUsed: payment.deliveryLogs.length,
      detail: `Delivery requires VERIFIED status, current status is ${payment.status}.`,
    };
  }
  if (payment.deliveredAt) {
    return {
      ok: true,
      status: "DELIVERED",
      attemptsUsed: payment.deliveryLogs.length,
      detail: "Already delivered.",
    };
  }

  const attempt = payment.deliveryLogs.length + 1;
  if (attempt > MAX_DELIVERY_ATTEMPTS) {
    await db.deliveryLog.create({
      data: {
        paymentId: payment.id,
        attempt,
        channel: "system",
        status: "FAILED",
        detail: `Maximum delivery attempts (${MAX_DELIVERY_ATTEMPTS}) reached. Manual retry required.`,
      },
    });
    return {
      ok: false,
      status: "FAILED",
      attemptsUsed: attempt,
      detail: "Max attempts reached.",
    };
  }

  const lastFailed = payment.deliveryLogs.find((l) => l.status !== "SUCCESS");
  const dueAt = lastFailed
    ? lastFailed.createdAt.getTime() + (RETRY_DELAYS_MS[attempt - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1])
    : 0;
  if (lastFailed && Date.now() < dueAt) {
    return {
      ok: false,
      status: "RETRY",
      attemptsUsed: attempt - 1,
      detail: `Next attempt scheduled at ${new Date(dueAt).toISOString()}.`,
    };
  }

  const amountText = `${formatSol(Number(payment.amount))} ${payment.asset}`;
  const message = formatPaymentMessage({
    orderId: payment.orderId,
    amount: amountText,
    asset: payment.asset,
    txHash: payment.txHash ?? "unknown",
    simulated: payment.simulated,
    payUrl: payUrlFor(payment.orderId),
  });

  const results: { channel: string; ok: boolean; skipped: boolean; detail: string }[] = [];

  // Channel 1: Telegram
  const telegram = await sendTelegram(message);
  results.push({
    channel: "telegram",
    ok: telegram.ok,
    skipped: telegram.skipped,
    detail: telegram.detail,
  });

  // Channel 2: signed webhook
  if (env.DELIVERY_WEBHOOK_URL) {
    const payload = JSON.stringify({
      event: "payment.verified",
      orderId: payment.orderId,
      amount: Number(payment.amount),
      asset: payment.asset,
      txHash: payment.txHash,
      verifiedAt: payment.verifiedAt?.toISOString() ?? null,
      simulated: payment.simulated,
    });
    const signature = signPayload(payload);
    try {
      const res = await fetch(env.DELIVERY_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(signature ? { "X-Aether-Signature": signature } : {}),
        },
        body: payload,
        signal: AbortSignal.timeout(8_000),
      });
      results.push({
        channel: "webhook",
        ok: res.ok,
        skipped: false,
        detail: `Webhook responded ${res.status}.`,
      });
    } catch (error) {
      results.push({
        channel: "webhook",
        ok: false,
        skipped: false,
        detail: error instanceof Error ? error.message : "Webhook fetch failed.",
      });
    }
  } else {
    results.push({
      channel: "webhook",
      ok: false,
      skipped: true,
      detail: "DELIVERY_WEBHOOK_URL not configured.",
    });
  }

  // Persist one audit row per channel
  for (const r of results) {
    await db.deliveryLog.create({
      data: {
        paymentId: payment.id,
        attempt,
        channel: r.channel,
        status: r.skipped ? "SKIPPED" : r.ok ? "SUCCESS" : "RETRY",
        detail: r.detail.slice(0, 500),
      },
    });
  }

  const anySuccess = results.some((r) => r.ok);
  const allSkipped = results.every((r) => r.skipped);

  // With no channel configured the order itself is still fulfilled
  // and marked delivered; notifications are logged as skipped.
  if (anySuccess || allSkipped) {
    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: "DELIVERED",
        deliveredAt: new Date(),
        deliveredTo: env.TELEGRAM_CHAT_ID ?? env.DELIVERY_WEBHOOK_URL ?? "in-app",
      },
    });
    return {
      ok: true,
      status: "DELIVERED",
      attemptsUsed: attempt,
      detail: anySuccess
        ? "Delivery completed."
        : "No channels configured. Order marked delivered in-app.",
    };
  }

  return {
    ok: false,
    status: attempt >= MAX_DELIVERY_ATTEMPTS ? "FAILED" : "RETRY",
    attemptsUsed: attempt,
    detail: results.map((r) => `${r.channel}: ${r.detail}`).join(" | "),
  };
}
