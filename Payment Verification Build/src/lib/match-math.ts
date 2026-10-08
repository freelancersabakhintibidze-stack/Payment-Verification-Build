/**
 * Pure amount / confirmation helpers used by the verification engine.
 * Kept free of RPC and DB so Vitest can exercise matching rules without a network.
 */

/** How far a matched amount may exceed the invoice and still auto-match (5%). */
export const AMOUNT_WINDOW = 1.05;

/** Lamports per SOL — integer money base unit for native SOL. */
export const LAMPORTS_PER_SOL = 1_000_000_000;

/**
 * Returns true when received amount is at least the invoice and within the
 * acceptance window above it. Uses a small epsilon for float noise.
 */
export function amountWithinWindow(
  receivedUi: number,
  invoiceUi: number,
  window = AMOUNT_WINDOW,
): boolean {
  if (!Number.isFinite(receivedUi) || !Number.isFinite(invoiceUi)) return false;
  if (invoiceUi <= 0) return false;
  return (
    receivedUi + 1e-9 >= invoiceUi &&
    receivedUi <= invoiceUi * window + 1e-9
  );
}

/** Convert SOL UI units to integer lamports (round half-up via Math.round). */
export function toLamports(sol: number): number {
  return Math.round(sol * LAMPORTS_PER_SOL);
}

/** Convert integer lamports to SOL UI units. */
export function fromLamports(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

/**
 * Delivery retry schedule: attempt index 1 → 0ms, 2 → 60s, 3 → 300s.
 * Returns ms until the next attempt is due given attempt number (1-based)
 * and the timestamp of the last failed attempt.
 */
export const RETRY_DELAYS_MS = [0, 60_000, 300_000] as const;
export const MAX_DELIVERY_ATTEMPTS = 3;

export function nextRetryDueAt(
  attemptNumber: number,
  lastFailedAtMs: number,
): number {
  const delay =
    RETRY_DELAYS_MS[Math.min(attemptNumber - 1, RETRY_DELAYS_MS.length - 1)] ??
    RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
  return lastFailedAtMs + delay;
}

export function isRetryDue(
  attemptNumber: number,
  lastFailedAtMs: number,
  nowMs = Date.now(),
): boolean {
  if (attemptNumber > MAX_DELIVERY_ATTEMPTS) return false;
  return nowMs >= nextRetryDueAt(attemptNumber, lastFailedAtMs);
}
