"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin/torneo", label: "Tornei", code: "01" },
  { href: "/admin/giocatori", label: "Giocatori", code: "02" },
  { href: "/admin/squadre", label: "Squadre", code: "03" },
  { href: "/admin/partite", label: "Partite", code: "04" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-line bg-court-deep">
      <div className="mx-auto max-w-[1400px] px-6 md:px-12 py-4 flex items-center justify-between gap-6">
        <Link
          href="/admin/torneo"
          className="flex items-baseline gap-3 text-cream hover:text-court-line transition-colors"
        >
          <span className="font-display italic text-2xl leading-none">
            Chanteclair
          </span>
          <span className="text-eyebrow text-cream/40">Sala controllo</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-baseline gap-2 px-4 py-2 rounded-sm transition-colors",
                  active
                    ? "bg-court-line text-court"
                    : "text-cream/70 hover:text-cream hover:bg-cream/5"
                )}
              >
                <span
                  className={cn(
                    "font-mono text-[10px] tracking-widest",
                    active ? "text-court/60" : "text-cream/40"
                  )}
                >
                  {item.code}
                </span>
                <span className="font-body text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="text-eyebrow text-cream/60 hover:text-clay transition-colors flex items-center gap-2"
        >
          <span>Esci</span>
          <span className="font-mono">↗</span>
        </button>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden flex items-center gap-1 px-6 pb-3 overflow-x-auto">
        {navItems.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-3 py-1.5 rounded-sm text-sm font-medium whitespace-nowrap",
                active
                  ? "bg-court-line text-court"
                  : "text-cream/70 hover:text-cream"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
