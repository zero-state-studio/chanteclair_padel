"use client";

import { useCallback, useState } from "react";
import { TabelloneClient } from "@/components/TabelloneClient";
import { useRealtime } from "@/hooks/useRealtime";
import type { Genere, LiveEvent, TournamentWithMatches } from "@/types";

interface TabelloneShellProps {
  torneoIniziale: TournamentWithMatches | null;
  genere: Genere;
  emptyLabel: string;
}

export function TabelloneShell({
  torneoIniziale,
  genere,
  emptyLabel,
}: TabelloneShellProps) {
  const [torneo, setTorneo] = useState<TournamentWithMatches | null>(
    torneoIniziale
  );
  const [animVersion, setAnimVersion] = useState(0);

  const fetchTorneo = useCallback(
    async (id: string): Promise<TournamentWithMatches | null> => {
      try {
        const res = await fetch(`/api/tornei/${id}`, { cache: "no-store" });
        if (!res.ok) return null;
        return (await res.json()) as TournamentWithMatches;
      } catch {
        return null;
      }
    },
    []
  );

  const handleEvent = useCallback(
    (event: LiveEvent) => {
      if (event.tipo === "TORNEO_INIZIATO") {
        if (event.genere !== genere) return;
        (async () => {
          const t = await fetchTorneo(event.tournamentId);
          if (t) setTorneo(t);
        })();
        return;
      }
      if (event.tipo === "GIRONI_ANIMATION") {
        if (event.genere !== genere) return;
        (async () => {
          const t = await fetchTorneo(event.tournamentId);
          if (t) {
            setTorneo(t);
            setAnimVersion((v) => v + 1);
          }
        })();
        return;
      }
    },
    [genere, fetchTorneo]
  );

  useRealtime(handleEvent);

  if (!torneo) {
    return (
      <div className="relative z-[2] flex-1 flex flex-col items-center justify-center text-center px-6">
        <div
          className="cc-display"
          style={{ fontSize: 80, color: "var(--color-paper)" }}
        >
          {emptyLabel}
        </div>
        <div className="cc-mono mt-4" style={{ color: "oklch(0.7 0.02 255)" }}>
          torna presto
        </div>
      </div>
    );
  }

  return (
    <TabelloneClient
      key={`tc-${torneo.id}-${animVersion}`}
      torneoIniziale={torneo}
      genere={genere}
      autoStartAnimationOnMount={animVersion > 0}
    />
  );
}
