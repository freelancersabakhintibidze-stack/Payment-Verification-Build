import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern your use of Aether Arena, the Solana payment verification and auto-delivery service.",
};

const SECTIONS = [
  {
    h: "1. Agreement",
    p: [
      "These Terms of Service govern your access to and use of Aether Arena, a software product that watches Solana blockchain activity, verifies payments against invoices, and triggers delivery workflows. By deploying the software, opening the dashboard, or calling the API, you accept these terms in full.",
      "The software is provided to you as a self-hostable application. When you deploy it, you operate it. You are responsible for the configuration you choose, the wallets you register, and the orders you fulfill through it.",
    ],
  },
  {
    h: "2. Eligibility and authority",
    p: [
      "You must be legally permitted to run a payment acceptance workflow in your jurisdiction. You confirm that you are not a sanctioned entity and that the funds you process originate from lawful activity.",
      "If you use the software on behalf of an organization, you represent that you have authority to bind that organization to these terms.",
    ],
  },
  {
    h: "3. Nature of the service",
    p: [
      "Aether Arena is a verification and delivery orchestration layer. It reads public blockchain data through Solana RPC endpoints, stores invoices in your own database, and sends notifications you configure. It never holds custody of funds, never broadcasts transactions on your behalf, and never takes possession of payments.",
      "All transfers occur directly between the payer and the wallet address you configure as the merchant address. You are solely responsible for the correctness of that address.",
    ],
  },
  {
    h: "4. Acceptable use",
    p: [
      "You agree not to use the software for prohibited activities, including money laundering, terrorist financing, fraud, the sale of illegal goods or services, or any activity that violates applicable law or the terms of the Solana network.",
      "You agree not to attack the service or its infrastructure, including attempting to bypass rate limits, hammering RPC endpoints beyond configured limits, or reverse-engineering webhook signatures to impersonate deliveries.",
    ],
  },
  {
    h: "5. Verification is probabilistic context, not a guarantee",
    p: [
      "On-chain verification depends on RPC availability, network conditions, and the matching strategy configured. While the engine is designed to be precise, no automated system can promise that every relevant transaction will be observed, or that every observed match corresponds to the payer's intent.",
      "You are responsible for reviewing the ledger, reconciling settlements with your own records, and configuring the matching window and memo requirements appropriately for your risk tolerance.",
    ],
  },
  {
    h: "6. Demo mode",
    p: [
      "The software ships with a demo mode in which verification and delivery are simulated end to end. Simulated records are labeled and carry no monetary value. You must disable demo mode before accepting real payments, and you are responsible for doing so.",
    ],
  },
  {
    h: "7. Delivery obligations",
    p: [
      "Auto-delivery marks orders as delivered and dispatches the notifications you configure. It does not itself ship goods or grant access unless you wire those actions to the delivery webhook. You remain responsible for actually fulfilling orders verified by the system.",
    ],
  },
  {
    h: "8. Fees",
    p: [
      "The software carries no license fee. Third-party costs still apply: RPC provider fees, Telegram or email service costs, hosting costs, and network transaction fees paid by senders. Those relationships are between you and those providers.",
    ],
  },
  {
    h: "9. Disclaimer and limitation of liability",
    p: [
      "The software is provided as is and as available, without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, and non-infringement.",
      "To the maximum extent permitted by law, the authors and contributors are not liable for lost profits, lost funds, lost data, or any indirect, incidental, or consequential damages arising from your use of the software. Your sole remedy for dissatisfaction is to stop using it.",
    ],
  },
  {
    h: "10. Changes",
    p: [
      "These terms may be updated to reflect changes in the product or applicable law. Material changes will be reflected in the version of these terms shipped with the software and dated below. Continued use after an update constitutes acceptance.",
    ],
  },
  {
    h: "11. Contact",
    p: [
      "Questions about these terms can be raised in the project repository where you obtained the software. Written notice requirements are satisfied by opening an issue there.",
    ],
  },
];

export default function TermsPage() {
  return (
    <article className="border-b border-line">
      <div className="shell pb-[clamp(4rem,8vw,7rem)] pt-[clamp(2.5rem,5vw,4rem)]">
        <header className="border-b border-line pb-10">
          <p className="label text-secondary">
            <span className="mr-3 inline-block h-1.5 w-1.5 bg-accent" aria-hidden="true" />
            Legal
          </p>
          <h1 className="display-lg mt-5 text-inkdeep">Terms of Service</h1>
          <p className="label mt-5 text-muted">
            Version 1.0 · Dated 2026-10-05 · Governs the Aether Arena software
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
