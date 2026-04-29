"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { TabelloneClient } from "@/components/TabelloneClient";
import { toast } from "sonner";
import {
  GENERE_COLOR,
  GENERE_LABEL,
  genereChipStyle,
} from "@/lib/genere-style";
import type { StatoTorneo, TournamentWithMatches } from "@/types";

const STATO_BADGE: Record<StatoTorneo, string> = {
  BOZZA: "bg-cream/20 text-cream",
  ATTIVO: "bg-court-line text-court",
  CONCLUSO: "bg-clay text-cream",
};

export default function TabelloniPage() {
  return (
    <Suspense fallback={null}>
      <TabelloniInner />
    </Suspense>
  );
}

function TabelloniInner() {
  const searchParams = useSearchParams();
  const queryId = searchParams.get("id");
  const [tornei, setTornei] = useState<TournamentWithMatches[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);

  const loadTornei = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tornei", { cache: "no-store" });
      if (!res.ok) throw new Error("Errore caricamento");
      const data = (await res.json()) as TournamentWithMatches[];
      setTornei(data);
      setSelectedId((prev) => {
        if (queryId && data.some((t) => t.id === queryId)) return queryId;
        if (prev && data.some((t) => t.id === prev)) return prev;
        const attivo = data.find((t) => t.stato === "ATTIVO");
        return attivo?.id ?? data[0]?.id ?? null;
      });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [queryId]);

  useEffect(() => {
    loadTornei();
  }, [loadTornei]);

  useEffect(() => {
    if (queryId && tornei.some((t) => t.id === queryId)) {
      setSelectedId(queryId);
    }
  }, [queryId, tornei]);

  const selected = tornei.find((t) => t.id === selectedId) ?? null;

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-12 py-6 md:py-12 space-y-8">
      <div className="grid grid-cols-12 gap-4 md:gap-6 items-end">
        <div className="col-span-12 md:col-span-7">
          <div className="text-eyebrow text-cream/50 mb-2 md:mb-3">05 / Tabelloni</div>
          <h1 className="text-display-jumbo text-cream text-[14vw] sm:text-[10vw] md:text-[6vw] leading-[0.85]">
            Tabelloni
          </h1>
        </div>
        <div className="col-span-12 md:col-span-5 md:pl-8 md:border-l border-line">
          <p className="text-cream/70 text-sm md:text-base leading-relaxed">
            Stato attuale del torneo selezionato. Aggiornamento live durante le
            partite in corso.
          </p>
        </div>
      </div>

      <section className="rounded-sm border border-line bg-court-deep p-5 md:p-6 space-y-4">
        <div className="text-eyebrow text-court-line">— seleziona torneo</div>
        {loading && tornei.length === 0 ? (
          <p className="text-cream/60">Caricamento...</p>
        ) : tornei.length === 0 ? (
          <p className="text-cream/60">
            Nessun torneo disponibile. Creane uno dalla sezione Tornei.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tornei.map((t) => {
              const isActive = t.id === selectedId;
              const accent = GENERE_COLOR[t.genere];
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  className="text-left rounded-md border px-4 py-3 transition-colors hover:bg-cream/5"
                  style={{
                    borderColor: isActive ? accent : "color-mix(in oklch, var(--color-cream) 15%, transparent)",
                    borderLeftWidth: 4,
                    borderLeftColor: accent,
                    background: isActive
                      ? `color-mix(in oklch, ${accent} 12%, transparent)`
                      : "transparent",
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-cream truncate">
                        {t.nome}
                      </div>
                      <div className="text-xs text-cream/60 mt-1 flex items-center gap-2 flex-wrap">
                        <span
                          className="cc-mono text-[10px] tracking-wider px-1.5 py-0.5 rounded-sm uppercase"
                          style={genereChipStyle(t.genere)}
                        >
                          {GENERE_LABEL[t.genere]}
                        </span>
                        <span>· {t.anno} · fase{" "}
                          <span className="text-court-line">{t.fase}</span>
                        </span>
                      </div>
                    </div>
                    <Badge
                      className={`${STATO_BADGE[t.stato]} hover:opacity-100 shrink-0`}
                    >
                      {t.stato}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-cream/50 mt-2">
                    {t.matches.length} partite · {t.groups.length} gironi
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {selected && (
        <section
          className="relative rounded-lg border bg-night-deep overflow-hidden"
          style={{
            borderColor: GENERE_COLOR[selected.genere],
            borderLeftWidth: 6,
          }}
        >
          <div className="cc-stripes absolute inset-0 pointer-events-none opacity-40" />
          <div
            className="relative z-[2] flex items-center justify-between gap-3 px-4 md:px-8 py-4 border-b"
            style={{
              borderColor: `color-mix(in oklch, ${GENERE_COLOR[selected.genere]} 35%, transparent)`,
              background: `color-mix(in oklch, ${GENERE_COLOR[selected.genere]} 8%, transparent)`,
            }}
          >
            <div className="min-w-0 flex items-center gap-3">
              <span
                className="cc-mono text-[10px] tracking-wider px-2 py-1 rounded-sm uppercase shrink-0"
                style={genereChipStyle(selected.genere)}
              >
                {GENERE_LABEL[selected.genere]}
              </span>
              <div className="min-w-0">
                <div className="text-eyebrow text-cream/50">— stato attuale</div>
                <h2 className="text-lg md:text-xl font-semibold text-cream truncate">
                  {selected.nome}{" "}
                  <span style={{ color: GENERE_COLOR[selected.genere] }}>
                    · {selected.fase}
                  </span>
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Button
                size="sm"
                onClick={async () => {
                  if (broadcasting) return;
                  setBroadcasting(true);
                  try {
                    const res = await fetch(
                      `/api/tornei/${selected.id}/anima-gironi`,
                      { method: "POST" }
                    );
                    if (!res.ok) {
                      const err = await res.json().catch(() => ({}));
                      throw new Error(err.error ?? "Errore animazione");
                    }
                    const target =
                      selected.genere === "MASCHILE"
                        ? "/tabellone-maschile"
                        : selected.genere === "FEMMINILE"
                        ? "/tabellone-femminile"
                        : null;
                    toast.success(
                      target
                        ? `Animazione inviata a ${target}`
                        : "Animazione inviata"
                    );
                  } catch (err) {
                    toast.error((err as Error).message);
                  } finally {
                    setBroadcasting(false);
                  }
                }}
                disabled={selected.groups.length === 0 || broadcasting}
                className="bg-court-line text-court hover:bg-[#e7ff75] h-9 gap-2"
                title={
                  selected.groups.length === 0
                    ? "Sorteggia prima i gironi"
                    : `Lancia animazione su /tabellone-${selected.genere.toLowerCase()}`
                }
              >
                <Sparkles className="h-4 w-4" />
                {broadcasting ? "Invio..." : "Animazione gironi"}
              </Button>
              <Badge
                className={`${STATO_BADGE[selected.stato]} hover:opacity-100`}
              >
                {selected.stato}
              </Badge>
            </div>
          </div>
          {selected.matches.length === 0 ? (
            <div className="relative z-[2] py-16 text-center text-cream/60">
              Nessuna partita. Sorteggia i gironi dalla sezione Tornei.
            </div>
          ) : (
            <div className="relative z-[2] flex flex-col min-h-[600px]">
              <TabelloneClient
                key={selected.id}
                torneoIniziale={selected}
                genere={selected.genere}
              />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
