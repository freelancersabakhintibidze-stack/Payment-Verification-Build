import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto bg-accent text-white">
      <div className="shell py-[clamp(3.5rem,7vw,6rem)]">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="label text-white/70">Ship the proof</p>
            <h2 className="mt-5 font-serif text-[clamp(1.85rem,4vw,2.75rem)] leading-[1.08] tracking-[-0.02em]">
              Open the dashboard. Run the loop. Keep the receipts.
            </h2>
            <Link href="/dashboard" className="btn-outline-light mt-8 inline-flex">
              Open dashboard
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-7 lg:pl-10">
            <div>
              <p className="label text-white/50">Product</p>
              <ul className="mt-4 space-y-2.5">
                <li>
                  <a href="/#loop" className="label text-white/85 hover:text-white">
                    The loop
                  </a>
                </li>
                <li>
                  <a href="/#demo" className="label text-white/85 hover:text-white">
                    Live demo
                  </a>
                </li>
                <li>
                  <Link href="/dashboard" className="label text-white/85 hover:text-white">
                    Dashboard
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="label text-white/50">Build</p>
              <ul className="mt-4 space-y-2.5">
                <li>
                  <a href="/#architecture" className="label text-white/85 hover:text-white">
                    Architecture
                  </a>
                </li>
                <li>
                  <a href="/#stack" className="label text-white/85 hover:text-white">
                    Tech stack
                  </a>
                </li>
                <li>
                  <a href="/#security" className="label text-white/85 hover:text-white">
                    Security
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="label text-white/50">Legal</p>
              <ul className="mt-4 space-y-2.5">
                <li>
                  <Link href="/terms" className="label text-white/85 hover:text-white">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="label text-white/85 hover:text-white">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/20 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-serif text-lg tracking-tight">Aether Arena</p>
          <p className="label text-white/55">
            © 2026 · Solana payment verification · On-chain or nothing
          </p>
        </div>
      </div>
    </footer>
  );
}
