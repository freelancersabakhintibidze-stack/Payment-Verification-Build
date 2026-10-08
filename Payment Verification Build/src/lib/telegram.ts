import { env } from "@/lib/env";

export type TelegramResult = {
  ok: boolean;
  skipped: boolean;
  detail: string;
};

/**
 * Send an HTML message through the Telegram Bot API.
 * Never throws: delivery failures are returned and logged by the caller.
 */
export async function sendTelegram(text: string): Promise<TelegramResult> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    return {
      ok: false,
      skipped: true,
      detail: "Telegram not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID).",
    };
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(8_000),
      },
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        skipped: false,
        detail: `Telegram API responded ${res.status}. ${body.slice(0, 180)}`,
      };
    }

    return { ok: true, skipped: false, detail: "Message delivered." };
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Unknown Telegram error.";
    return { ok: false, skipped: false, detail };
  }
}

export function formatPaymentMessage(input: {
  orderId: string;
  amount: string;
  asset: string;
  txHash: string;
  simulated: boolean;
  payUrl: string;
}): string {
  const lines = [
    "<b>Payment verified</b>",
    "",
    `<b>Order</b> ${input.orderId}`,
    `<b>Amount</b> ${input.amount} ${input.asset}`,
    `<b>Tx</b> <code>${input.txHash}</code>`,
  ];
  if (input.simulated) {
    lines.push("<i>Simulated transaction (DEMO_MODE)</i>");
  }
  lines.push("", `Receipt: ${input.payUrl}`);
  return lines.join("\n");
}
