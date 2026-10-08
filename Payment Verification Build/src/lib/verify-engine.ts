import { db } from "@/lib/db";
import { isDemo } from "@/lib/env";
import {
  demoSignature,
  findMatchingTransaction,
  getConfirmation,
} from "@/lib/solana";
import { runDelivery } from "@/lib/delivery";
import { serializePayment, type PublicPayment } from "@/lib/serialize";
import type { PaymentStatus } from "@/lib/status";
import { AMOUNT_WINDOW } from "@/lib/match-math";

/**
 * Verification pipeline shared by the manual verify endpoint, the payment
 * status poller, and the cron sweep.
 *
 * State machine:
 *   PENDING ──tx found, unconfirmed──> CONFIRMING ──confirmed──> VERIFIED
 *      │                                                        │
 *      └──expired──> FAILED                                     v
 *                                                            DELIVERED
 */

export type VerifyOutcome = {
  payment: PublicPayment;
  transition: "none" | "confirming" | "verified" | "failed" | "delivered";
  detail: string;
  delivery?: Awaited<ReturnType<typeof runDelivery>>;
};


export async function verifyPaymentByOrderId(
  orderId: string,
): Promise<VerifyOutcome | null> {
  const payment = await db.payment.findUnique({ where: { orderId } });
  if (!payment) return null;
  return verifyPayment(payment.id);
}

export async function verifyPayment(id: string): Promise<VerifyOutcome> {
  let payment = await db.payment.findUnique({ where: { id } });
  if (!payment) {
    throw new Error("Payment not found.");
  }

  const status = payment.status as PaymentStatus;

  // Terminal states: verify is idempotent.
  if (status === "FAILED") {
    return {
      payment: serializePayment(payment),
      transition: "none",
      detail: "Payment already failed (expired).",
    };
  }

  if (status === "VERIFIED" || status === "DELIVERED") {
    const delivery = await runDelivery(payment.id);
    const fresh = await db.payment.findUniqueOrThrow({ where: { id } });
    return {
      payment: serializePayment(fresh),
      transition: fresh.status === "DELIVERED" ? "delivered" : "verified",
      detail: `Payment already verified. Delivery: ${delivery.status}.`,
      delivery,
    };
  }

  /* ---------------- Demo path (simulated transactions) --------------- */
  if (payment.simulated && isDemo()) {
    const age = Date.now() - payment.createdAt.getTime();
    if (age < 3_500) {
      const updated = await db.payment.update({
        where: { id: payment.id },
        data: {
          status: "CONFIRMING",
          txHash: payment.txHash ?? demoSignature(),
          lastCheckedAt: new Date(),
          checks: { increment: 1 },
        },
      });
      return {
        payment: serializePayment(updated),
        transition: "confirming",
        detail: "Simulated transaction seen. Waiting for confirmation.",
      };
    }

    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: "VERIFIED",
        txHash: payment.txHash ?? demoSignature(),
        verifiedAt: new Date(),
        lastCheckedAt: new Date(),
        checks: { increment: 1 },
      },
    });
    const delivery = await runDelivery(payment.id);
    const fresh = await db.payment.findUniqueOrThrow({ where: { id } });
    return {
      payment: serializePayment(fresh),
      transition: fresh.status === "DELIVERED" ? "delivered" : "verified",
      detail: "Simulated payment confirmed. Delivery triggered.",
      delivery,
    };
  }

  /* ------------------------- Real RPC path --------------------------- */

  // A transaction was already attached: re-check its confirmation depth.
  if (payment.txHash) {
    const confirmation = await getConfirmation(payment.txHash).catch(() => null);
    if (confirmation === "confirmed" || confirmation === "finalized") {
      const updated = await db.payment.update({
        where: { id: payment.id },
        data: {
          status: "VERIFIED",
          verifiedAt: payment.verifiedAt ?? new Date(),
          lastCheckedAt: new Date(),
          checks: { increment: 1 },
        },
      });
      const delivery = await runDelivery(payment.id);
      const fresh = await db.payment.findUniqueOrThrow({ where: { id } });
      return {
        payment: serializePayment(fresh),
        transition: fresh.status === "DELIVERED" ? "delivered" : "verified",
        detail: `Transaction ${confirmation}. Delivery: ${delivery.status}.`,
        delivery,
      };
    }
    const updated = await db.payment.update({
      where: { id: payment.id },
      data: {
        status: "CONFIRMING",
        lastCheckedAt: new Date(),
        checks: { increment: 1 },
      },
    });
    return {
      payment: serializePayment(updated),
      transition: "confirming",
      detail: `Transaction not final yet (status: ${confirmation ?? "unknown"}).`,
    };
  }

  // Scan the chain for a matching transaction.
  const found = await findMatchingTransaction({
    paymentAddress: payment.paymentAddress,
    memo: payment.memo,
    amount: Number(payment.amount),
    mint: payment.mint,
    sinceMs: payment.createdAt.getTime(),
  }).catch((error: unknown) => {
    throw new Error(
      `Solana RPC unavailable: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  });

  if (!found) {
    // Expire stale invoices (30 minutes by default, per-invoice override).
    if (payment.expiresAt.getTime() < Date.now()) {
      const updated = await db.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED", lastCheckedAt: new Date(), checks: { increment: 1 } },
      });
      return {
        payment: serializePayment(updated),
        transition: "failed",
        detail: "Payment window expired with no matching transaction.",
      };
    }
    const updated = await db.payment.update({
      where: { id: payment.id },
      data: { lastCheckedAt: new Date(), checks: { increment: 1 } },
    });
    return {
      payment: serializePayment(updated),
      transition: "none",
      detail: "No matching transaction yet. Invoice stays open.",
    };
  }

  const withinWindow =
    found.amountUi + 1e-9 >= Number(payment.amount) &&
    found.amountUi <= Number(payment.amount) * AMOUNT_WINDOW + 1e-9;
  if (found.mode === "amount" && !withinWindow) {
    const updated = await db.payment.update({
      where: { id: payment.id },
      data: { lastCheckedAt: new Date(), checks: { increment: 1 } },
    });
    return {
      payment: serializePayment(updated),
      transition: "none",
      detail: "Amount matched without memo but fell outside the acceptance window.",
    };
  }

  const confirmed =
    found.confirmation === "confirmed" || found.confirmation === "finalized";

  if (!confirmed) {
    const updated = await db.payment.update({
      where: { id: payment.id },
      data: {
        status: "CONFIRMING",
        txHash: found.signature,
        lastCheckedAt: new Date(),
        checks: { increment: 1 },
      },
    });
    return {
      payment: serializePayment(updated),
      transition: "confirming",
      detail: `Transaction found (${found.mode} match). Waiting for confirmation.`,
    };
  }

  await db.payment.update({
    where: { id: payment.id },
    data: {
      status: "VERIFIED",
      txHash: found.signature,
      verifiedAt: new Date(),
      lastCheckedAt: new Date(),
      checks: { increment: 1 },
    },
  });
  const delivery = await runDelivery(payment.id);
  const fresh = await db.payment.findUniqueOrThrow({ where: { id } });
  return {
    payment: serializePayment(fresh),
    transition: fresh.status === "DELIVERED" ? "delivered" : "verified",
    detail: `On-chain match via ${found.mode}. Delivery: ${delivery.status}.`,
    delivery,
  };
}
