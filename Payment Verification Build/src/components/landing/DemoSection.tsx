import DemoLoop from "@/components/DemoLoop";
import { isDemo } from "@/lib/env";

export default function DemoSection() {
  return (
    <section id="demo" className="border-b border-line bg-mist">
      <div className="shell section-pad">
        <div className="mb-12 grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="label text-secondary">
              <span className="mr-3 inline-block h-1.5 w-1.5 bg-accent" aria-hidden="true" />
              Live demo
            </p>
            <h2 className="display-lg mt-6 text-inkdeep">
              Press the buttons. The product responds.
            </h2>
          </div>
          <div className="flex items-end lg:col-span-5">
            <p className="lede max-w-[30rem] text-body">
              This demo calls the production API routes, the same Prisma
              ledger, the same state machine.{" "}
              {isDemo()
                ? "Money is simulated and always labeled as such."
                : "The engine is pointed at a real RPC endpoint."}
            </p>
          </div>
        </div>

        <DemoLoop demo={isDemo()} />
      </div>
    </section>
  );
}
