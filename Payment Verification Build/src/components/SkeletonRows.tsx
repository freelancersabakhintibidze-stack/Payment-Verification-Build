/** Shimmering placeholder rows shown while the ledger loads. */
export default function SkeletonRows({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading payments">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr] gap-4 border-b border-lineSoft px-4 py-4 max-md:grid-cols-[1.4fr_1fr_1fr]"
        >
          <div className="skeleton h-3 w-3/4" />
          <div className="skeleton h-3 w-1/2" />
          <div className="skeleton h-3 w-2/3" />
          <div className="skeleton hidden h-3 w-2/3 md:block" />
          <div className="skeleton hidden h-3 w-1/3 md:block" />
        </div>
      ))}
      <span className="sr-only">Loading payment data</span>
    </div>
  );
}
