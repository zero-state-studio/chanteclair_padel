"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { GironiAnimation } from "@/components/GironiAnimation";
import { FinaliAnimation } from "@/components/FinaliAnimation";
import { LiveMatchOverlay } from "@/components/LiveMatchOverlay";
import { SponsorShowcaseOverlay } from "@/components/SponsorShowcaseOverlay";
import { FinalPresentation } from "@/components/FinalPresentation";
import { FinalVictory } from "@/components/FinalVictory";
import { GENERE_COLOR, GENERE_LABEL, genereChipStyle } from "@/lib/genere-style";
import type {
  BracketTipo,
  FieldLite,
  Genere,
  MatchLiveEvent,
  MatchWithTeams,
  SponsorLite,
  TeamWithPlayers,
  TournamentWithMatches,
} from "@/types";

type LiveKind = "PARTITA_INIZIATA" | "PARTITA_FINITA";

const BRACKETS: BracketTipo[] = ["GOLD", "SILVER", "BRONZE"];

const BRACKET_LABEL: Record<BracketTipo, string> = {
  GOLD: "Gold",
  SILVER: "Silver",
  BRONZE: "Bronze",
};

const BRACKET_ACCENT: Record<BracketTipo, string> = {
  GOLD: "var(--color-yellow)",
  SILVER: "oklch(0.85 0.02 255)",
  BRONZE: "oklch(0.65 0.08 30)",
};

export default function AnimazioniPage() {
  const [tornei, setTornei] = useState<TournamentWithMatches[]>([]);
  const [sponsors, setSponsors] = useState<SponsorLite[]>([]);
  const [fields, setFields] = useState<FieldLite[]>([]);
  const [loading, setLoading] = useState(false);

  const [gironiTorneoId, setGironiTorneoId] = useState<string>("");
  const [liveKind, setLiveKind] = useState<LiveKind>("PARTITA_INIZIATA");
  const [liveTorneoId, setLiveTorneoId] = useState<string>("");
  const [liveMatchId, setLiveMatchId] = useState<string>("");
  const [liveFieldId, setLiveFieldId] = useState<string>("");
  const [liveSponsorId, setLiveSponsorId] = useState<string>("");
  const [liveWinnerSide, setLiveWinnerSide] = useState<"team1" | "team2">(
    "team1"
  );
  const [livePunteggio, setLivePunteggio] = useState<string>("6-3 6-4");
  const [showcaseSel, setShowcaseSel] = useState<Set<string>>(new Set());

  const [finalBracket, setFinalBracket] = useState<BracketTipo>("GOLD");
  const [allTeams, setAllTeams] = useState<TeamWithPlayers[]>([]);
  const [finalKind, setFinalKind] = useState<"INIZIO" | "FINE">("INIZIO");
  const [finalWinnerSide, setFinalWinnerSide] = useState<"team1" | "team2">(
    "team1"
  );
  const [finalScore, setFinalScore] = useState<string>("6-3 6-4");

  const [activeGironi, setActiveGironi] =
    useState<TournamentWithMatches | null>(null);
  const [activeLive, setActiveLive] = useState<MatchLiveEvent | null>(null);
  const [activeShowcase, setActiveShowcase] = useState<SponsorLite[] | null>(
    null
  );
  const [activeFinal, setActiveFinal] = useState<{
    team1: TeamWithPlayers;
    team2: TeamWithPlayers;
    bracket: BracketTipo;
  } | null>(null);
  const [activeVictory, setActiveVictory] = useState<{
    team1: TeamWithPlayers;
    team2: TeamWithPlayers;
    winner: TeamWithPlayers;
    bracket: BracketTipo;
    punteggio: string;
  } | null>(null);
  const [activeFinaliDemo, setActiveFinaliDemo] =
    useState<TournamentWithMatches | null>(null);
  const [finaliGenere, setFinaliGenere] = useState<Genere>("MASCHILE");

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, sRes, fRes, mRes, fmRes] = await Promise.all([
        fetch("/api/tornei", { cache: "no-store" }),
        fetch("/api/sponsors", { cache: "no-store" }),
        fetch("/api/campi", { cache: "no-store" }),
        fetch("/api/squadre?genere=MASCHILE", { cache: "no-store" }),
        fetch("/api/squadre?genere=FEMMINILE", { cache: "no-store" }),
      ]);
      if (tRes.ok) setTornei((await tRes.json()) as TournamentWithMatches[]);
      if (sRes.ok) setSponsors((await sRes.json()) as SponsorLite[]);
      if (fRes.ok) setFields((await fRes.json()) as FieldLite[]);
      const m = mRes.ok ? ((await mRes.json()) as TeamWithPlayers[]) : [];
      const f = fmRes.ok ? ((await fmRes.json()) as TeamWithPlayers[]) : [];
      setAllTeams([...m, ...f]);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const torneiConGironi = useMemo(
    () =>
      tornei.filter(
        (t) =>
          t.groups.length > 0 &&
          t.groups.some((g) => g.groupTeams.length > 0)
      ),
    [tornei]
  );

  const liveTorneo = useMemo(
    () => tornei.find((t) => t.id === liveTorneoId) ?? null,
    [tornei, liveTorneoId]
  );

  const matchesPlayable = useMemo(() => {
    if (!liveTorneo) return [] as MatchWithTeams[];
    return liveTorneo.matches.filter((m) => m.team1 && m.team2);
  }, [liveTorneo]);

  const liveMatch = useMemo(
    () => matchesPlayable.find((m) => m.id === liveMatchId) ?? null,
    [matchesPlayable, liveMatchId]
  );

  useEffect(() => {
    if (!liveMatch) return;
    if (liveMatch.field?.id) setLiveFieldId(liveMatch.field.id);
    if (liveMatch.sponsor?.id) setLiveSponsorId(liveMatch.sponsor.id);
    if (liveMatch.winner?.id && liveMatch.team1) {
      setLiveWinnerSide(
        liveMatch.winner.id === liveMatch.team1.id ? "team1" : "team2"
      );
    }
    if (liveMatch.punteggio) setLivePunteggio(liveMatch.punteggio);
  }, [liveMatch]);

  const launchGironi = () => {
    const t = torneiConGironi.find((x) => x.id === gironiTorneoId);
    if (!t) {
      toast.error("Seleziona un torneo con gironi sorteggiati");
      return;
    }
    setActiveGironi(t);
  };

  const launchLive = () => {
    if (!liveMatch || !liveMatch.team1 || !liveMatch.team2 || !liveTorneo) {
      toast.error("Seleziona una partita con due squadre");
      return;
    }
    const field =
      fields.find((f) => f.id === liveFieldId) ?? liveMatch.field ?? null;
    const sponsor =
      sponsors.find((s) => s.id === liveSponsorId) ?? liveMatch.sponsor ?? null;

    if (liveKind === "PARTITA_INIZIATA") {
      setActiveLive({
        tipo: "PARTITA_INIZIATA",
        matchId: liveMatch.id,
        team1: liveMatch.team1,
        team2: liveMatch.team2,
        genere: liveTorneo.genere,
        sponsor,
        field,
      });
    } else {
      const winner =
        liveWinnerSide === "team1" ? liveMatch.team1 : liveMatch.team2;
      setActiveLive({
        tipo: "PARTITA_FINITA",
        matchId: liveMatch.id,
        team1: liveMatch.team1,
        team2: liveMatch.team2,
        genere: liveTorneo.genere,
        sponsor,
        field,
        winner,
        punteggio: livePunteggio || "—",
      });
    }
  };

  const launchShowcase = () => {
    const sel = sponsors.filter((s) => showcaseSel.has(s.id));
    if (sel.length === 0) {
      toast.error("Seleziona almeno uno sponsor");
      return;
    }
    setActiveShowcase(sel);
  };

  const toggleShowcase = (id: string) =>
    setShowcaseSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const launchFinaliDemo = () => {
    const pool = allTeams.filter((t) => t.genere === finaliGenere);
    if (pool.length < 12) {
      toast.error(
        `Servono almeno 12 squadre ${GENERE_LABEL[finaliGenere]} in archivio (trovate ${pool.length})`
      );
      return;
    }
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 12);
    const tournamentId = `demo-finali-${Date.now()}`;
    const matches: MatchWithTeams[] = [];
    (["GOLD", "SILVER", "BRONZE"] as const).forEach((bracket, bi) => {
      const four = shuffled.slice(bi * 4, bi * 4 + 4);
      for (let i = 0; i < 2; i++) {
        matches.push({
          id: `${tournamentId}-${bracket}-semi-${i}`,
          tournamentId,
          groupId: null,
          bracketTipo: bracket,
          round: 2,
          posizione: i,
          team1: four[i * 2],
          team2: four[i * 2 + 1],
          winner: null,
          punteggio: null,
          set1Team1: null,
          set1Team2: null,
          tieBreakTeam1: null,
          tieBreakTeam2: null,
          stato: "ATTESA",
          iniziataAt: null,
          finitaAt: null,
          sponsorId: null,
          sponsor: null,
          fieldId: null,
          field: null,
        });
      }
    });
    const demo: TournamentWithMatches = {
      id: tournamentId,
      nome: "Demo Finali",
      genere: finaliGenere,
      stato: "ATTIVO",
      fase: "FINALI",
      anno: new Date().getFullYear(),
      matches,
      groups: [],
    };
    setActiveFinaliDemo(demo);
  };

  const launchFinal = () => {
    if (allTeams.length < 2) {
      toast.error("Servono almeno 2 squadre in archivio");
      return;
    }
    const shuffled = [...allTeams].sort(() => Math.random() - 0.5);
    const t1 = shuffled[0];
    const t2 = shuffled[1];
    if (finalKind === "INIZIO") {
      setActiveFinal({ team1: t1, team2: t2, bracket: finalBracket });
    } else {
      const winner = finalWinnerSide === "team1" ? t1 : t2;
      setActiveVictory({
        team1: t1,
        team2: t2,
        winner,
        bracket: finalBracket,
        punteggio: finalScore || "6-0 6-0",
      });
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-12 py-6 md:py-12 space-y-8 md:space-y-12">
      <div className="grid grid-cols-12 gap-4 md:gap-6 items-end">
        <div className="col-span-12 md:col-span-7">
          <div className="text-eyebrow text-cream/50 mb-2 md:mb-3">
            08 / Animazioni
          </div>
          <h1 className="text-display-jumbo text-cream text-[14vw] sm:text-[10vw] md:text-[6vw] leading-[0.85]">
            Animazioni
          </h1>
        </div>
        <div className="col-span-12 md:col-span-5 md:pl-8 md:border-l border-line">
          <p className="text-cream/70 text-sm md:text-base leading-relaxed">
            Anteprima delle animazioni in regia con dati reali. Lancia il
            sorteggio dei gironi, l&apos;intro / verdetto di una partita o lo
            showcase sponsor — visibili solo qui in admin, senza broadcast.
          </p>
        </div>
      </div>

      {loading && <p className="text-cream/60">Caricamento...</p>}

      {/* Sorteggio gironi */}
      <section className="rounded-sm border border-line bg-court-deep p-5 md:p-8">
        <div className="text-eyebrow text-court-line mb-2">— sorteggio</div>
        <h2 className="font-display text-2xl md:text-3xl mb-2 text-cream">
          Animazione gironi
        </h2>
        <p className="text-cream/60 text-sm mb-5">
          Sequenza giocatori → squadre → assegnazione gironi.
        </p>

        {torneiConGironi.length === 0 ? (
          <p className="text-cream/60 text-sm">
            Nessun torneo con gironi sorteggiati. Esegui prima il sorteggio in
            <span className="text-court-line"> Tornei</span>.
          </p>
        ) : (
          <div className="grid md:grid-cols-[1fr_auto] gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="gironi-torneo">Torneo</Label>
              <select
                id="gironi-torneo"
                value={gironiTorneoId}
                onChange={(e) => setGironiTorneoId(e.target.value)}
                className="w-full bg-cream/5 border border-cream/15 text-cream rounded-md h-11 px-3"
              >
                <option value="">— seleziona —</option>
                {torneiConGironi.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome} · {GENERE_LABEL[t.genere as Genere]} · {t.anno} ·{" "}
                    {t.groups.length} gironi
                  </option>
                ))}
              </select>
            </div>
            <Button
              onClick={launchGironi}
              disabled={!gironiTorneoId}
              className="bg-court-line text-court hover:bg-[#e7ff75] h-11 md:w-auto"
            >
              Lancia animazione
            </Button>
          </div>
        )}
      </section>

      {/* Live match overlay */}
      <section className="rounded-sm border border-line bg-court-deep p-5 md:p-8">
        <div className="text-eyebrow text-court-line mb-2">— live</div>
        <h2 className="font-display text-2xl md:text-3xl mb-2 text-cream">
          Overlay partita
        </h2>
        <p className="text-cream/60 text-sm mb-5">
          Intro &laquo;inizia il match&raquo; o riepilogo finale con vincitore e
          punteggio.
        </p>

        <div className="flex gap-2 mb-4">
          {(["PARTITA_INIZIATA", "PARTITA_FINITA"] as LiveKind[]).map((k) => {
            const active = liveKind === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setLiveKind(k)}
                className={`px-4 py-2 rounded-sm border text-sm cc-mono uppercase tracking-wider ${
                  active
                    ? "bg-court-line text-court border-court-line"
                    : "bg-transparent border-cream/20 text-cream/70 hover:bg-cream/5"
                }`}
              >
                {k === "PARTITA_INIZIATA" ? "Iniziata" : "Finita"}
              </button>
            );
          })}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="live-torneo">Torneo</Label>
            <select
              id="live-torneo"
              value={liveTorneoId}
              onChange={(e) => {
                setLiveTorneoId(e.target.value);
                setLiveMatchId("");
              }}
              className="w-full bg-cream/5 border border-cream/15 text-cream rounded-md h-11 px-3"
            >
              <option value="">— seleziona —</option>
              {tornei.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome} · {GENERE_LABEL[t.genere as Genere]} · {t.anno}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="live-match">Partita</Label>
            <select
              id="live-match"
              value={liveMatchId}
              onChange={(e) => setLiveMatchId(e.target.value)}
              disabled={!liveTorneo}
              className="w-full bg-cream/5 border border-cream/15 text-cream rounded-md h-11 px-3 disabled:opacity-50"
            >
              <option value="">— seleziona —</option>
              {matchesPlayable.map((m) => (
                <option key={m.id} value={m.id}>
                  {matchLabel(m)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="live-field">Campo (override)</Label>
            <select
              id="live-field"
              value={liveFieldId}
              onChange={(e) => setLiveFieldId(e.target.value)}
              className="w-full bg-cream/5 border border-cream/15 text-cream rounded-md h-11 px-3"
            >
              <option value="">— nessuno —</option>
              {fields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="live-sponsor">Sponsor (override)</Label>
            <select
              id="live-sponsor"
              value={liveSponsorId}
              onChange={(e) => setLiveSponsorId(e.target.value)}
              className="w-full bg-cream/5 border border-cream/15 text-cream rounded-md h-11 px-3"
            >
              <option value="">— nessuno —</option>
              {sponsors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome ?? `(solo logo) ${s.id.slice(-4)}`}
                </option>
              ))}
            </select>
          </div>

          {liveKind === "PARTITA_FINITA" && liveMatch?.team1 && liveMatch.team2 && (
            <>
              <div className="space-y-2">
                <Label>Vincitore</Label>
                <div className="flex gap-2">
                  {(["team1", "team2"] as const).map((side) => {
                    const team =
                      side === "team1" ? liveMatch.team1 : liveMatch.team2;
                    if (!team) return null;
                    const active = liveWinnerSide === side;
                    return (
                      <button
                        key={side}
                        type="button"
                        onClick={() => setLiveWinnerSide(side)}
                        className={`flex-1 px-3 py-2 rounded-sm border text-sm text-left ${
                          active
                            ? "bg-court-line/10 border-court-line text-cream"
                            : "bg-transparent border-cream/15 text-cream/70 hover:bg-cream/5"
                        }`}
                      >
                        <div className="text-[10px] cc-mono uppercase tracking-wider text-cream/50">
                          {side === "team1" ? "Team A" : "Team B"}
                        </div>
                        <div className="text-sm font-semibold truncate">
                          {team.player1.cognome} / {team.player2.cognome}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="live-score">Punteggio</Label>
                <input
                  id="live-score"
                  value={livePunteggio}
                  onChange={(e) => setLivePunteggio(e.target.value)}
                  placeholder="6-3 6-4"
                  className="w-full bg-cream/5 border border-cream/15 text-cream rounded-md h-11 px-3"
                />
              </div>
            </>
          )}
        </div>

        {liveMatch && (
          <div className="mt-4 p-3 rounded-sm border border-cream/10 bg-cream/[0.02] text-sm text-cream/70">
            {liveTorneo && (
              <span
                className="cc-mono text-[10px] tracking-wider px-1.5 py-0.5 rounded-sm uppercase mr-2"
                style={genereChipStyle(liveTorneo.genere as Genere)}
              >
                {GENERE_LABEL[liveTorneo.genere as Genere]}
              </span>
            )}
            <strong className="text-cream">
              {liveMatch.team1?.player1.cognome}/
              {liveMatch.team1?.player2.cognome}
            </strong>{" "}
            vs{" "}
            <strong className="text-cream">
              {liveMatch.team2?.player1.cognome}/
              {liveMatch.team2?.player2.cognome}
            </strong>
            {liveMatch.field && (
              <span className="ml-2 text-cream/50">
                · campo {liveMatch.field.nome}
              </span>
            )}
            {liveMatch.winner && (
              <span className="ml-2 text-court-line">
                · vincitore {liveMatch.winner.player1.cognome}/
                {liveMatch.winner.player2.cognome}
              </span>
            )}
          </div>
        )}

        <div className="mt-5">
          <Button
            onClick={launchLive}
            disabled={!liveMatch}
            className="bg-court-line text-court hover:bg-[#e7ff75] h-11"
          >
            Lancia overlay
          </Button>
        </div>
      </section>

      {/* Sponsor showcase */}
      <section className="rounded-sm border border-line bg-court-deep p-5 md:p-8">
        <div className="text-eyebrow text-court-line mb-2">— partner</div>
        <h2 className="font-display text-2xl md:text-3xl mb-2 text-cream">
          Sponsor showcase
        </h2>
        <p className="text-cream/60 text-sm mb-5">
          Schermata partner del torneo. Seleziona uno o più sponsor.
        </p>

        {sponsors.length === 0 ? (
          <p className="text-cream/60 text-sm">Nessuno sponsor in archivio.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-5">
              {sponsors.map((s) => {
                const active = showcaseSel.has(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleShowcase(s.id)}
                    className={`px-3 py-2 rounded-sm border text-sm transition-colors ${
                      active
                        ? "bg-court-line/10 border-court-line text-cream"
                        : "bg-transparent border-cream/15 text-cream/70 hover:bg-cream/5"
                    }`}
                  >
                    {s.logoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.logoUrl}
                        alt={s.nome ?? "sponsor"}
                        className="inline-block h-6 w-6 rounded-sm object-contain bg-cream/10 p-0.5 mr-2 align-middle"
                      />
                    )}
                    {s.nome ?? <span className="italic text-cream/60">solo logo</span>}
                    {active && (
                      <Badge className="ml-2 bg-court-line text-court">
                        ✓
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
            <Button
              onClick={launchShowcase}
              disabled={showcaseSel.size === 0}
              className="bg-court-line text-court hover:bg-[#e7ff75] h-11"
            >
              Lancia showcase ({showcaseSel.size})
            </Button>
          </>
        )}
      </section>

      {/* Sorteggio semifinali */}
      <section className="rounded-sm border border-line bg-court-deep p-5 md:p-8">
        <div className="text-eyebrow text-court-line mb-2">— semifinali</div>
        <h2 className="font-display text-2xl md:text-3xl mb-2 text-cream">
          Animazione sorteggio semifinali
        </h2>
        <p className="text-cream/60 text-sm mb-5">
          Cicla GOLD → SILVER → BRONZE: 4 squadre per categoria in cerchio, poi
          accoppiate nelle 2 semifinali. Usa 12 squadre random dall&apos;archivio.
        </p>

        <div className="space-y-2 mb-5">
          <Label>Genere</Label>
          <div className="flex gap-2">
            {(["MASCHILE", "FEMMINILE"] as const).map((g) => {
              const active = finaliGenere === g;
              const pool = allTeams.filter((t) => t.genere === g).length;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => setFinaliGenere(g)}
                  className={`flex-1 px-3 py-2 rounded-sm border text-sm cc-mono uppercase tracking-wider transition-colors ${
                    active
                      ? "bg-court-line/10 border-court-line text-cream"
                      : "bg-transparent border-cream/15 text-cream/70 hover:bg-cream/5"
                  }`}
                >
                  {GENERE_LABEL[g]} ({pool})
                </button>
              );
            })}
          </div>
        </div>

        <Button
          onClick={launchFinaliDemo}
          disabled={allTeams.filter((t) => t.genere === finaliGenere).length < 12}
          className="bg-court-line text-court hover:bg-[#e7ff75] h-11"
        >
          Lancia animazione semifinali
        </Button>
      </section>

      {/* Finale tabellone */}
      <section className="rounded-sm border border-line bg-court-deep p-5 md:p-8">
        <div className="text-eyebrow text-court-line mb-2">— finale</div>
        <h2 className="font-display text-2xl md:text-3xl mb-2 text-cream">
          Animazioni finale
        </h2>
        <p className="text-cream/60 text-sm mb-5">
          Inizio: ingresso, esplosione, faceoff. Fine: vincitore distrugge
          avversario, CAMPIONI, confetti. Anteprima con 2 squadre random
          dall&apos;archivio ({allTeams.length}).
        </p>

        <div className="flex gap-2 mb-4">
          {(["INIZIO", "FINE"] as const).map((k) => {
            const active = finalKind === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setFinalKind(k)}
                className={`px-4 py-2 rounded-sm border text-sm cc-mono uppercase tracking-wider ${
                  active
                    ? "bg-court-line text-court border-court-line"
                    : "bg-transparent border-cream/20 text-cream/70 hover:bg-cream/5"
                }`}
              >
                {k === "INIZIO" ? "Inizio" : "Fine"}
              </button>
            );
          })}
        </div>

        <div className="space-y-2 mb-5">
          <Label>Bracket</Label>
          <div className="flex gap-2">
            {BRACKETS.map((b) => {
              const active = finalBracket === b;
              return (
                <button
                  key={b}
                  type="button"
                  onClick={() => setFinalBracket(b)}
                  className={`flex-1 px-3 py-2 rounded-sm border text-sm cc-mono uppercase tracking-wider transition-colors ${
                    active
                      ? "text-court border-current"
                      : "bg-transparent border-cream/15 text-cream/70 hover:bg-cream/5"
                  }`}
                  style={
                    active
                      ? {
                          backgroundColor: BRACKET_ACCENT[b],
                          borderColor: BRACKET_ACCENT[b],
                        }
                      : undefined
                  }
                >
                  {BRACKET_LABEL[b]}
                </button>
              );
            })}
          </div>
        </div>

        {finalKind === "FINE" && (
          <div className="grid md:grid-cols-2 gap-4 mb-5">
            <div className="space-y-2">
              <Label>Vincitore</Label>
              <div className="flex gap-2">
                {(["team1", "team2"] as const).map((s) => {
                  const active = finalWinnerSide === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFinalWinnerSide(s)}
                      className={`flex-1 px-3 py-2 rounded-sm border text-sm ${
                        active
                          ? "bg-court-line/10 border-court-line text-cream"
                          : "bg-transparent border-cream/15 text-cream/70 hover:bg-cream/5"
                      }`}
                    >
                      {s === "team1" ? "Team A (sx)" : "Team B (dx)"}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="final-score">Punteggio</Label>
              <input
                id="final-score"
                value={finalScore}
                onChange={(e) => setFinalScore(e.target.value)}
                placeholder="6-3 6-4"
                className="w-full bg-cream/5 border border-cream/15 text-cream rounded-md h-11 px-3"
              />
            </div>
          </div>
        )}

        <Button
          onClick={launchFinal}
          disabled={allTeams.length < 2}
          className="bg-court-line text-court hover:bg-[#e7ff75] h-11"
        >
          Lancia {finalKind === "INIZIO" ? "presentazione" : "verdetto"} (random)
        </Button>
      </section>

      {activeGironi && (
        <GironiAnimation
          torneo={activeGironi}
          accent={GENERE_COLOR[activeGironi.genere as Genere]}
          onClose={() => setActiveGironi(null)}
        />
      )}

      <LiveMatchOverlay
        event={activeLive}
        onClose={() => setActiveLive(null)}
      />

      <SponsorShowcaseOverlay
        sponsors={activeShowcase}
        onClose={() => setActiveShowcase(null)}
      />

      {activeFinal && (
        <FinalPresentation
          team1={activeFinal.team1}
          team2={activeFinal.team2}
          bracket={activeFinal.bracket}
          onClose={() => setActiveFinal(null)}
        />
      )}

      {activeVictory && (
        <FinalVictory
          team1={activeVictory.team1}
          team2={activeVictory.team2}
          winner={activeVictory.winner}
          punteggio={activeVictory.punteggio}
          bracket={activeVictory.bracket}
          onClose={() => setActiveVictory(null)}
        />
      )}

      {activeFinaliDemo && (
        <FinaliAnimation
          torneo={activeFinaliDemo}
          onClose={() => setActiveFinaliDemo(null)}
        />
      )}
    </div>
  );
}

function matchLabel(m: MatchWithTeams): string {
  const a = m.team1
    ? `${m.team1.player1.cognome}/${m.team1.player2.cognome}`
    : "?";
  const b = m.team2
    ? `${m.team2.player1.cognome}/${m.team2.player2.cognome}`
    : "?";
  const tag =
    m.bracketTipo ?? (m.groupId ? "GIRONE" : "—");
  const score = m.punteggio ? ` · ${m.punteggio}` : "";
  const stato = m.stato === "COMPLETATA" ? " · ✓" : m.stato === "IN_CORSO" ? " · ●" : "";
  return `[${tag}] ${a} vs ${b}${score}${stato}`;
}
