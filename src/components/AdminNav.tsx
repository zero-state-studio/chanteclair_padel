"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Trophy, Users, Swords, Volleyball, LayoutGrid, Tag, MapPin, Sparkles, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin/torneo", label: "Tornei", code: "01", Icon: Trophy },
  { href: "/admin/giocatori", label: "Giocatori", code: "02", Icon: Users },
  { href: "/admin/squadre", label: "Squadre", code: "03", Icon: Swords },
  { href: "/admin/partite", label: "Partite", code: "04", Icon: Volleyball },
  { href: "/admin/tabelloni", label: "Tabelloni", code: "05", Icon: LayoutGrid },
  { href: "/admin/sponsor", label: "Sponsor", code: "06", Icon: Tag },
  { href: "/admin/campi", label: "Campi", code: "07", Icon: MapPin },
  { href: "/admin/animazioni", label: "Animazioni", code: "08", Icon: Sparkles },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Top bar — always visible */}
      <nav className="border-b border-line bg-court-deep sticky top-0 z-30">
        <div className="mx-auto max-w-[1400px] px-4 md:px-12 py-3 md:py-4 flex items-center justify-between gap-4">
          <Link
            href="/admin/torneo"
            className="flex items-baseline gap-2 md:gap-3 text-cream hover:text-court-line transition-colors min-w-0"
          >
            <span className="font-display italic text-xl md:text-2xl leading-none truncate">
              Chanteclair
            </span>
            <span className="hidden md:inline text-eyebrow text-cream/40">
              Sala controllo
            </span>
          </Link>

          {/* Desktop menu */}
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
            className="text-eyebrow text-cream/60 hover:text-clay transition-colors flex items-center gap-2 shrink-0 min-h-[40px] px-2"
            aria-label="Esci"
          >
            <span className="hidden sm:inline">Esci</span>
            <LogOut className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-line bg-court-deep/95 backdrop-blur supports-backdrop-filter:bg-court-deep/80 pb-[env(safe-area-inset-bottom)]"
        aria-label="Navigazione admin"
      >
        <ul className="grid grid-cols-8">
          {navItems.map((item) => {
            const active = pathname?.startsWith(item.href);
            const Icon = item.Icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-1 py-2.5 min-h-[60px] transition-colors",
                    active
                      ? "text-court-line"
                      : "text-cream/60 hover:text-cream"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {active && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 bg-court-line" />
                  )}
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-transform",
                      active && "scale-110"
                    )}
                    aria-hidden
                  />
                  <span className="text-[10px] font-medium tracking-wider uppercase">
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
