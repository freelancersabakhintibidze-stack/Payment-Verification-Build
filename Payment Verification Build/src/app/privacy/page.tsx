import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What Aether Arena collects, stores, and shares, and why. Written for a self-hostable product, in plain language.",
};

const SECTIONS = [
  {
    h: "1. Scope",
    p: [
      "This policy describes how Aether Arena handles information when you deploy the software, operate the dashboard, or process payments through it. Because the product is self-hostable, the operator who deploys it controls the production database and is responsible for informing their own customers.",
    ],
  },
  {
    h: "2. What the software stores",
    p: [
      "Payment records: an order id, the invoiced amount, the merchant address, the payer's wallet address when supplied, the transaction signature once matched, status transitions, and timestamps. This is the operational data the ledger exists to hold.",
      "Delivery records: one row per notification attempt per channel, containing the channel name, the outcome, and a short detail string. Application logs may also record request-level errors.",
    ],
  },
  {
    h: "3. What the software does not store",
    p: [
      "No custody keys. The application never asks for private keys, seed phrases, or signing authority over any wallet. No cookies for tracking, no third-party analytics, and no advertising identifiers are used anywhere in the codebase.",
    ],
  },
  {
    h: "4. Third parties the software can contact",
    p: [
      "Solana RPC endpoints receive read-only requests: signature lookups, transaction fetches, and status checks for the wallet you configure. The operator chooses the endpoint.",
      "Telegram receives notification messages when the operator configures a bot token and chat id. A delivery webhook receives signed JSON payloads when the operator configures a URL. No other outbound calls exist.",
    ],
  },
  {
    h: "5. On-chain data is public",
    p: [
      "Any transaction the software verifies is, by the nature of blockchains, permanently public and independently viewable by anyone. The software adds nothing to a chain. Operators should avoid placing personal information in memos, because memos are immutable once on-chain.",
    ],
  },
  {
    h: "6. Retention and deletion",
    p: [
      "Payment and delivery records live in the operator's database until the operator deletes them. Prisma migrations provide the schema; ordinary database tooling provides deletion. Operators should define their own retention window consistent with their legal obligations, such as tax and accounting rules.",
    ],
  },
  {
    h: "7. Security measures",
    p: [
      "The software validates every input with schema validation, rate-limits write endpoints per IP, authenticates the cron sweep with a bearer secret compared in constant time, and signs outgoing webhooks with HMAC-SHA256. Operators are responsible for protecting their environment files, database credentials, and deployment secrets.",
    ],
  },
  {
    h: "8. Changes",
    p: [
      "This policy is dated and versioned with the software. Material changes to data handling will ship with a new version and date, and operators should re-read it on upgrade.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <article className="border-b border-line">
      <div className="shell pb-[clamp(4rem,8vw,7rem)] pt-[clamp(2.5rem,5vw,4rem)]">
        <header className="border-b border-line pb-10">
          <p className="label text-secondary">
            <span className="mr-3 inline-block h-1.5 w-1.5 bg-accent" aria-hidden="true" />
            Legal
          </p>
          <h1 className="display-lg mt-5 text-inkdeep">Privacy Policy</h1>
          <p className="label mt-5 text-muted">
            Version 1.0 · Dated 2026-10-05 · Covers the Aether Arena software
          </p>
        </header>

        <div className="max-w-[46rem]">
          {SECTIONS.map((s) => (
            <section key={s.h} className="border-b border-line py-9">
              <h2 className="font-serif text-[1.35rem] tracking-[-0.015em] text-ink">
                {s.h}
              </h2>
              {s.p.map((paragraph, i) => (
                <p key={i} className="mt-4 leading-[1.7] text-body">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}
