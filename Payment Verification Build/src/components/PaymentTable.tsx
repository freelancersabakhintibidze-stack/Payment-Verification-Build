"use client";

import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import type { PublicPayment } from "@/lib/serialize";
import { formatSol, timeAgo } from "@/lib/format";

/**
 * The payment ledger. A real table, not a card grid: mono numerals,
 * hairline rules, and a row action that opens the public receipt.
 */
export default function PaymentTable({
  payments,
  loading,
}: {
  payments: PublicPayment[];
  loading: boolean;
}) {
  return (
    <div className="frame overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-left">
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className="label px-4 py-3.5 font-medium text-muted">
              Order
            </th>
            <th scope="col" className="label px-4 py-3.5 text-right font-medium text-muted">
              Amount
            </th>
            <th scope="col" className="label px-4 py-3.5 font-medium text-muted">
              Status
            </th>
            <th scope="col" className="label px-4 py-3.5 font-medium text-muted">
              Transaction
            </th>
            <th scope="col" className="label px-4 py-3.5 font-medium text-muted">
              Created
            </th>
            <th scope="col" className="label px-4 py-3.5 text-right font-medium text-muted">
              Receipt
            </th>
          </tr>
        </thead>
        <tbody>
          {payments.length === 0 && !loading ? (
            <tr>
              <td colSpan={6} className="px-4 py-16 text-center">
                <p className="font-serif text-lg text-ink">No payments match these filters.</p>
                <p className="label mt-2 text-muted">
                  Create one from the demo on the landing page or the API
                </p>
              </td>
            </tr>
          ) : (
            payments.map((p) => (
              <tr
                key={p.orderId}
                className="border-b border-lineSoft last:border-b-0 hover:bg-mist"
              >
                <td className="px-4 py-3.5">
                  <span className="font-mono text-[0.8125rem] text-ink">
                    {p.orderId}
                  </span>
                  {p.simulated ? (
                    <span className="label ml-2 border border-lineStrong px-1.5 py-0.5 text-[0.5625rem] text-muted">
                      Sim
                    </span>
                  ) : null}
                </td>
                <td className="tnum px-4 py-3.5 text-right font-mono text-[0.8125rem] text-ink">
                  {formatSol(p.amount)} {p.asset}
                </td>
                <td className="px-4 py-3.5">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-4 py-3.5 font-mono text-[0.75rem] text-secondary">
                  {p.txHashShort ?? (
                    <span className="text-muted">Awaiting</span>
                  )}
                </td>
                <td className="label px-4 py-3.5 text-muted">
                  {timeAgo(p.createdAt)}
                </td>
                <td className="px-4 py-3.5 text-right">
                  <Link
                    href={`/pay/${p.orderId}`}
                    className="label text-accent hover:text-accentDark"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
