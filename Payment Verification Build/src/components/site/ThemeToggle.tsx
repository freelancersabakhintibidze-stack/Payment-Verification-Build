"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

const noopSubscribe = () => () => {};

/**
 * Hydration-safe mounted check without setState-in-effect: server snapshot
 * is false, client snapshot is true, so markup stays identical until the
 * component is actually interactive.
 */
function useMounted(): boolean {
  const getSnapshot = useCallback(() => true, []);
  return useSyncExternalStore(noopSubscribe, getSnapshot, () => false);
}

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  if (!mounted) {
    return (
      <div
        className="label flex items-center gap-2 border border-line px-3 py-2 text-muted"
        aria-hidden="true"
      >
        <span className="block h-1.5 w-1.5 bg-line" />
        ···
      </div>
    );
  }

  const dark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="label flex items-center gap-2 border border-line px-3 py-2 text-secondary hover:border-ink hover:text-ink"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span
        className={`block h-1.5 w-1.5 ${dark ? "bg-accent" : "bg-ink"}`}
        aria-hidden="true"
      />
      {dark ? "Dark" : "Light"}
    </button>
  );
}
