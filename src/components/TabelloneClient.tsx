"use client";

import { useState, useCallback, useMemo } from "react";
import { Bracket, buildCode } from "@/components/Bracket";
import { LiveStrip } from "@/components/LiveStrip";
import { RoundLabels } from "@/components/RoundLabels";
import { LiveMatchOverlay } from "@/components/LiveMatchOverlay";
import { useSSE } from "@/hooks/useSSE";
import type { TournamentWithMatches, LiveEvent, Genere } from "@/types";

interface TabelloneClientProps {
  torneoIniziale: TournamentWithMatches;
  genere: Genere;
}

export function TabelloneClient({
  torneoIniziale,
  genere,
}: TabelloneClientProps) {
  const [torneo, setTorneo] = useState(torneoIniziale);
  const [liveEvent, setLiveEvent] = useState<LiveEvent | null>(null);
  const [focused, setFocused] = useState<string | null>(null);

  const accent = genere === "MASCHILE" ? "var(--color-blue)" : "var(--color-pink)";

  const handleSSEEvent = useCallback(
    (event: LiveEvent) => {
      if (event.genere !== genere) return;

      setLiveEvent(event);

      setTimeout(async () => {
        try {
          const res = await fetch(`/api/tornei/${torneo.id}`, {
            cache: "no-store",
          });
          if (res.ok) {
            const torneoAggiornato = (await res.json()) as TournamentWithMatches;
            setTorneo(torneoAggiornato);
          }
        } catch {
          // ignora
        }
      }, 1000);
    },
    [torneo.id, genere]
  );

  useSSE(handleSSEEvent);

  const liveMatches = useMemo(
    () => torneo.matches.filter((m) => m.stato === "IN_CORSO"),
    [torneo.matches]
  );

  const roundsSummary = useMemo(() => {
    const map = new Map<number, number>();
    for (const m of torneo.matches) {
      map.set(m.round, (map.get(m.round) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([round, total]) => ({ round, total }))
      .sort((a, b) => b.round - a.round);
  }, [torneo.matches]);

  const maxRound = roundsSummary[0]?.round ?? 1;

  // Auto-focus first live match on mount/update if no manual focus
  const autoFocus = focused ?? (liveMatches[0] ? buildCode(liveMatches[0]) : null);

  return (
    <>
      {/* Live strip */}
      <LiveStrip
        liveMatches={liveMatches}
        focused={autoFocus}
        onFocus={setFocused}
        accent={accent}
      />

      {/* Round labels */}
      <RoundLabels rounds={roundsSummary} maxRound={maxRound} />

      {/* Bracket */}
      <Bracket
        torneo={torneo}
        accent={accent}
        focused={autoFocus}
        onFocus={setFocused}
      />

      {/* Live event overlay (animation on PARTITA_INIZIATA / PARTITA_FINITA) */}
      <LiveMatchOverlay event={liveEvent} onClose={() => setLiveEvent(null)} />
    </>
  );
}
