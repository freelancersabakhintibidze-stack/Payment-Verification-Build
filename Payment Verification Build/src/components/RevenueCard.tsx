/**
 * Ledger stat block. Deliberately not a floating "card": figures sit on a
 * shared ruled grid with hairline separators, like a printed balance sheet.
 */
export default function RevenueCard({
  label,
  value,
  sub,
  tone = "ink",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "ink" | "accent" | "ok" | "warn" | "fail" | "muted";
}) {
  const toneClass = {
    ink: "text-ink",
    accent: "text-accent",
    ok: "text-ok",
    warn: "text-warn",
    fail: "text-fail",
    muted: "text-muted",
  }[tone];

  return (
    <div className="border-l border-line px-5 py-6 first:border-l-0 max-sm:border-l-0 max-sm:border-t max-sm:px-0 max-sm:first:border-t-0 max-sm:pl-0">
      <p className="label text-muted">{label}</p>
      <p
        className={`tnum mt-3 font-serif text-[clamp(1.4rem,2.4vw,1.9rem)] leading-none tracking-tight ${toneClass}`}
      >
        {value}
      </p>
      {sub ? <p className="label mt-2.5 text-muted">{sub}</p> : null}
    </div>
  );
}
