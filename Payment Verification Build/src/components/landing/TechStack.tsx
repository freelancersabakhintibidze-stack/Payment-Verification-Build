const STACK = [
  {
    name: "Next.js 16",
    role: "App Router",
    why: "Server components for the dashboard, typed API routes for the pipeline, one deployable unit.",
  },
  {
    name: "TypeScript 5",
    role: "Language",
    why: "Strict end to end. The state machine is a union type, so illegal states fail to compile.",
  },
  {
    name: "Prisma 6",
    role: "Data layer",
    why: "Typed queries against PostgreSQL with a single Payment ledger and a DeliveryLog audit trail.",
  },
  {
    name: "@solana/web3.js",
    role: "Chain access",
    why: "Signature scans, parsed transactions, balance deltas, and confirmation depth from one client.",
  },
  {
    name: "Tailwind CSS 4",
    role: "Design system",
    why: "The editorial tokens you see here: warm paper, printer's ink, ledger red, hairline rules.",
  },
  {
    name: "Zod 4",
    role: "Validation",
    why: "Every request body, query, and environment variable is parsed before it is trusted.",
  },
  {
    name: "Vercel Cron",
    role: "Scheduler",
    why: "A two-minute sweep verifies stale invoices and retries deliveries without human hands.",
  },
];

export default function TechStack() {
  return (
    <section id="stack" className="border-b border-line">
      <div className="shell section-pad">
        <div className="mb-12 grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="label text-secondary">
              <span className="mr-3 inline-block h-1.5 w-1.5 bg-accent" aria-hidden="true" />
              Stack
            </p>
            <h2 className="display-lg mt-6 text-inkdeep">
              A short list, chosen on purpose.
            </h2>
          </div>
          <div className="flex items-end lg:col-span-7">
            <p className="lede max-w-[32rem] text-body">
              No exotic dependencies, nothing abandoned, nothing you cannot
              hire for. Each piece earns its place in the table below.
            </p>
          </div>
        </div>

        <ul>
          {STACK.map((item, i) => (
            <li
              key={item.name}
              className="grid gap-3 border-t border-line py-6 last:border-b sm:grid-cols-[3rem_12rem_10rem_1fr] sm:items-baseline sm:gap-6"
            >
              <span className="label text-muted">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="font-serif text-[1.2rem] tracking-[-0.01em] text-ink">
                {item.name}
              </span>
              <span className="label text-accent">{item.role}</span>
              <span className="max-w-[38rem] leading-[1.6] text-body">
                {item.why}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
