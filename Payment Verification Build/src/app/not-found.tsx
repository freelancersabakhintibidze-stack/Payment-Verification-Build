import Link from "next/link";

export default function NotFound() {
  return (
    <section className="border-b border-line">
      <div className="shell section-pad">
        <p className="label text-secondary">
          <span className="mr-3 inline-block h-1.5 w-1.5 bg-accent" aria-hidden="true" />
          Error 404
        </p>
        <h1 className="display-lg mt-6 text-inkdeep">
          Nothing is recorded at this address.
        </h1>
        <p className="lede mt-6 max-w-[32rem] text-body">
          The page you requested does not exist, or the receipt you followed
          was mistyped. Order ids look like ORD-XXXXXXX-XXXXXXXX.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/" className="btn-primary">
            Back to the front page
            <span aria-hidden="true">→</span>
          </Link>
          <Link href="/dashboard" className="btn-outline">
            Open dashboard
          </Link>
        </div>
      </div>
    </section>
  );
}
