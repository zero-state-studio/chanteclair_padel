"use client";

import { useState, useCallback } from "react";
import { Bracket } from "@/components/Bracket";
import { LiveMatchOverlay } from "@/components/LiveMatchOverlay";
import { useSSE } from "@/hooks/useSSE";
import type { TournamentWithMatches, LiveEvent, Genere } from "@/types";

interface TabelloneClientProps {
  torneoIniziale: TournamentWithMatches;
  genere: Genere;
}

export function TabelloneClient({ torneoIniziale, genere }: TabelloneClientProps) {
  const [torneo, setTorneo] = useState(torneoIniziale);
  const [liveEvent, setLiveEvent] = useState<LiveEvent | null>(null);

  const handleSSEEvent = useCallback(
    (event: LiveEvent) => {
      if (event.genere !== genere) return;

      setLiveEvent(event);

      setTimeout(async () => {
        try {
          const res = await fetch(`/api/tornei/${torneo.id}`, { cache: "no-store" });
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

  return (
    <>
      <Bracket torneo={torneo} />
      <LiveMatchOverlay event={liveEvent} onClose={() => setLiveEvent(null)} />
    </>
  );
}
