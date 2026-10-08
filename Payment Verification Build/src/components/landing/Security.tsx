const MEASURES = [
  {
    title: "Schema validation",
    body: "Zod parses every request body and query string before any handler runs. Invalid input returns a 400 with the exact field and reason, never a stack trace.",
  },
  {
    title: "Rate limiting",
    body: "Sliding-window counters per IP guard the write endpoints: 10 invoices a minute, 30 verifications, 6 simulations. Responses carry X-RateLimit headers and a Retry-After when the window closes.",
  },
  {
    title: "Bearer-protected cron",
    body: "The sweep endpoint compares the Authorization header against CRON_SECRET in constant time. Vercel injects the secret automatically on schedule.",
  },
  {
    title: "Signed webhooks",
    body: "Outgoing delivery webhooks carry X-Aether-Signature: an HMAC-SHA256 over the raw body, keyed with WEBHOOK_SECRET. Receivers verify before trusting a payload.",
  },
  {
    title: "Environment contract",
    body: "A Zod schema parses the environment at boot. Missing or malformed variables stop the process with a readable message, and every degraded capability is disclosed in API responses.",
  },
  {
    title: "Honest demo mode",
    body: "Simulated money exists only when DEMO_MODE is enabled, always carries the DEMO- prefix, and is labeled simulated in the ledger, the receipt, and the notifications.",
  },
];

export default function Security() {
  return (
    <section id="security" className="border-b border-line bg-hall text-paper">
      <div className="shell section-pad">
        <div className="mb-12 grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="label text-paper/60">
              <span className="mr-3 inline-block h-1.5 w-1.5 bg-accent" aria-hidden="true" />
              Security
            </p>
            <h2 className="display-lg mt-6 text-paper">
              Distrust by default.
            </h2>
          </div>
          <div className="flex items-end lg:col-span-7">
            <p className="lede max-w-[32rem] text-paper/70">
              The pipeline handles money claims, so it behaves like it will be
              attacked: every input is parsed, every writer is throttled, every
              delivery is signed, and every state change is auditable.
            </p>
          </div>
        </div>

        <ol className="grid gap-x-10 md:grid-cols-2">
          {MEASURES.map((m, i) => (
            <li
              key={m.title}
              className="grid grid-cols-[3rem_1fr] gap-4 border-t border-paper/15 py-7"
            >
              <span className="label pt-1 text-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="font-serif text-[1.2rem] tracking-[-0.01em] text-paper">
                  {m.title}
                </h3>
                <p className="mt-2.5 max-w-[34rem] leading-[1.6] text-paper/70">
                  {m.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
