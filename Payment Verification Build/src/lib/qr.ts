import QRCode from "qrcode";

/**
 * Render a Solana Pay request into a crisp inline SVG.
 * The QR always sits on a white tile in the UI so scanners get contrast in
 * both themes.
 */
export async function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#171613ff", light: "#00000000" },
  });
}

/**
 * Build a Solana Pay transfer URL (BIP-321 style `solana:` scheme used by
 * Phantom, Solflare, and backpack deep links).
 */
export function solanaPayUrl(input: {
  recipient: string;
  amount: number;
  memo?: string;
  mint?: string | null;
  label?: string;
  message?: string;
}): string {
  const params = new URLSearchParams();
  params.set("amount", String(input.amount));
  if (input.mint) params.set("spl-token", input.mint);
  if (input.memo) params.set("memo", input.memo);
  if (input.label) params.set("label", input.label);
  if (input.message) params.set("message", input.message);
  return `solana:${input.recipient}?${params.toString()}`;
}
