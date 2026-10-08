"use client";

import { useState } from "react";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

const NAV = [
  { href: "/#loop", label: "The loop" },
  { href: "/#demo", label: "Live demo" },
  { href: "/#architecture", label: "Architecture" },
  { href: "/#stack", label: "Stack" },
  { href: "/#security", label: "Security" },
  { href: "/#faq", label: "FAQ" },
  { href: "/judging", label: "Judging" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-[2px]">
      <div className="shell flex h-14 items-center justify-between gap-6 sm:h-16">
        <Link
          href="/"
          className="group flex items-center gap-3"
          onClick={() => setOpen(false)}
        >
          <span
            className="block h-2.5 w-2.5 bg-accent"
            aria-hidden="true"
          />
          <span className="font-serif text-[1.05rem] font-medium tracking-[-0.02em] text-inkdeep">
            Aether Arena
          </span>
        </Link>

        <nav
          className="hidden items-center gap-7 xl:flex"
          aria-label="Primary"
        >
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="label text-secondary hover:text-ink"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="btn-primary hidden !px-5 !py-2.5 sm:inline-flex"
          >
            Dashboard
          </Link>
          <ThemeToggle />

          <button
            type="button"
            className="label flex items-center gap-2 border border-line px-3 py-2 text-secondary hover:border-ink hover:text-ink xl:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            <span
              className={`block h-1.5 w-1.5 ${open ? "bg-accent" : "bg-lineStrong"}`}
              aria-hidden="true"
            />
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          className="border-t border-line bg-paper xl:hidden"
          aria-label="Mobile"
        >
          <div className="shell flex flex-col py-2">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="label border-b border-lineSoft py-4 text-ink last:border-b-0"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <Link
              href="/dashboard"
              className="btn-primary mb-2 mt-4 w-full justify-center"
              onClick={() => setOpen(false)}
            >
              Open dashboard
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
