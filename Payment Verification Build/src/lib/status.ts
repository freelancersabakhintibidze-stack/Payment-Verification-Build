/** Canonical payment status vocabulary shared by server and client. */

export const PAYMENT_STATUSES = [
  "PENDING",
  "CONFIRMING",
  "VERIFIED",
  "FAILED",
  "DELIVERED",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export type StatusTone = "neutral" | "pending" | "confirming" | "ok" | "fail";

export const STATUS_META: Record<
  PaymentStatus,
  { label: string; tone: StatusTone; description: string }
> = {
  PENDING: {
    label: "Pending",
    tone: "pending",
    description: "Awaiting an on-chain transaction from the sender.",
  },
  CONFIRMING: {
    label: "Confirming",
    tone: "confirming",
    description: "Transaction found. Waiting for network confirmation.",
  },
  VERIFIED: {
    label: "Verified",
    tone: "ok",
    description: "Funds confirmed on-chain. Delivery is being triggered.",
  },
  FAILED: {
    label: "Failed",
    tone: "fail",
    description: "Payment window expired with no matching transaction.",
  },
  DELIVERED: {
    label: "Delivered",
    tone: "ok",
    description: "Order fulfilled and the merchant was notified.",
  },
};

export function isPaymentStatus(value: unknown): value is PaymentStatus {
  return (
    typeof value === "string" &&
    (PAYMENT_STATUSES as readonly string[]).includes(value)
  );
}

/** Statuses that count toward settled revenue. */
export const SETTLED_STATUSES: PaymentStatus[] = ["VERIFIED", "DELIVERED"];
