"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useSSE } from "@/hooks/useSSE";
import { LiveMatchOverlay } from "@/components/LiveMatchOverlay";
import { MatchLiveClient } from "@/components/MatchLiveClient";
import type {
  FieldLite,
  Genere,
  LiveEvent,
  MatchLiveEvent,
  MatchWithTeams,
  SponsorLite,
} from "@/types";

interface Props {
  field: FieldLite;
  matchIniziale: MatchWithTeams | null;
  sponsors: SponsorLite[];
}

const FINITA_DISMISS_MS = 12000;
const SPONSOR_ROTATE_MS = 5500;

export function CampoLiveClient({ field, matchIniziale, sponsors }: Props) {
  const [match, setMatch] = useState<MatchWithTeams | null>(matchIniziale);
  const [overlayEvent, setOverlayEvent] = useState<MatchLiveEvent | null>(null);
  const finiteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchMatch = useCallback(async () => {
    try {
      const res = await fetch(`/api/campi/${field.id}/match`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as MatchWithTeams | null;
      setMatch(data);
    } catch {
      // ignore
    }
  }, [field.id]);

  const handleEvent = useCallback(
    (event: LiveEvent) => {
      if (event.tipo === "SPONSOR_SHOWCASE") return;

      if (
        event.tipo === "PARTITA_INIZIATA" &&
        event.field?.id === field.id
      ) {
        setOverlayEvent(event);
        fetchMatch();
        return;
      }

      if (!match) return;
      if (event.matchId !== match.id) return;

      if (event.tipo === "PARTITA_FINITA") {
        setOverlayEvent(event);
        if (finiteTimer.current) clearTimeout(finiteTimer.current);
        finiteTimer.current = setTimeout(() => {
          setMatch(null);
        }, FINITA_DISMISS_MS);
      }
    },
    [field.id, match, fetchMatch]
  );

  useEffect(
    () => () => {
      if (finiteTimer.current) clearTimeout(finiteTimer.current);
    },
    []
  );

  useSSE(handleEvent);

  return (
    <>
      {match ? (
        <MatchLiveClient
          key={match.id}
          matchIniziale={match}
          genere={
            ((match as unknown as { tournament?: { genere: Genere } }).tournament
              ?.genere ?? "MASCHILE") as Genere
          }
          torneoNome={
            (match as unknown as { tournament?: { nome: string } }).tournament
              ?.nome ?? "Chanteclair"
          }
        />
      ) : (
        <CampoIdle field={field} sponsors={sponsors} />
      )}

      <LiveMatchOverlay
        event={overlayEvent}
        onClose={() => setOverlayEvent(null)}
      />
    </>
  );
}

function CampoIdle({
  field,
  sponsors,
}: {
  field: FieldLite;
  sponsors: SponsorLite[];
}) {
  const [idx, setIdx] = useState(0);
  const safe = useMemo(
    () => (sponsors.length > 0 ? sponsors : []),
    [sponsors]
  );

  useEffect(() => {
    if (safe.length < 2) return;
    const t = setInterval(
      () => setIdx((i) => (i + 1) % safe.length),
      SPONSOR_ROTATE_MS
    );
    return () => clearInterval(t);
  }, [safe.length]);

  const current = safe[idx] ?? null;

  return (
    <div className="relative z-[1] flex flex-col min-h-screen w-full max-w-[1600px] mx-auto px-6 md:px-12 py-8 md:py-12">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-eyebrow text-paper/60">
          Chanteclair Padel Cup · 13.06.2026
        </div>
        <div className="text-eyebrow flex items-center gap-2">
          <span
            className="relative inline-flex h-2 w-2 rounded-full"
            style={{ background: "oklch(0.7 0.18 140)" }}
          />
          <span style={{ color: "oklch(0.7 0.18 140)", letterSpacing: "0.3em" }}>
            campo libero
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center gap-10 md:gap-16">
        <div>
          <div
            className="text-eyebrow text-paper/40 mb-4"
            style={{ letterSpacing: "0.4em" }}
          >
            ◆ campo
          </div>
          <h1
            className="cc-display text-paper"
            style={{
              fontSize: "clamp(80px, 14vw, 260px)",
              lineHeight: 0.85,
              letterSpacing: "0.005em",
            }}
          >
            {field.nome}
          </h1>
          {field.descrizione && (
            <p
              className="cc-mono text-paper/55 mt-4 max-w-[60ch] mx-auto"
              style={{ fontSize: 14, letterSpacing: "0.08em" }}
            >
              {field.descrizione}
            </p>
          )}
        </div>

        {safe.length > 0 && (
          <div className="w-full max-w-[820px]">
            <div
              className="text-eyebrow text-paper/40 mb-6 text-center"
              style={{ letterSpacing: "0.4em" }}
            >
              — i nostri partner —
            </div>
            <AnimatePresence mode="wait">
              {current && (
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, y: 24, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -16, scale: 0.95 }}
                  transition={{ duration: 0.55, ease: [0.22, 0.9, 0.34, 1] }}
                  className="flex flex-col items-center gap-6"
                >
                  {current.logoUrl ? (
                    <div
                      className="rounded-md p-6 md:p-8 bg-paper/[0.04] border border-paper/15"
                      style={{
                        boxShadow:
                          "0 0 0 1px var(--color-yellow), 0 0 80px rgba(236,210,74,0.15)",
                      }}
                    >
                      <Image
                        src={current.logoUrl}
                        alt={current.nome}
                        width={320}
                        height={180}
                        className="object-contain"
                        style={{
                          height: "clamp(120px, 18vh, 220px)",
                          width: "auto",
                          maxWidth: "min(70vw, 600px)",
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      className="cc-display"
                      style={{ fontSize: "clamp(56px, 9vw, 140px)" }}
                    >
                      🏷️
                    </div>
                  )}
                  <div
                    className="cc-display text-paper"
                    style={{
                      fontSize: "clamp(28px, 4vw, 56px)",
                      lineHeight: 1,
                      letterSpacing: "0.01em",
                    }}
                  >
                    {current.nome}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {safe.length > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                {safe.map((s, i) => (
                  <span
                    key={s.id}
                    className="inline-block transition-all"
                    style={{
                      width: i === idx ? 24 : 6,
                      height: 3,
                      background:
                        i === idx
                          ? "var(--color-yellow)"
                          : "oklch(0.4 0.04 255)",
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="text-eyebrow text-paper/40 text-center mt-8">
        in attesa della prossima partita
      </div>
    </div>
  );
}
