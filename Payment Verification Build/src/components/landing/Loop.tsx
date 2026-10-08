const STEPS = [
  {
    index: "01",
    title: "Watch",
    body: "An invoice is written to the ledger with the merchant address, a memo equal to the order id, and an exact amount carrying a unique ninth-decimal offset. The matcher scans recent signatures on the wallet from the moment the invoice opens.",
    mark: (
      <span className="flex h-full items-center justify-center">
        <span className="block h-2.5 w-2.5 border border-lineStrong" aria-hidden="true" />
      </span>
    ),
  },
  {
    index: "02",
    title: "Confirm",
    body: "A transaction that carries the memo and at least the invoiced amount moves the order to confirming. The engine re-reads confirmation depth from the RPC until the network finalizes the transfer, then stamps the order with its signature.",
    mark: (
      <span className="flex h-full items-center justify-center gap-1.5" aria-hidden="true">
        <span className="block h-2.5 w-2.5 border border-lineStrong" />
        <span className="block h-2.5 w-2.5 bg-accent" />
      </span>
    ),
  },
  {
    index: "03",
    title: "Deliver",
    body: "Finality flips the order to verified and auto-delivery fires. The order is marked delivered, Telegram and signed webhook notifications go out, and every attempt is recorded in the delivery log with exponential backoff on failure.",
    mark: (
      <span className="flex h-full items-center justify-center gap-1.5" aria-hidden="true">
        <span className="block h-2.5 w-2.5 bg-accent" />
        <span className="block h-2.5 w-2.5 bg-accent" />
        <span className="block h-2.5 w-2.5 bg-accent" />
      </span>
    ),
  },
];

export default function Loop() {
  return (
    <section id="loop" className="border-b border-line">
      <div className="shell section-pad">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="label text-secondary">
              <span className="mr-3 inline-block h-1.5 w-1.5 bg-accent" aria-hidden="true" />
              The loop
            </p>
            <h2 className="display-lg mt-6 text-inkdeep">
              Three states, no ambiguity.
            </h2>
            <p className="lede mt-6 max-w-[26rem] text-body">
              Every order walks the same public state machine. You can watch it
              happen on the receipt page, in the dashboard, and in the API.
            </p>
          </div>

          <ol className="lg:col-span-8">
            {STEPS.map((step) => (
              <li
                key={step.index}
                className="grid grid-cols-[auto_1fr] gap-6 border-t border-line py-8 last:border-b sm:grid-cols-[auto_5rem_1fr]"
              >
                <span className="label pt-1.5 text-accent">{step.index}</span>
                <div className="hidden sm:block">{step.mark}</div>
                <div>
                  <h3 className="font-serif text-[1.4rem] tracking-[-0.015em] text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-3 max-w-[36rem] leading-[1.65] text-body">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
