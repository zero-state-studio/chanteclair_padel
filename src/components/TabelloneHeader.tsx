import Link from "next/link";
import Image from "next/image";
import type { Genere } from "@/types";

interface TabelloneHeaderProps {
  genereAttivo: Genere;
}

export function TabelloneHeader({ genereAttivo }: TabelloneHeaderProps) {
  return (
    <header
      className="relative z-[5] flex items-center justify-between gap-6 px-6 md:px-8 py-3.5 border-b"
      style={{
        background: "oklch(0.16 0.04 255)",
        borderColor: "oklch(0.3 0.04 255)",
      }}
    >
      <Link
        href="/"
        className="flex items-center gap-3 no-underline text-paper"
      >
        <Image
          src="/chantepadel.PNG"
          alt="Chanteclair Padel Cup"
          width={44}
          height={41}
          priority
          className="object-contain"
        />
        <div>
          <div className="cc-display" style={{ fontSize: 18, lineHeight: 1 }}>
            Chanteclair Padel Cup
          </div>
          <div
            className="cc-mono mt-0.5"
            style={{ fontSize: 9, color: "oklch(0.7 0.02 255)" }}
          >
            Tabelloni · 13.06.2026
          </div>
        </div>
      </Link>

      <div className="flex items-center gap-7">
        {/* Tabs M / F (Link — sync URL + SSE filter) */}
        <div
          className="flex"
          style={{ background: "oklch(0.22 0.04 255)" }}
        >
          <TabLink
            href="/tabellone-maschile"
            active={genereAttivo === "MASCHILE"}
            label="Maschile"
            color="var(--color-blue)"
          />
          <TabLink
            href="/tabellone-femminile"
            active={genereAttivo === "FEMMINILE"}
            label="Femminile"
            color="var(--color-pink)"
          />
        </div>

        <div className="hidden md:flex items-center gap-2">
          <span
            className="inline-block"
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "oklch(0.7 0.18 140)",
              boxShadow: "0 0 12px oklch(0.7 0.18 140)",
              animation: "cc-live-pulse 1.4s ease-in-out infinite",
            }}
          />
          <span className="cc-mono" style={{ color: "oklch(0.78 0.02 255)" }}>
            Aggiornato in tempo reale
          </span>
        </div>

        <Link
          href="/"
          className="cc-mono no-underline px-3 py-2"
          style={{
            color: "oklch(0.7 0.02 255)",
            border: "1px solid oklch(0.32 0.05 255)",
          }}
        >
          ← Home
        </Link>
      </div>
    </header>
  );
}

function TabLink({
  href,
  active,
  label,
  color,
}: {
  href: string;
  active: boolean;
  label: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      prefetch
      className="cc-display no-underline transition-colors"
      style={{
        background: active ? color : "transparent",
        padding: "10px 22px 8px",
        fontSize: 22,
        letterSpacing: "0.04em",
        color: active ? "var(--color-paper)" : "oklch(0.65 0.02 255)",
      }}
    >
      {label}
    </Link>
  );
}
