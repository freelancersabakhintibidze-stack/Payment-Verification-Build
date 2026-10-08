"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import StatusBadge from "@/components/StatusBadge";
import type { PublicPayment } from "@/lib/serialize";
import type { PaymentStatus } from "@/lib/status";
import { formatSol } from "@/lib/format";

type LogLine = { at: string; text: string; tone: "ink" | "ok" | "fail" | "muted" };

/**
 * Live demo of the real pipeline: every button hits the production API
 * routes. Nothing is pre-scripted; the state machine you watch is the state
 * machine that ships.
 */
export default function DemoLoop({ demo }: { demo: boolean }) {
  const [amount, setAmount] = useState("0.75");
  const [payment, setPayment] = useState<PublicPayment | null>(null);
  const [log, setLog] = useState<LogLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);

  const addLog = useCallback((text: string, tone: LogLine["tone"] = "ink") => {
    setLog((prev) =>
      [...prev, { at: new Date().toLocaleTimeString(), text, tone }].slice(-8),
    );
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const verifyOnce = useCallback(
    async (orderId: string): Promise<PaymentStatus | null> => {
      try {
        const res = await fetch("/api/payment/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
        const data = await res.json();
        if (!res.ok) {
          addLog(data.error ?? "Verification request failed.", "fail");
          return null;
        }
        const p: PublicPayment = data.payment;
        setPayment(p);
        if (data.transition === "confirming") {
          addLog("Transaction seen on-chain, waiting for confirmation", "muted");
        }
        if (data.transition === "verified") {
          addLog("Payment verified on-chain, delivery triggered", "ok");
        }
        if (data.transition === "delivered") {
          addLog("Order delivered and merchant notified", "ok");
        }
        return p.status as PaymentStatus;
      } catch {
        return null;
      }
    },
    [addLog],
  );

  async function createInvoice() {
    setBusy(true);
    setError(null);
    stopPolling();
    setLog([]);
    try {
      const res = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount), expiresInMinutes: 30 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create the invoice.");
        return;
      }
      setPayment(data.payment);
      addLog(`Invoice ${data.payment.orderId} created, status pending`, "ink");
      addLog(`Watching ${data.payment.paymentAddress.slice(0, 10)}… for transfers`, "muted");
    } catch {
      setError("Network error while creating the invoice.");
    } finally {
      setBusy(false);
    }
  }

  async function simulatePayment() {
    if (!payment) return;
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
        return;
      }
      setPayment(data.payment);
      addLog("Sender paid the invoice (simulated)", "ink");

      // Walk the state machine exactly like the production poller would
      pollRef.current = setInterval(async () => {
        const st = await verifyOnce(payment.orderId);
        if (st && ["VERIFIED", "DELIVERED", "FAILED"].includes(st)) {
          stopPolling();
        }
      }, 3_500);
    } catch {
      setError("Network error during simulation.");
    } finally {
      setBusy(false);
    }
  }

  const status = payment ? (payment.status as PaymentStatus) : null;
  const terminalStatus =
    status === "DELIVERED" || status === "VERIFIED" || status === "FAILED";

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      {/* Controls */}
      <div className="lg:col-span-5">
        <div className="frame p-6">
          <p className="label text-muted">Step 1 · Invoice</p>
          <label
            htmlFor="demo-amount"
            className="label mt-5 block text-secondary"
          >
            Amount in SOL
          </label>
          <div className="mt-2 flex">
            <input
              id="demo-amount"
              type="number"
              min="0.001"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={busy || Boolean(payment && !terminalStatus)}
              className="field"
              aria-describedby="demo-amount-note"
            />
          </div>
          <p id="demo-amount-note" className="label mt-2.5 text-muted">
            Exact amount plus a unique offset makes every invoice matchable
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              className="btn-primary"
              onClick={createInvoice}
              disabled={busy || amount === "" || Number(amount) <= 0}
            >
              Create invoice
            </button>
            {payment && status === "PENDING" && !payment.simulated ? (
              <button
                type="button"
                className="btn-outline"
                onClick={simulatePayment}
                disabled={busy || !demo}
                title={demo ? undefined : "Enable DEMO_MODE to simulate"}
              >
                Simulate sender payment
              </button>
            ) : null}
            {terminalStatus ? (
              <button
                type="button"
                className="btn-outline"
                onClick={() => {
                  setPayment(null);
                  setLog([]);
                  stopPolling();
                }}
              >
                Run it again
              </button>
            ) : null}
          </div>

          {error ? (
            <p role="alert" className="mt-5 border border-fail px-4 py-3 font-mono text-[0.8125rem] text-fail">
              {error}
            </p>
          ) : null}
        </div>

        {payment ? (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border border-line bg-mist px-5 py-4">
            <div>
              <p className="label text-muted">Current order</p>
              <p className="tnum mt-1.5 font-mono text-[0.8125rem] text-ink">
                {payment.orderId} · {formatSol(payment.amount)} {payment.asset}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={payment.status as PaymentStatus} />
              <Link
                href={`/pay/${payment.orderId}`}
                className="label text-accent hover:text-accentDark"
              >
                Receipt →
              </Link>
            </div>
          </div>
        ) : null}
      </div>

      {/* Event log */}
      <div className="lg:col-span-7">
        <div className="frame h-full min-h-[280px] p-0">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <p className="label text-muted">Event log · API responses</p>
            <p className="label text-muted">Realtime</p>
          </div>
          <div
            ref={logRef}
            className="max-h-[320px] min-h-[228px] overflow-y-auto px-5 py-4"
            aria-live="polite"
            aria-label="Demo event log"
          >
            {log.length === 0 ? (
              <p className="font-serif text-lg text-muted">
                Create an invoice and the pipeline prints its own transcript
                here, straight from the API.
              </p>
            ) : (
              <ol className="space-y-2.5">
                {log.map((line, i) => (
                  <li key={i} className="flex gap-4 font-mono text-[0.8125rem]">
                    <span className="shrink-0 text-muted">{line.at}</span>
                    <span
                      className={
                        line.tone === "ok"
                          ? "text-ok"
                          : line.tone === "fail"
                            ? "text-fail"
                            : line.tone === "muted"
                              ? "text-muted"
                              : "text-ink"
                      }
                    >
                      {line.text}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
