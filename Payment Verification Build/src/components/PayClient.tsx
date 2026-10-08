"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import StatusBadge from "@/components/StatusBadge";
import CopyButton from "@/components/CopyButton";
import type { PublicPayment } from "@/lib/serialize";
import type { PaymentStatus } from "@/lib/status";
import { countDown, formatDateTime, formatSol } from "@/lib/format";

const TERMINAL: PaymentStatus[] = ["FAILED", "DELIVERED"];

/**
 * Public receipt / payment page. Polls status, advances verification, and
 * in demo mode offers an honest, clearly-labeled simulate button.
 */
export default function PayClient({
  initialPayment,
  demo,
  qrSvg,
  solanaPayUrl,
}: {
  initialPayment: PublicPayment;
  demo: boolean;
  qrSvg: string;
  solanaPayUrl: string;
}) {
  const [payment, setPayment] = useState(initialPayment);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const status = payment.status as PaymentStatus;
  const terminal = TERMINAL.includes(status);

  // Re-render each second for the countdown
  useEffect(() => {
    if (terminal) return;
    const t = setInterval(() => setTick((v) => v + 1), 1_000);
    return () => clearInterval(t);
  }, [terminal]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/payment/${payment.orderId}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      setPayment(data.payment);
    } catch {
      // transient; next poll will recover
    }
  }, [payment.orderId]);

  const runVerify = useCallback(async () => {
    try {
      const res = await fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: payment.orderId }),
      });
      const data = await res.json();
      if (res.ok && data.payment) setPayment(data.payment);
    } catch {
      // transient; next cycle will retry
    }
  }, [payment.orderId]);

  useEffect(() => {
    if (TERMINAL.includes(status)) return;
    const poll = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      refresh();
    }, 4_000);
    const verify = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      runVerify();
    }, 12_000);
    return () => {
      clearInterval(poll);
      clearInterval(verify);
    };
  }, [status, refresh, runVerify]);

  async function simulate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/demo/simulate-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: payment.orderId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Simulation failed.");
      } else {
        setPayment(data.payment);
        setNotice(
          "Simulated sender paid. Verification will confirm within a few seconds.",
        );
        await runVerify();
      }
    } catch {
      setError("Network error during simulation.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyNow() {
    setBusy(true);
    setError(null);
    try {
      await runVerify();
      setNotice("Chain checked. Status updated if a transaction matched.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-12 lg:grid-cols-12">
      {/* Left column: figure */}
      <div className="lg:col-span-5">
        <figure className="frame p-4 sm:p-5">
          <div className="relative border border-line bg-white p-6 sm:p-10">
            <div
              className="mx-auto w-full max-w-[240px] [&_svg]:h-auto [&_svg]:w-full"
              role="img"
              aria-label={`Solana Pay QR code for ${payment.amount} ${payment.asset}, memo ${payment.memo}`}
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          </div>
          <figcaption className="label mt-3.5 flex items-center justify-between text-muted">
            <span>Solana Pay</span>
            <span>{payment.asset} transfer</span>
          </figcaption>
        </figure>

        <a
          href={solanaPayUrl}
          className="btn-outline mt-5 w-full justify-center"
        >
          Open in wallet
        </a>
        <p className="label mt-3 text-center text-muted">
          Scans and deep links carry the exact amount and memo
        </p>
      </div>

      {/* Right column: invoice */}
      <div className="lg:col-span-7">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={status} />
          {payment.simulated ? (
            <span className="chip border-lineStrong text-muted">
              Simulated transaction
            </span>
          ) : null}
          <span className="label text-muted" aria-hidden={terminal}>
            {!terminal ? countDown(payment.expiresAt) : "Closed"}
          </span>
        </div>

        <h1 className="display-md mt-6 text-inkdeep">
          <span className="tnum">{formatSol(payment.amount)}</span>{" "}
          {payment.asset} due to Aether Arena
        </h1>
        <p className="lede mt-4 max-w-[36rem] text-body">
          Send the exact amount to the address below. The memo binds your
          transfer to this order, and confirmation triggers delivery
          automatically. Keep this receipt open, it updates itself.
        </p>

        <dl className="mt-10 border-t border-line">
          <Row label="Order">
            <span className="font-mono text-[0.8125rem] text-ink">
              {payment.orderId}
            </span>
            <CopyButton value={payment.orderId} />
          </Row>
          <Row label="Recipient">
            <span className="font-mono text-[0.75rem] text-ink">
              {payment.paymentAddress}
            </span>
            <CopyButton value={payment.paymentAddress} />
          </Row>
          <Row label="Memo">
            <span className="font-mono text-[0.8125rem] text-ink">
              {payment.memo}
            </span>
            <CopyButton value={payment.memo} />
          </Row>
          <Row label="Amount">
            <span className="tnum font-mono text-[0.8125rem] text-ink">
              {Number(payment.amount).toFixed(9)} {payment.asset}
            </span>
            <CopyButton value={String(payment.amount)} />
          </Row>
          <Row label="Transaction">
            {payment.txHash ? (
              <>
                <span className="font-mono text-[0.75rem] text-ink">
                  {payment.txHash}
                </span>
                <CopyButton value={payment.txHash} />
              </>
            ) : (
              <span className="font-mono text-[0.75rem] text-muted">
                Not seen on-chain yet
              </span>
            )}
          </Row>
          <Row label="Created">
            <span className="label text-secondary">
              {formatDateTime(payment.createdAt)}
            </span>
          </Row>
          {payment.verifiedAt ? (
            <Row label="Verified">
              <span className="label text-ok">
                {formatDateTime(payment.verifiedAt)}
              </span>
            </Row>
          ) : null}
          {payment.deliveredAt ? (
            <Row label="Delivered">
              <span className="label text-ok">
                {formatDateTime(payment.deliveredAt)}
              </span>
            </Row>
          ) : null}
        </dl>

        {notice ? (
          <p
            role="status"
            className="mt-8 border border-ok px-4 py-3 font-mono text-[0.8125rem] text-ok"
          >
            {notice}
          </p>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="mt-8 border border-fail px-4 py-3 font-mono text-[0.8125rem] text-fail"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          {!terminal ? (
            <>
              <button
                type="button"
                onClick={verifyNow}
                disabled={busy}
                className="btn-outline"
              >
                {busy ? "Checking" : "Check now"}
              </button>
              {demo && status === "PENDING" && !payment.simulated ? (
                <button
                  type="button"
                  onClick={simulate}
                  disabled={busy}
                  className="btn-primary"
                >
                  Simulate sender payment
                </button>
              ) : null}
            </>
          ) : (
            <Link href="/dashboard" className="btn-outline">
              Open dashboard
              <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>

        {status === "DELIVERED" ? (
          <p className="lede mt-6 max-w-[36rem] text-ok">
            This order is fulfilled. The merchant received the delivery
            notification and the transfer is permanently recorded on-chain.
          </p>
        ) : null}
        {status === "FAILED" ? (
          <p className="lede mt-6 max-w-[36rem] text-fail">
            The payment window closed without a matching transfer. Nothing was
            received. Create a new invoice to try again.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-4">
      <dt className="label shrink-0 text-muted">{label}</dt>
      <dd className="flex min-w-0 items-center gap-2 overflow-x-auto">
        {children}
      </dd>
    </div>
  );
}
