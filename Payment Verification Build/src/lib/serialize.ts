// Canonical row type comes from the SQLite client (the canonical Db type);
// its `status` is the validated string shared by both database schemas.
import type { Payment } from "aether-prisma-sqlite";
import { shortKey } from "@/lib/format";
import type { PaymentStatus } from "@/lib/status";

/** Public-safe projection of a Payment row. Never leak internal ids. */
export type PublicPayment = {
  orderId: string;
  amount: string;
  asset: string;
  status: PaymentStatus;
  memo: string;
  paymentAddress: string;
  paymentAddressShort: string;
  senderWallet: string;
  senderWalletShort: string;
  txHash: string | null;
  txHashShort: string | null;
  simulated: boolean;
  createdAt: string;
  updatedAt: string;
  verifiedAt: string | null;
  expiresAt: string;
  deliveredAt: string | null;
  checks: number;
};

export function serializePayment(p: Payment): PublicPayment {
  return {
    orderId: p.orderId,
    amount: Number(p.amount).toString(),
    asset: p.asset,
    status: p.status as PaymentStatus,
    memo: p.memo,
    paymentAddress: p.paymentAddress,
    paymentAddressShort: shortKey(p.paymentAddress, 6, 6),
    senderWallet: p.senderWallet,
    senderWalletShort: p.senderWallet ? shortKey(p.senderWallet, 4, 4) : "",
    txHash: p.txHash,
    txHashShort: p.txHash ? shortKey(p.txHash, 8, 6) : null,
    simulated: p.simulated,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    verifiedAt: p.verifiedAt?.toISOString() ?? null,
    expiresAt: p.expiresAt.toISOString(),
    deliveredAt: p.deliveredAt?.toISOString() ?? null,
    checks: p.checks,
  };
}
