/** Pure display formatters, safe on both server and client. */

const LAMPORTS_PER_SOL = 1_000_000_000;

/** Format a SOL amount with up to `maxDecimals` decimals, trailing zeros trimmed. */
export function formatSol(
  value: number | string | null | undefined,
  maxDecimals = 4,
): string {
  const n = typeof value === "string" ? Number(value) : value ?? 0;
  if (!Number.isFinite(n)) return "0";
  return trimZeros(n.toFixed(maxDecimals));
}

export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

export function solToLamports(sol: number): number {
  return Math.round(sol * LAMPORTS_PER_SOL);
}

function trimZeros(s: string): string {
  if (!s.includes(".")) return s;
  const trimmed = s.replace(/0+$/, "").replace(/\.$/, "");
  return trimmed || "0";
}

/** 4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T -> 4Nd1…gDB4T */
export function shortKey(
  value: string | null | undefined,
  head = 4,
  tail = 4,
): string {
  if (!value) return "";
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function formatDateTime(input: string | Date | null | undefined): string {
  if (!input) return "";
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

export function timeAgo(input: string | Date | null | undefined): string {
  if (!input) return "";
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const s = Math.max(0, Math.floor(diff / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function countDown(expiresAt: string | Date | null | undefined): string {
  if (!expiresAt) return "";
  const d = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  const remaining = d.getTime() - Date.now();
  if (remaining <= 0) return "expired";
  const m = Math.floor(remaining / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  return `${m}m ${String(s).padStart(2, "0")}s left`;
}

/** Deterministic file-safe timestamp for exports. */
export function fileStamp(date = new Date()): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}
