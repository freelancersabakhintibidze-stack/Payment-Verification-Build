import { describe, expect, it } from "vitest";
import {
  AMOUNT_WINDOW,
  amountWithinWindow,
  fromLamports,
  isRetryDue,
  MAX_DELIVERY_ATTEMPTS,
  nextRetryDueAt,
  RETRY_DELAYS_MS,
  toLamports,
} from "../match-math";

describe("amountWithinWindow", () => {
  it("accepts exact invoice amount", () => {
    expect(amountWithinWindow(1.0, 1.0)).toBe(true);
  });

  it("accepts slight overpay within 5%", () => {
    expect(amountWithinWindow(1.04, 1.0)).toBe(true);
    expect(amountWithinWindow(1.05, 1.0)).toBe(true);
  });

  it("rejects underpay", () => {
    expect(amountWithinWindow(0.99, 1.0)).toBe(false);
  });

  it("rejects overpay beyond window", () => {
    expect(amountWithinWindow(1.06, 1.0)).toBe(false);
  });

  it("rejects non-finite or non-positive invoice", () => {
    expect(amountWithinWindow(1, NaN)).toBe(false);
    expect(amountWithinWindow(1, 0)).toBe(false);
    expect(amountWithinWindow(NaN, 1)).toBe(false);
  });

  it("exports the same window constant as the engine", () => {
    expect(AMOUNT_WINDOW).toBe(1.05);
  });
});

describe("integer lamports math", () => {
  it("round-trips common SOL amounts", () => {
    expect(toLamports(1)).toBe(1_000_000_000);
    expect(fromLamports(1_000_000_000)).toBe(1);
    expect(toLamports(0.000001)).toBe(1000);
  });

  it("uses Math.round for fractional lamports", () => {
    expect(toLamports(0.0000000004)).toBe(0);
    expect(toLamports(0.0000000006)).toBe(1);
  });
});

describe("delivery retry backoff", () => {
  it("schedules 0s, 60s, 300s", () => {
    expect(RETRY_DELAYS_MS).toEqual([0, 60_000, 300_000]);
    expect(MAX_DELIVERY_ATTEMPTS).toBe(3);
  });

  it("nextRetryDueAt adds delay for attempt index", () => {
    const t0 = 1_000_000;
    expect(nextRetryDueAt(1, t0)).toBe(t0);
    expect(nextRetryDueAt(2, t0)).toBe(t0 + 60_000);
    expect(nextRetryDueAt(3, t0)).toBe(t0 + 300_000);
  });

  it("isRetryDue respects schedule and max attempts", () => {
    const t0 = 1_000_000;
    expect(isRetryDue(1, t0, t0)).toBe(true);
    expect(isRetryDue(2, t0, t0 + 59_999)).toBe(false);
    expect(isRetryDue(2, t0, t0 + 60_000)).toBe(true);
    expect(isRetryDue(4, t0, t0 + 999_999)).toBe(false);
  });
});
