export default function AnnouncementStrip() {
  return (
    <div className="border-b border-line bg-ink text-paper">
      <div className="shell flex min-h-9 items-center justify-center gap-3 py-2 text-center">
        <span
          className="block h-1.5 w-1.5 shrink-0 bg-accent"
          aria-hidden="true"
        />
        <p className="label">
          Live build · Solana payment verification · Every layer shipped
        </p>
      </div>
    </div>
  );
}
