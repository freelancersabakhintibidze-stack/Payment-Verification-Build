"use client";

import { useEffect, useRef, useState } from "react";

export default function CopyButton({
  value,
  label = "Copy",
  className = "",
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard unavailable (insecure context): select nothing, stay quiet
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`chip ${copied ? "border-ok text-ok" : ""} ${className}`}
      aria-live="polite"
    >
      {copied ? "Copied" : label}
    </button>
  );
}
