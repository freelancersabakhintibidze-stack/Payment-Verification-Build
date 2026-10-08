const QA = [
  {
    q: "Is the money real?",
    a: "In demo mode the engine simulates the sender, the confirmation, and the notifications, and every simulated record is labeled. Point SOLANA_RPC_URL at a real cluster and set MERCHANT_WALLET, disable DEMO_MODE, and the same pipeline verifies real transfers.",
  },
  {
    q: "How are payments matched without a unique deposit account per order?",
    a: "Each invoice combines three signals: the merchant address, a memo equal to the order id, and an amount with a unique offset in the ninth decimal. A transaction matches when the memo contains the order id and the received amount is at least the invoice. If a wallet drops the memo, the unique amount alone can match it within a tight acceptance window.",
  },
  {
    q: "What if someone overpays or sends twice?",
    a: "Overpayment up to the acceptance window verifies once and the extra is honored as a tip to the merchant. A second transaction never re-triggers delivery because an order only leaves VERIFIED through delivery, and a transaction signature can only ever be attached to one order.",
  },
  {
    q: "What happens when an invoice expires?",
    a: "Every invoice carries an expiry, thirty minutes by default. The cron sweep marks overdue PENDING invoices as FAILED and stops watching them. Nothing is charged, nothing is delivered.",
  },
  {
    q: "Where do notifications go?",
    a: "Verified payments fire auto-delivery: the order is marked DELIVERED, a Telegram message is sent when credentials are configured, and a signed webhook is posted to your URL. Every attempt is stored in DeliveryLog, and the sweep retries failures with backoff at one and five minutes.",
  },
  {
    q: "Can this run anywhere besides Vercel?",
    a: "Yes. The app is a standard Next.js server with Prisma. The cron sweep is an ordinary authenticated GET, so any scheduler, from crontab to a container sidecar, can call it every two minutes.",
  },
];

export default function Faq() {
  return (
    <section id="faq" className="border-b border-line">
      <div className="shell section-pad">
        <div className="mb-12 grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="label text-secondary">
              <span className="mr-3 inline-block h-1.5 w-1.5 bg-accent" aria-hidden="true" />
              FAQ
            </p>
            <h2 className="display-lg mt-6 text-inkdeep">
              Asked, answered, on the record.
            </h2>
          </div>
          <div className="lg:col-span-7 lg:pl-10">
            <div>
              {QA.map((item) => (
                <details
                  key={item.q}
                  className="group border-t border-line last:border-b"
                >
                  <summary className="flex cursor-pointer list-none items-baseline justify-between gap-6 py-5 [&::-webkit-details-marker]:hidden">
                    <span className="font-serif text-[1.15rem] tracking-[-0.01em] text-ink group-hover:text-accent">
                      {item.q}
                    </span>
                    <span
                      className="label shrink-0 text-muted transition-transform duration-200 group-open:rotate-45"
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </summary>
                  <p className="max-w-[38rem] pb-6 leading-[1.65] text-body">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
