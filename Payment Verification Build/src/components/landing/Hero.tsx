import CornerMarks from "@/components/site/CornerMarks";
import Link from "next/link";
import { isDemo } from "@/lib/env";

export default function Hero() {
  return (
    <section id="top" className="border-b border-line">
      <div className="shell grid items-center gap-14 py-[clamp(4.5rem,9vw,9rem)] lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-7">
          <p className="label flex items-center gap-3 text-secondary">
            <span
              className="block h-1.5 w-1.5 shrink-0 bg-accent"
              aria-hidden="true"
            />
            Solana · Web3.js · Live pipeline
          </p>

          <h1 className="drop-cap display-xl mt-8 text-inkdeep">
            Watch the chain. Verify the payment. Ship the order.
          </h1>

          <p className="lede mt-8 max-w-[34rem] text-body">
            Aether Arena turns Solana transfers into settled orders. The engine
            watches your wallet, matches the memo and the exact amount, waits
            for finality, then fires delivery the moment funds are confirmed.
          </p>

          <div className="mt-11 flex flex-wrap items-center gap-3">
            <Link href="/dashboard" className="btn-primary">
              Open live dashboard
              <span aria-hidden="true">→</span>
            </Link>
            <a href="#demo" className="btn-outline">
              Run the demo
            </a>
          </div>

          <dl className="mt-14 grid max-w-lg grid-cols-3 gap-6 border-t border-line pt-8">
            <div>
              <dt className="label text-muted">Confirmation</dt>
              <dd className="tnum mt-2 font-serif text-[1.5rem] tracking-tight text-ink">
                ~2s
              </dd>
            </div>
            <div>
              <dt className="label text-muted">Network</dt>
              <dd className="mt-2 font-serif text-[1.5rem] tracking-tight text-ink">
                Solana
              </dd>
            </div>
            <div>
              <dt className="label text-muted">Mode</dt>
              <dd className="mt-2 font-serif text-[1.5rem] tracking-tight text-ink">
                {isDemo() ? "Demo" : "Live RPC"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="lg:col-span-5">
          <figure className="frame relative p-4 md:p-5">
            <CornerMarks inset={8} size={14} />
            <div
              role="img"
              aria-label="Abstract verification diagram: concentric frames around a red confirmation core"
              className="blueprint relative aspect-[4/5] w-full overflow-hidden border border-line bg-mist"
            >
              <span className="absolute left-0 top-1/2 h-px w-full bg-lineSoft" aria-hidden="true" />
              <span className="absolute left-1/2 top-0 h-full w-px bg-lineSoft" aria-hidden="true" />
              <span className="absolute left-1/2 top-1/2 h-[74%] w-[74%] -translate-x-1/2 -translate-y-1/2 border border-line" aria-hidden="true" />
              <span className="absolute left-1/2 top-1/2 h-[54%] w-[54%] -translate-x-1/2 -translate-y-1/2 border border-lineStrong" aria-hidden="true" />
              <span className="absolute left-1/2 top-1/2 h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 border border-line" aria-hidden="true" />
              <span className="absolute left-1/2 top-[13%] h-2 w-2 bg-lineStrong" aria-hidden="true" />
              <span className="absolute right-[13%] top-1/2 h-2 w-2 bg-lineStrong" aria-hidden="true" />
              <span className="absolute left-[13%] top-1/2 h-2 w-2 bg-lineStrong" aria-hidden="true" />
              <span className="absolute left-1/2 top-[86%] h-2 w-2 bg-lineStrong" aria-hidden="true" />
              <span className="absolute left-1/2 top-1/2 h-[11%] w-[11%] -translate-x-1/2 -translate-y-1/2 bg-accent" aria-hidden="true" />
            </div>
            <figcaption className="label mt-3.5 flex items-center justify-between text-muted">
              <span>Verify · 01</span>
              <span>On-chain</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
