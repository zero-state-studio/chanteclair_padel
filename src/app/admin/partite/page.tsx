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
  MatchWithPlayers,
  PlayerWithMatches,
  TournamentWithMatches,
} from "@/types";

function getRoundLabel(round: number, maxRound: number): string {
  if (round === 1) return "🏆 Finale";
  if (round === 2) return "Semifinali";
  if (round === 3) return "Quarti di Finale";
  if (round === 4) return "Ottavi di Finale";
  return `Turno ${maxRound - round + 1}`;
}

function PlayerLabel({ player }: { player: PlayerWithMatches | null }) {
  if (!player) return <span className="italic text-slate-500">BYE</span>;
  return (
    <span className="flex items-center gap-2">
      {player.fotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={player.fotoUrl}
          alt=""
          className="h-7 w-7 rounded-full object-cover bg-slate-700"
        />
      ) : (
        <span className="h-7 w-7 rounded-full bg-slate-700 flex items-center justify-center text-sm">
          👤
        </span>
      )}
      <span className="text-sm">
        {player.nome} {player.cognome}
      </span>
    </span>
  );
}

function PartitaCard({
  match,
  onAction,
}: {
  match: MatchWithPlayers;
  onAction: () => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [winnerId, setWinnerId] = useState("");
  const [punteggio, setPunteggio] = useState("");
  const [busy, setBusy] = useState(false);

  const canStart = !!(match.player1 && match.player2);

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
    <div className="rounded-md border border-slate-800 bg-slate-900/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <PlayerLabel player={match.player1} />
          <PlayerLabel player={match.player2} />
        </div>
        <div className="text-right">
          {match.stato === "ATTESA" && (
            <span className="text-xs uppercase tracking-widest text-slate-400">
              In attesa
            </span>
          )}
          {match.stato === "IN_CORSO" && (
            <span className="flex items-center gap-1 text-xs uppercase tracking-widest text-green-400 font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              Live
            </span>
          )}
          {match.stato === "COMPLETATA" && (
            <div className="text-right">
              <span className="text-xs uppercase tracking-widest text-blue-400 font-semibold">
                Conclusa
              </span>
              <p className="text-sm font-mono text-slate-200 mt-1">
                {match.punteggio}
              </p>
              {match.winner && (
                <p className="text-xs text-yellow-400 font-semibold">
                  🏆 {match.winner.nome} {match.winner.cognome}
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
          className="bg-green-600 hover:bg-green-500"
        >
          ▶ Inizia Partita
        </Button>
      )}

      {match.stato === "IN_CORSO" && !showForm && (
        <Button
          size="sm"
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-500"
        >
          ⏹ Inserisci Risultato
        </Button>
      )}

      {match.stato === "IN_CORSO" && showForm && (
        <div className="space-y-3 p-3 rounded-md bg-slate-800/60">
          <div className="space-y-2">
            <Label className="text-xs">Punteggio</Label>
            <Input
              value={punteggio}
              onChange={(e) => setPunteggio(e.target.value)}
              placeholder="Es. 6-3, 7-5"
              className="bg-slate-800 border-slate-700"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Vincitore</Label>
            <div className="grid grid-cols-2 gap-2">
              {[match.player1, match.player2].filter(Boolean).map((player) => (
                <button
                  key={player!.id}
                  type="button"
                  onClick={() => setWinnerId(player!.id)}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md border-2 transition-colors text-left",
                    winnerId === player!.id
                      ? "border-green-500 bg-green-950/40"
                      : "border-slate-700 hover:border-slate-500 bg-slate-900"
                  )}
                >
                  <PlayerLabel player={player} />
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={termina}
              disabled={busy || !winnerId || !punteggio.trim()}
              className="bg-green-600 hover:bg-green-500 flex-1"
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
    Record<number, MatchWithPlayers[]>
  >((acc, m) => {
    (acc[m.round] ??= []).push(m);
    return acc;
  }, {});

  const rounds = Object.keys(matchesByRound)
    .map(Number)
    .sort((a, b) => b - a);
  const maxRound = rounds[0] ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Gestione Partite Live</h1>
      </div>

      <Tabs
        value={genereAttivo}
        onValueChange={(v) => setGenereAttivo(v as Genere)}
        className="mb-6"
      >
        <TabsList className="bg-slate-800">
          <TabsTrigger value="MASCHILE">Maschile</TabsTrigger>
          <TabsTrigger value="FEMMINILE">Femminile</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <p className="text-slate-400">Caricamento...</p>
      ) : !torneo ? (
        <p className="text-slate-400">
          Nessun torneo {genereAttivo.toLowerCase()} disponibile. Creane uno e
          sorteggia il bracket dalla pagina Tornei.
        </p>
      ) : !torneo.matches.length ? (
        <p className="text-slate-400">
          Torneo &quot;{torneo.nome}&quot; senza partite. Esegui il sorteggio dalla pagina
          Tornei.
        </p>
      ) : (
        <div className="space-y-8">
          <p className="text-sm text-slate-400">
            Torneo: <strong className="text-white">{torneo.nome}</strong> · {torneo.anno}
          </p>
          {rounds.map((round) => (
            <section key={round}>
              <h2 className="text-lg font-semibold mb-3 uppercase tracking-widest text-slate-300">
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
