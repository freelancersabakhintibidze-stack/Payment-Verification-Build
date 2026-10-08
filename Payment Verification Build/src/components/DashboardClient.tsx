"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PaymentTable from "@/components/PaymentTable";
import RevenueCard from "@/components/RevenueCard";
import SkeletonRows from "@/components/SkeletonRows";
import { PAYMENT_STATUSES, type PaymentStatus } from "@/lib/status";
import { formatSol } from "@/lib/format";
import type { PublicPayment } from "@/lib/serialize";

type Summary = {
  volumeTotal: number;
  settledCount: number;
  pendingCount: number;
  confirmingCount: number;
  failedCount: number;
  deliveredCount: number;
  volume24h: number;
};

type Filters = {
  status: PaymentStatus | "";
  range: "24h" | "7d" | "30d" | "all";
  min: string;
  max: string;
  q: string;
  page: number;
};

const INITIAL_FILTERS: Filters = {
  status: "",
  range: "all",
  min: "",
  max: "",
  q: "",
  page: 1,
};

export default function DashboardClient({
  initialPayments,
  initialTotal,
  initialSummary,
}: {
  initialPayments: PublicPayment[];
  initialTotal: number;
  initialSummary: Summary;
}) {
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [payments, setPayments] = useState<PublicPayment[]>(initialPayments);
  const [total, setTotal] = useState(initialTotal);
  const [summary, setSummary] = useState<Summary>(initialSummary);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const firstLoad = useRef(true);
  const requestId = useRef(0);

  const query = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.range !== "all") params.set("range", filters.range);
    if (filters.min) params.set("min", filters.min);
    if (filters.max) params.set("max", filters.max);
    if (filters.q) params.set("q", filters.q);
    params.set("page", String(filters.page));
    params.set("pageSize", "25");
    return params;
  }, [filters]);

  const fetchData = useCallback(
    async (silent = false) => {
      const id = ++requestId.current;
      if (!silent) setLoading(true);
      try {
        const res = await fetch(`/api/dashboard/payments?${query()}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (id !== requestId.current) return;
        if (!res.ok) {
          setError(data.error ?? "Request failed.");
          return;
        }
        setPayments(data.payments);
        setTotal(data.total);
        setSummary(data.summary);
        setError(null);
        setLastRefresh(new Date());
      } catch {
        if (id === requestId.current) {
          setError("Network error while loading the ledger.");
        }
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          firstLoad.current = false;
        }
      }
    },
    [query],
  );

  // Debounced search text -> refetch
  const [qInput, setQInput] = useState(INITIAL_FILTERS.q);
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => (f.q === qInput ? f : { ...f, q: qInput, page: 1 }));
    }, 350);
    return () => clearTimeout(t);
  }, [qInput]);

  // Immediate refetch on any filter change
  useEffect(() => {
    fetchData();
  }, [filters, fetchData]);

  // Auto refresh every 8s, paused when the tab is hidden or toggled off
  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") fetchData(true);
    }, 8_000);
    return () => clearInterval(t);
  }, [autoRefresh, fetchData]);

  function exportCsv() {
    const params = query();
    params.set("csv", "1");
    window.location.href = `/api/dashboard/payments?${params}`;
  }

  const pageCount = Math.max(1, Math.ceil(total / 25));

  return (
    <div>
      {/* Revenue ledger strip */}
      <div className="frame mb-10 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <RevenueCard
          label="Settled volume"
          value={`${formatSol(summary.volumeTotal)} SOL`}
          sub={`${summary.settledCount} verified + delivered`}
        />
        <RevenueCard
          label="Volume 24h"
          value={`${formatSol(summary.volume24h)} SOL`}
          sub="Confirmed in the last day"
        />
        <RevenueCard
          label="Pending"
          value={String(summary.pendingCount + summary.confirmingCount)}
          sub={`${summary.confirmingCount} confirming now`}
          tone="warn"
        />
        <RevenueCard
          label="Delivered"
          value={String(summary.deliveredCount)}
          sub="Auto-delivery completed"
          tone="ok"
        />
        <RevenueCard
          label="Failed"
          value={String(summary.failedCount)}
          sub="Expired without payment"
          tone="fail"
        />
      </div>

      {/* Filter bar */}
      <div className="mb-5 flex flex-wrap items-end gap-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
          <button
            type="button"
            onClick={() => setFilters((f) => ({ ...f, status: "", page: 1 }))}
            className={`chip ${filters.status === "" ? "border-ink bg-ink text-paper" : "text-secondary"}`}
            aria-pressed={filters.status === ""}
          >
            All
          </button>
          {PAYMENT_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilters((f) => ({ ...f, status: s, page: 1 }))}
              className={`chip ${filters.status === s ? "border-ink bg-ink text-paper" : "text-secondary"}`}
              aria-pressed={filters.status === s}
            >
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-3">
          <label className="label flex items-center gap-2 text-muted">
            Range
            <select
              value={filters.range}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  range: e.target.value as Filters["range"],
                  page: 1,
                }))
              }
              className="field !w-auto !py-1.5"
            >
              <option value="all">All time</option>
              <option value="24h">24 hours</option>
              <option value="7d">7 days</option>
              <option value="30d">30 days</option>
            </select>
          </label>

          <label className="label flex items-center gap-2 text-muted">
            Min
            <input
              type="number"
              step="any"
              min="0"
              value={filters.min}
              onChange={(e) =>
                setFilters((f) => ({ ...f, min: e.target.value, page: 1 }))
              }
              className="field !w-24 !py-1.5"
              placeholder="0"
              aria-label="Minimum amount"
            />
          </label>
          <label className="label flex items-center gap-2 text-muted">
            Max
            <input
              type="number"
              step="any"
              min="0"
              value={filters.max}
              onChange={(e) =>
                setFilters((f) => ({ ...f, max: e.target.value, page: 1 }))
              }
              className="field !w-24 !py-1.5"
              placeholder="∞"
              aria-label="Maximum amount"
            />
          </label>

          <input
            type="search"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            className="field !w-56"
            placeholder="Order, tx, sender"
            aria-label="Search orders"
          />

          <button type="button" onClick={exportCsv} className="btn-ghost">
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={loading}
            className="btn-ghost"
          >
            {loading ? "Syncing" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={() => setAutoRefresh((v) => !v)}
            className={`chip ${autoRefresh ? "border-ok text-ok" : "text-muted"}`}
            aria-pressed={autoRefresh}
            title="Poll the ledger every 8 seconds"
          >
            <span
              className={`block h-1.5 w-1.5 ${autoRefresh ? "bg-ok" : "bg-lineStrong"}`}
              aria-hidden="true"
            />
            Live
          </button>
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="mb-5 border border-fail px-4 py-3 font-mono text-[0.8125rem] text-fail"
        >
          {error}
        </p>
      ) : null}

      {/* Table with skeleton loaders */}
      {loading && firstLoad.current ? (
        <div className="frame overflow-hidden">
          <SkeletonRows rows={7} />
        </div>
      ) : (
        <div aria-busy={loading}>
          <PaymentTable payments={payments} loading={loading} />
        </div>
      )}

      {/* Pagination footer */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <p className="label text-muted">
          {total} payment{total === 1 ? "" : "s"} · Updated{" "}
          {lastRefresh.toLocaleTimeString()} · {autoRefresh ? "Live" : "Paused"}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-ghost"
            disabled={filters.page <= 1 || loading}
            onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
          >
            ← Prev
          </button>
          <span className="label text-secondary">
            Page {filters.page} / {pageCount}
          </span>
          <button
            type="button"
            className="btn-ghost"
            disabled={filters.page >= pageCount || loading}
            onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
