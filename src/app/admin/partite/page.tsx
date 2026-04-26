"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type {
  Genere,
  MatchWithTeams,
  TeamWithPlayers,
  TournamentWithMatches,
} from "@/types";

function getRoundLabel(round: number, maxRound: number): string {
  if (round === 1) return "🏆 Finale";
  if (round === 2) return "Semifinali";
  if (round === 3) return "Quarti di Finale";
  if (round === 4) return "Ottavi di Finale";
  return `Turno ${maxRound - round + 1}`;
}

function TeamLabel({ team }: { team: TeamWithPlayers | null }) {
  if (!team) return <span className="italic text-cream/40">BYE</span>;
  return (
    <span className="flex items-center gap-2">
      <span className="flex -space-x-2 shrink-0">
        {[team.player1, team.player2].map((p) =>
          p.fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={p.id}
              src={p.fotoUrl}
              alt=""
              className="h-7 w-7 rounded-full object-cover bg-cream/10 ring-2 ring-court-deep"
            />
          ) : (
            <span
              key={p.id}
              className="h-7 w-7 rounded-full bg-cream/10 ring-2 ring-court-deep flex items-center justify-center text-[9px] font-mono"
            >
              {p.nome[0]}
              {p.cognome[0]}
            </span>
          )
        )}
      </span>
      <span className="text-sm">{team.nome}</span>
    </span>
  );
}

function PartitaCard({
  match,
  onAction,
}: {
  match: MatchWithTeams;
  onAction: () => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [winnerId, setWinnerId] = useState("");
  const [punteggio, setPunteggio] = useState("");
  const [busy, setBusy] = useState(false);

  const canStart = !!(match.team1 && match.team2);

  const inizia = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/partite/${match.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ azione: "INIZIA" }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Errore");
      toast.success("Partita iniziata e notificata");
      await onAction();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const termina = async () => {
    if (!winnerId || !punteggio.trim()) {
      toast.error("Vincitore e punteggio richiesti");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/partite/${match.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          azione: "TERMINA",
          winnerId,
          punteggio: punteggio.trim(),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Errore");
      toast.success("Risultato salvato e notificato");
      setShowForm(false);
      setWinnerId("");
      setPunteggio("");
      await onAction();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-md border border-line bg-court-deep p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <TeamLabel team={match.team1} />
          <TeamLabel team={match.team2} />
        </div>
        <div className="text-right">
          {match.stato === "ATTESA" && (
            <span className="text-xs uppercase tracking-widest text-cream/60">
              In attesa
            </span>
          )}
          {match.stato === "IN_CORSO" && (
            <span className="flex items-center gap-1 text-xs uppercase tracking-widest text-court-line font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-court-line opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-court-line" />
              </span>
              Live
            </span>
          )}
          {match.stato === "COMPLETATA" && (
            <div className="text-right">
              <span className="text-xs uppercase tracking-widest text-clay font-semibold">
                Conclusa
              </span>
              <p className="text-sm font-mono text-cream/85 mt-1">
                {match.punteggio}
              </p>
              {match.winner && (
                <p className="text-xs text-court-line font-semibold">
                  🏆 {match.winner.nome}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {match.stato === "ATTESA" && (
        <Button
          size="sm"
          onClick={inizia}
          disabled={!canStart || busy}
          className="bg-court-line text-court hover:bg-[#e7ff75]"
        >
          ▶ Inizia Partita
        </Button>
      )}

      {match.stato === "IN_CORSO" && !showForm && (
        <Button
          size="sm"
          onClick={() => setShowForm(true)}
          className="bg-cream text-court hover:bg-cream/90"
        >
          ⏹ Inserisci Risultato
        </Button>
      )}

      {match.stato === "IN_CORSO" && showForm && (
        <div className="space-y-3 p-3 rounded-md bg-court-deep/60">
          <div className="space-y-2">
            <Label className="text-xs">Punteggio</Label>
            <Input
              value={punteggio}
              onChange={(e) => setPunteggio(e.target.value)}
              placeholder="Es. 6-3, 7-5"
              className="bg-court-deep border-cream/15"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Vincitore</Label>
            <div className="grid grid-cols-2 gap-2">
              {[match.team1, match.team2].filter(Boolean).map((team) => (
                <button
                  key={team!.id}
                  type="button"
                  onClick={() => setWinnerId(team!.id)}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md border-2 transition-colors text-left",
                    winnerId === team!.id
                      ? "border-court-line bg-court-line/10"
                      : "border-cream/15 hover:border-cream/40 bg-court"
                  )}
                >
                  <TeamLabel team={team} />
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={termina}
              disabled={busy || !winnerId || !punteggio.trim()}
              className="bg-court-line text-court hover:bg-[#e7ff75] flex-1"
            >
              {busy ? "Salvataggio..." : "✓ Conferma e Notifica"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowForm(false);
                setWinnerId("");
                setPunteggio("");
              }}
            >
              Annulla
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PartitePage() {
  const [genereAttivo, setGenereAttivo] = useState<Genere>("MASCHILE");
  const [torneo, setTorneo] = useState<TournamentWithMatches | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tornei?genere=${genereAttivo}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const tornei = (await res.json()) as TournamentWithMatches[];
        const attivo =
          tornei.find((t) => t.stato === "ATTIVO") ??
          tornei.find((t) => t.stato === "BOZZA" && t.matches.length > 0) ??
          tornei[0] ??
          null;
        setTorneo(attivo);
      }
    } finally {
      setLoading(false);
    }
  }, [genereAttivo]);

  useEffect(() => {
    load();
  }, [load]);

  const matchesByRound = (torneo?.matches ?? []).reduce<
    Record<number, MatchWithTeams[]>
  >((acc, m) => {
    (acc[m.round] ??= []).push(m);
    return acc;
  }, {});

  const rounds = Object.keys(matchesByRound)
    .map(Number)
    .sort((a, b) => b - a);
  const maxRound = rounds[0] ?? 0;

  return (
    <div className="mx-auto max-w-[1400px] px-6 md:px-12 py-12">
      <div className="grid grid-cols-12 gap-6 items-end mb-12">
        <div className="col-span-12 md:col-span-7">
          <div className="text-eyebrow text-cream/50 mb-3">04 / Diretta</div>
          <h1 className="text-display-jumbo text-cream text-[10vw] md:text-[6vw]">
            Partite
          </h1>
        </div>
        <div className="col-span-12 md:col-span-5 md:pl-8 md:border-l border-line">
          <p className="text-cream/70 leading-relaxed">
            Ogni azione qui invia un overlay sui tabelloni del club. Click su{" "}
            <em className="font-display italic text-court-line">Inizia</em> per
            partire, poi inserisci punteggio e vincitore quando il match si
            chiude.
          </p>
        </div>
      </div>

      <Tabs
        value={genereAttivo}
        onValueChange={(v) => setGenereAttivo(v as Genere)}
        className="mb-6"
      >
        <TabsList className="bg-court-deep">
          <TabsTrigger value="MASCHILE">Maschile</TabsTrigger>
          <TabsTrigger value="FEMMINILE">Femminile</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <p className="text-cream/60">Caricamento...</p>
      ) : !torneo ? (
        <p className="text-cream/60">
          Nessun torneo {genereAttivo.toLowerCase()} disponibile. Creane uno e
          sorteggia il bracket dalla pagina Tornei.
        </p>
      ) : !torneo.matches.length ? (
        <p className="text-cream/60">
          Torneo &quot;{torneo.nome}&quot; senza partite. Esegui il sorteggio dalla pagina
          Tornei.
        </p>
      ) : (
        <div className="space-y-8">
          <p className="text-sm text-cream/60">
            Torneo: <strong className="text-white">{torneo.nome}</strong> · {torneo.anno}
          </p>
          {rounds.map((round) => (
            <section key={round}>
              <h2 className="text-lg font-semibold mb-3 uppercase tracking-widest text-cream/80">
                {getRoundLabel(round, maxRound)}
              </h2>
              <div className="grid md:grid-cols-2 gap-3">
                {matchesByRound[round]
                  .sort((a, b) => a.posizione - b.posizione)
                  .map((m) => (
                    <PartitaCard key={m.id} match={m} onAction={load} />
                  ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
