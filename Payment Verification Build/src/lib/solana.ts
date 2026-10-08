import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  type ParsedTransactionWithMeta,
} from "@solana/web3.js";
import { env, isDemo, merchantWallet } from "@/lib/env";
import { solToLamports } from "@/lib/format";

/**
 * Solana verification engine.
 *
 * Matching strategy (real mode):
 *   1. Watch the merchant wallet for recent signatures since the invoice was
 *      created.
 *   2. Fetch each parsed transaction and read its memo instructions and its
 *      balance deltas (native SOL) or parsed token transfers (SPL).
 *   3. A payment matches when the recipient received at least the invoiced
 *      amount AND (the memo contains the orderId OR REQUIRE_MEMO is disabled
 *      and the amount is unique to this invoice).
 */

export type MatchingMode = "memo" | "amount";

export type FoundPayment = {
  signature: string;
  blockTime: number;
  amountUi: number;
  mint: string | null;
  mode: MatchingMode;
  memo: string | null;
  confirmation: "processed" | "confirmed" | "finalized" | null;
};

export type MatchParams = {
  paymentAddress: string;
  memo: string;
  amount: number; // in SOL or token UI units
  mint?: string | null;
  sinceMs: number;
};

let connection: Connection | null = null;

export function getMerchantAddress(): string {
  return merchantWallet();
}

export function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(env.SOLANA_RPC_URL, {
      commitment: env.SOLANA_COMMITMENT,
    });
  }
  return connection;
}

/** Extract the concatenated memo text from parsed memo instructions. */
function extractMemo(tx: ParsedTransactionWithMeta): string | null {
  const memos: string[] = [];
  for (const instruction of tx.transaction.message.instructions) {
    const parsed = "parsed" in instruction ? instruction.parsed : undefined;
    if (
      parsed &&
      typeof parsed === "object" &&
      "type" in parsed &&
      (parsed as { type: string }).type === "memo" &&
      "memo" in (parsed as Record<string, unknown>)
    ) {
      const memo = (parsed as { memo: unknown }).memo;
      if (typeof memo === "string") memos.push(memo);
    }
    // Memo program v2 exposes the string directly on the instruction
    if ("program" in instruction && instruction.program === "spl-memo") {
      const data = (instruction as { parsed?: { memo?: string } }).parsed?.memo;
      if (typeof data === "string") memos.push(data);
    }
  }
  return memos.length > 0 ? memos.join(" ") : null;
}

/** Native SOL received by `address` in this transaction (balance delta). */
function nativeDelta(
  tx: ParsedTransactionWithMeta,
  address: string,
): number | null {
  const message = tx.transaction.message;
  const keys = message.accountKeys;
  const index = keys.findIndex(
    (k) => k.pubkey.toBase58() === address,
  );
  if (index === -1 || !tx.meta) return null;
  const pre = tx.meta.preBalances[index] ?? 0;
  const post = tx.meta.postBalances[index] ?? 0;
  return (post - pre) / LAMPORTS_PER_SOL;
}

/**
 * Largest SPL token balance increase for token accounts owned by `address`,
 * optionally restricted to `mint`. Derived from pre/post token balances,
 * which the RPC reports precisely for every parsed transaction.
 */
function splReceived(
  tx: ParsedTransactionWithMeta,
  address: string,
  mint: string | null,
): number | null {
  if (!tx.meta) return null;

  const pre = tx.meta.preTokenBalances ?? [];
  const post = tx.meta.postTokenBalances ?? [];
  const preByIndex = new Map(pre.map((b) => [b.accountIndex, b]));

  let best: number | null = null;
  for (const balance of post) {
    if (balance.owner !== address) continue;
    if (mint && balance.mint !== mint) continue;

    const before = preByIndex.get(balance.accountIndex);
    const beforeAmount = before ? (before.uiTokenAmount.uiAmount ?? 0) : 0;
    const delta = (balance.uiTokenAmount.uiAmount ?? 0) - beforeAmount;

    if (delta > 0 && (best === null || delta > best)) best = delta;
  }

  return best;
}

/**
 * Scan recent activity on the payment address and return the first
 * transaction that matches this invoice, or null.
 */
export async function findMatchingTransaction(
  params: MatchParams,
): Promise<FoundPayment | null> {
  const conn = getConnection();
  const owner = new PublicKey(params.paymentAddress);

  const signatures = await conn.getSignaturesForAddress(owner, { limit: 30 });
  const sinceSec = Math.floor(params.sinceMs / 1000) - 90; // 90s clock skew tolerance

  for (const sigInfo of signatures) {
    if (!sigInfo.blockTime || sigInfo.blockTime < sinceSec) continue;
    if (sigInfo.err) continue;

    const tx = await conn.getParsedTransaction(sigInfo.signature, {
      maxSupportedTransactionVersion: 0,
      // getParsedTransaction only accepts "confirmed" | "finalized"
      commitment:
        env.SOLANA_COMMITMENT === "finalized" ? "finalized" : "confirmed",
    });
    if (!tx) continue;

    const memo = extractMemo(tx);
    const memoMatch = memo?.includes(params.memo) ?? false;

    let received: number | null = null;
    if (params.mint) {
      received = splReceived(tx, params.paymentAddress, params.mint);
    } else {
      received = nativeDelta(tx, params.paymentAddress);
    }
    if (received === null || received <= 0) continue;

    const enough = received + 1e-9 >= params.amount;
    if (!enough) continue;

    if (!memoMatch && env.REQUIRE_MEMO) continue;

    return {
      signature: sigInfo.signature,
      blockTime: sigInfo.blockTime,
      amountUi: received,
      mint: params.mint ?? null,
      mode: memoMatch ? "memo" : "amount",
      memo,
      confirmation: (sigInfo.confirmationStatus as FoundPayment["confirmation"]) ?? null,
    };
  }

  return null;
}

export async function getConfirmation(
  signature: string,
): Promise<"processed" | "confirmed" | "finalized" | null> {
  const conn = getConnection();
  const statuses = await conn.getSignatureStatuses([signature]);
  const status = statuses.value[0];
  if (!status) return null;
  if (status.confirmationStatus) return status.confirmationStatus;
  return null;
}

/* ------------------------------------------------------------------ */
/*  Demo simulation                                                    */
/*                                                                    */
/*  When DEMO_MODE is enabled the engine can fabricate a deterministic */
/*  lifecycle so the whole product is demonstrable without spending   */
/*  SOL. Every simulated artifact is labeled with the DEMO- prefix.    */
/* ------------------------------------------------------------------ */

const DEMO_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function demoSignature(): string {
  let s = "DEMO";
  for (let i = 0; i < 40; i += 1) {
    s += DEMO_ALPHABET[Math.floor(Math.random() * DEMO_ALPHABET.length)];
  }
  return s;
}

/** Fake "sender pays" confirmation for a simulated invoice. */
export async function simulateConfirmation(
  createdAtMs: number,
): Promise<FoundPayment> {
  const age = Date.now() - createdAtMs;
  const confirmation =
    age < 3_500
      ? ("processed" as const)
      : age < 6_500
        ? ("confirmed" as const)
        : ("finalized" as const);
  return {
    signature: demoSignature(),
    blockTime: Math.floor(Date.now() / 1000),
    amountUi: Number.NaN, // filled by caller from the invoice
    mint: null,
    mode: "memo",
    memo: null,
    confirmation,
  };
}

export function assertRealMode(): void {
  if (isDemo()) {
    throw new Error(
      "Real RPC verification is disabled while DEMO_MODE is enabled.",
    );
  }
}
