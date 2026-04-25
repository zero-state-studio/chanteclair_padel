import Link from "next/link";

interface TabelloneHeaderProps {
  sezione: string;
  titolo: string;
  torneo: { nome: string; anno: number } | null;
}

export function TabelloneHeader({ sezione, titolo, torneo }: TabelloneHeaderProps) {
  return (
    <header className="border-b border-line">
      <div className="mx-auto max-w-[1400px] px-6 md:px-12 py-5 flex items-center justify-between text-eyebrow text-cream/60">
        <Link href="/" className="hover:text-court-line transition-colors">
          ← Chanteclair
        </Link>
        <span>{sezione}</span>
        <Link
          href="/admin/login"
          className="hover:text-court-line transition-colors"
        >
          Arbitro ↗
        </Link>
      </div>
      <div className="mx-auto max-w-[1400px] px-6 md:px-12 py-12 grid grid-cols-12 gap-6 md:gap-10">
        <div className="col-span-12 md:col-span-9">
          <div className="text-eyebrow text-cream/50 mb-3">Tabellone</div>
          <h1 className="text-display-jumbo text-cream text-[18vw] md:text-[10vw]">
            {titolo}
          </h1>
        </div>
        <div className="col-span-12 md:col-span-3 md:pl-8 md:border-l border-line flex flex-col justify-end gap-1">
          {torneo ? (
            <>
              <div className="text-eyebrow text-cream/50">Edizione</div>
              <div className="font-display text-3xl text-cream leading-tight">
                {torneo.nome}
              </div>
              <div className="text-stat text-court-line text-base mt-1">
                {torneo.anno}
              </div>
            </>
          ) : (
            <div className="text-eyebrow text-cream/40">in attesa</div>
          )}
        </div>
      </div>
      <div className="accent-bar" />
    </header>
  );
}
