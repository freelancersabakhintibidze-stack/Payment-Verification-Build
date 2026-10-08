const ENDPOINTS = [
  {
    method: "POST",
    path: "/api/payment/create",
    body: "Writes an invoice, returns the order, payment link, and QR data.",
  },
  {
    method: "GET",
    path: "/api/payment/[orderId]",
    body: "Public status projection used by receipt pages and pollers.",
  },
  {
    method: "POST",
    path: "/api/payment/verify",
    body: "Runs the matching pipeline for one order and advances its state.",
  },
  {
    method: "POST",
    path: "/api/delivery/trigger",
    body: "Executes or retries auto-delivery with per-channel audit logs.",
  },
  {
    method: "GET",
    path: "/api/cron/verify-pending",
    body: "Two-minute sweep: verify stale invoices, expire old ones, retry deliveries.",
  },
  {
    method: "GET",
    path: "/api/dashboard/payments",
    body: "Filtered feed with revenue summary; supports CSV export.",
  },
  {
    method: "POST",
    path: "/api/demo/simulate-payment",
    body: "Demo mode only. Fakes a sender payment, clearly labeled.",
  },
];

const METHOD_TONE: Record<string, string> = {
  POST: "text-accent",
  GET: "text-ok",
};

export default function Architecture() {
  return (
    <section id="architecture" className="border-b border-line">
      <div className="shell section-pad">
        <div className="mb-12 grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="label text-secondary">
              <span className="mr-3 inline-block h-1.5 w-1.5 bg-accent" aria-hidden="true" />
              Architecture
            </p>
            <h2 className="display-lg mt-6 text-inkdeep">
              Seven routes. One state machine.
            </h2>
          </div>
          <div className="flex items-end lg:col-span-7">
            <p className="lede max-w-[32rem] text-body">
              Every capability is an explicit, documented endpoint. Nothing
              hides behind magic. Wire a storefront, a bot, or a checkout
              against the same contract.
            </p>
          </div>
        </div>

        <div className="frame overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="label px-5 py-3.5 font-medium text-muted">
                  Method
                </th>
                <th scope="col" className="label px-5 py-3.5 font-medium text-muted">
                  Route
                </th>
                <th scope="col" className="label px-5 py-3.5 font-medium text-muted">
                  Responsibility
                </th>
              </tr>
            </thead>
            <tbody>
              {ENDPOINTS.map((e) => (
                <tr key={e.path} className="border-b border-lineSoft last:border-b-0 hover:bg-mist">
                  <td className={`label px-5 py-4 ${METHOD_TONE[e.method]}`}>
                    {e.method}
                  </td>
                  <td className="px-5 py-4 font-mono text-[0.8125rem] text-ink">
                    {e.path}
                  </td>
                  <td className="px-5 py-4 text-[0.9375rem] leading-relaxed text-body">
                    {e.body}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
