import Link from "next/link";

export default function PartitaNotFound() {
  return (
    <div className="min-h-screen w-screen bg-night-deep text-paper flex flex-col items-center justify-center gap-6 px-6 text-center">
      <div
        className="cc-display"
        style={{ fontSize: "clamp(60px, 12vw, 120px)", color: "var(--color-paper)", opacity: 0.15 }}
      >
        404
      </div>
      <div className="cc-display" style={{ fontSize: "clamp(20px, 4vw, 36px)" }}>
        Partita non trovata
      </div>
      <p className="cc-mono max-w-sm" style={{ color: "oklch(0.6 0.02 255)", fontSize: 13 }}>
        Questa partita non è disponibile. Potrebbe essere stata aggiornata o il torneo potrebbe essere cambiato.
      </p>
      <div className="flex gap-4 flex-wrap justify-center mt-2">
        <Link
          href="/tabellone-maschile"
          className="cc-mono uppercase transition-colors"
          style={{
            fontSize: 11,
            padding: "8px 20px",
            background: "var(--color-blue)",
            color: "var(--color-night-deep)",
            border: "1px solid var(--color-blue)",
          }}
        >
          Tabellone Maschile
        </Link>
        <Link
          href="/tabellone-femminile"
          className="cc-mono uppercase transition-colors"
          style={{
            fontSize: 11,
            padding: "8px 20px",
            background: "var(--color-pink)",
            color: "var(--color-night-deep)",
            border: "1px solid var(--color-pink)",
          }}
        >
          Tabellone Femminile
        </Link>
      </div>
    </div>
  );
}
