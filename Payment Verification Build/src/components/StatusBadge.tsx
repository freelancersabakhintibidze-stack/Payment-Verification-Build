import { STATUS_META, type PaymentStatus, type StatusTone } from "@/lib/status";

const TONE_STYLES: Record<StatusTone, { chip: string; dot: string }> = {
  neutral: { chip: "border-line text-secondary", dot: "bg-lineStrong" },
  pending: { chip: "border-lineStrong text-secondary", dot: "bg-warn" },
  confirming: { chip: "border-warn text-warn", dot: "bg-warn" },
  ok: { chip: "border-ok text-ok", dot: "bg-ok" },
  fail: { chip: "border-fail text-fail", dot: "bg-fail" },
};

const DELIVERED_STYLE = { chip: "border-ink bg-ink text-paper", dot: "bg-paper" };

export default function StatusBadge({
  status,
  className = "",
}: {
  status: PaymentStatus;
  className?: string;
}) {
  const meta = STATUS_META[status];
  const style =
    status === "DELIVERED"
      ? DELIVERED_STYLE
      : TONE_STYLES[meta.tone];

  return (
    <span
      className={`chip ${style.chip} ${className}`}
      title={meta.description}
    >
      <span
        className={`block h-1.5 w-1.5 ${style.dot}`}
        aria-hidden="true"
      />
      {meta.label}
    </span>
  );
}
