"use client";

import {
  useEffect,
  useState,
  useCallback,
  createContext,
  useContext,
} from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  GENERE_COLOR,
  GENERE_LABEL,
  genereChipStyle,
} from "@/lib/genere-style";
import type {
  BracketTipo,
  FieldLite,
  Genere,
  GroupWithTeams,
  MatchWithTeams,
  SponsorLite,
  StatoPartita,
  TeamWithPlayers,
  TournamentWithMatches,
} from "@/types";

type SelCtx = {
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
};
const SelectionContext = createContext<SelCtx | null>(null);
const FieldsContext = createContext<FieldLite[]>([]);

function normalizeStr(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function matchPassesFilter(
  m: MatchWithTeams,
  groupNome: string | null,
  q: string
): boolean {
  if (!q) return true;
  const nq = normalizeStr(q);
  if (groupNome && normalizeStr(groupNome).includes(nq)) return true;
  const players = [
    m.team1?.player1,
    m.team1?.player2,
    m.team2?.player1,
    m.team2?.player2,
  ];
  return players.some(
    (p) =>
      !!p &&
      (normalizeStr(p.nome).includes(nq) ||
        normalizeStr(p.cognome).includes(nq))
  );
}

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
            <Image
              key={p.id}
              src={p.fotoUrl}
              alt=""
              width={28}
              height={28}
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
  genere,
}: {
  match: MatchWithTeams;
  onAction: () => Promise<void>;
  genere: Genere;
}) {
  const [showForm, setShowForm] = useState(false);
  const [s1, setS1] = useState<string>("");
  const [s2, setS2] = useState<string>("");
  const [tb1, setTb1] = useState<string>("");
  const [tb2, setTb2] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<string>(
    match.fieldId ?? ""
  );

  const sel = useContext(SelectionContext);
  const fieldsList = useContext(FieldsContext);
  const selected = sel?.isSelected(match.id) ?? false;

  const canStart = !!(match.team1 && match.team2);

  useEffect(() => {
    setS1(match.set1Team1 != null ? String(match.set1Team1) : "");
    setS2(match.set1Team2 != null ? String(match.set1Team2) : "");
    setTb1(match.tieBreakTeam1 != null ? String(match.tieBreakTeam1) : "");
    setTb2(match.tieBreakTeam2 != null ? String(match.tieBreakTeam2) : "");
  }, [
    match.set1Team1,
    match.set1Team2,
    match.tieBreakTeam1,
    match.tieBreakTeam2,
  ]);

  const inizia = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/partite/${match.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          azione: "INIZIA",
          fieldId: selectedFieldId || null,
        }),
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

  const aggiornaParziale = async () => {
    const set1Team1 = parseInt(s1, 10);
    const set1Team2 = parseInt(s2, 10);
    if (Number.isNaN(set1Team1) || Number.isNaN(set1Team2)) {
      toast.error("Punteggio set richiesto");
      return;
    }
    const tieBreakTeam1 = tb1 === "" ? null : parseInt(tb1, 10);
    const tieBreakTeam2 = tb2 === "" ? null : parseInt(tb2, 10);
    if ((tieBreakTeam1 == null) !== (tieBreakTeam2 == null)) {
      toast.error("Tie-break: inserisci entrambi i punteggi");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/partite/${match.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          azione: "AGGIORNA_PARZIALE",
          set1Team1,
          set1Team2,
          tieBreakTeam1,
          tieBreakTeam2,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Errore");
      toast.success("Parziale aggiornato");
      await onAction();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (
      !confirm(
        "Resettare la partita? Punteggio, vincitore e promozioni verranno annullati."
      )
    )
      return;
    setBusy(true);
    try {
      const res = await fetch(`/api/partite/${match.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ azione: "RESET" }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Errore");
      toast.success("Partita resettata");
      setShowForm(false);
      setS1("");
      setS2("");
      setTb1("");
      setTb2("");
      await onAction();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const riavvia = async () => {
    if (
      !confirm(
        "Riavviare la partita? Il punteggio attuale verrà azzerato e l'animazione di inizio match verrà rilanciata sui tabelloni."
      )
    )
      return;
    setBusy(true);
    try {
      const resReset = await fetch(`/api/partite/${match.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ azione: "RESET" }),
      });
      if (!resReset.ok)
        throw new Error((await resReset.json()).error ?? "Errore reset");

      const resInizia = await fetch(`/api/partite/${match.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          azione: "INIZIA",
          fieldId: match.fieldId ?? null,
        }),
      });
      if (!resInizia.ok)
        throw new Error((await resInizia.json()).error ?? "Errore avvio");

      toast.success("Partita riavviata");
      setShowForm(false);
      setS1("");
      setS2("");
      setTb1("");
      setTb2("");
      await onAction();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const termina = async () => {
    const set1Team1 = parseInt(s1, 10);
    const set1Team2 = parseInt(s2, 10);
    if (Number.isNaN(set1Team1) || Number.isNaN(set1Team2)) {
      toast.error("Punteggio set richiesto");
      return;
    }
    const tieBreakTeam1 = tb1 === "" ? null : parseInt(tb1, 10);
    const tieBreakTeam2 = tb2 === "" ? null : parseInt(tb2, 10);
    if ((tieBreakTeam1 == null) !== (tieBreakTeam2 == null)) {
      toast.error("Tie-break: inserisci entrambi i punteggi");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/partite/${match.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          azione: "TERMINA",
          set1Team1,
          set1Team2,
          tieBreakTeam1,
          tieBreakTeam2,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Errore");
      toast.success("Risultato salvato e notificato");
      setShowForm(false);
      setS1("");
      setS2("");
      setTb1("");
      setTb2("");
      await onAction();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn(
        "rounded-md border bg-court-deep p-4 sm:p-5 space-y-4",
        selected && "ring-2 ring-court-line"
      )}
      style={{
        borderColor: "var(--color-line)",
        borderLeftWidth: 4,
        borderLeftColor: GENERE_COLOR[genere],
      }}
    >
      {(sel || match.sponsor) && (
        <div className="flex items-center gap-3 pb-3 border-b border-cream/10">
          {sel && (
            <input
              type="checkbox"
              checked={selected}
              onChange={() => sel.toggle(match.id)}
              className="h-4 w-4 accent-court-line cursor-pointer shrink-0"
              aria-label="Seleziona partita"
            />
          )}
          {match.sponsor ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] uppercase tracking-widest text-cream/50 shrink-0">
                Sponsor
              </span>
              {match.sponsor.logoUrl && (
                <Image
                  src={match.sponsor.logoUrl}
                  alt=""
                  width={20}
                  height={20}
                  className="h-5 w-5 rounded-sm object-contain bg-cream/10 p-0.5 shrink-0"
                />
              )}
              <span className="text-cream/85 text-sm font-semibold truncate">
                {match.sponsor.nome ?? "—"}
              </span>
            </div>
          ) : (
            sel && (
              <span className="text-[10px] uppercase tracking-widest text-cream/30">
                Nessuno sponsor
              </span>
            )
          )}
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 min-w-0">
          <TeamLabel team={match.team1} />
          <TeamLabel team={match.team2} />
        </div>
        <div className="text-right shrink-0">
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

      {match.stato === "COMPLETATA" && (
        <Button
          size="sm"
          variant="outline"
          onClick={reset}
          disabled={busy}
          className="bg-transparent border-clay/40 text-clay hover:bg-clay/10 hover:text-clay w-full sm:w-auto h-9"
        >
          ↺ Reset partita
        </Button>
      )}

      {match.stato === "ATTESA" && (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedFieldId}
            onChange={(e) => setSelectedFieldId(e.target.value)}
            disabled={busy || fieldsList.length === 0}
            className="bg-court-deep border border-cream/15 text-cream rounded-sm h-10 px-2 text-sm flex-1 sm:flex-none sm:min-w-[180px] disabled:opacity-50"
            aria-label="Campo"
          >
            <option value="">— Senza campo —</option>
            {fieldsList.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            onClick={inizia}
            disabled={!canStart || busy}
            className="bg-court-line text-court hover:bg-[#e7ff75] w-full sm:w-auto h-10"
          >
            ▶ Inizia Partita
          </Button>
        </div>
      )}

      {match.stato !== "ATTESA" && match.field && (
        <div className="flex items-center gap-2 text-xs text-cream/60">
          <span className="cc-mono uppercase tracking-widest">Campo</span>
          <span className="text-cream/85 font-semibold">{match.field.nome}</span>
        </div>
      )}

      {match.stato === "IN_CORSO" && !showForm && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            className="bg-cream text-court hover:bg-cream/90 w-full sm:w-auto h-10"
          >
            ⏹ Inserisci Risultato
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={riavvia}
            disabled={busy}
            className="bg-transparent border-clay/40 text-clay hover:bg-clay/10 hover:text-clay w-full sm:w-auto h-10"
          >
            ↺ Riavvia partita
          </Button>
        </div>
      )}

      {match.stato === "IN_CORSO" && showForm && (
        <div className="space-y-3 p-3 rounded-md bg-court-deep/60">
          <div className="space-y-2">
            <Label className="text-xs">Set (1 set a 6 game)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[10px] text-cream/50 truncate block">
                  {match.team1?.nome ?? "—"}
                </span>
                <Input
                  type="number"
                  min={0}
                  max={7}
                  value={s1}
                  onChange={(e) => setS1(e.target.value)}
                  placeholder="6"
                  className="bg-court-deep border-cream/15"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-cream/50 truncate block">
                  {match.team2?.nome ?? "—"}
                </span>
                <Input
                  type="number"
                  min={0}
                  max={7}
                  value={s2}
                  onChange={(e) => setS2(e.target.value)}
                  placeholder="4"
                  className="bg-court-deep border-cream/15"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Tie-break (solo se 5-5)</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                min={0}
                value={tb1}
                onChange={(e) => setTb1(e.target.value)}
                placeholder="TB casa"
                className="bg-court-deep border-cream/15"
              />
              <Input
                type="number"
                min={0}
                value={tb2}
                onChange={(e) => setTb2(e.target.value)}
                placeholder="TB ospiti"
                className="bg-court-deep border-cream/15"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowForm(false)}
              className="h-10 sm:flex-none"
            >
              Annulla
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={aggiornaParziale}
              disabled={busy || !s1 || !s2}
              className="bg-transparent border-cream/30 text-cream hover:bg-cream/5 h-10 flex-1 sm:flex-none"
            >
              {busy ? "…" : "↻ Aggiorna parziale"}
            </Button>
            <Button
              size="sm"
              onClick={termina}
              disabled={busy || !s1 || !s2}
              className="bg-court-line text-court hover:bg-[#e7ff75] flex-1 h-10"
            >
              {busy ? "Salvataggio..." : "✓ Conferma e Notifica"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

const BRACKETS: BracketTipo[] = ["GOLD", "SILVER", "BRONZE"];

export default function PartitePage() {
  const [genereAttivo, setGenereAttivo] = useState<Genere>("MASCHILE");
  const [torneo, setTorneo] = useState<TournamentWithMatches | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);
  const [onlyDaIniziare, setOnlyDaIniziare] = useState(true);
  const [onlyConcluse, setOnlyConcluse] = useState(false);
  const [fieldFilter, setFieldFilter] = useState<string>("");
  const [sponsors, setSponsors] = useState<SponsorLite[]>([]);
  const [fields, setFields] = useState<FieldLite[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSponsorId, setBulkSponsorId] = useState<string>("");
  const [assigning, setAssigning] = useState(false);

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

  useEffect(() => {
    fetch(`/api/sponsors`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setSponsors(data as SponsorLite[]))
      .catch(() => setSponsors([]));
    fetch(`/api/campi`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setFields(data as FieldLite[]))
      .catch(() => setFields([]));
  }, []);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [genereAttivo]);

  const toggleMatch = useCallback((id: string) => {
    setSelectedIds((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  const selectAllVisible = () => {
    if (!torneo) return;
    setSelectedIds(new Set(torneo.matches.map((m) => m.id)));
  };

  const assignBulk = async () => {
    if (selectedIds.size === 0) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/partite/sponsor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sponsorId: bulkSponsorId || null,
          matchIds: Array.from(selectedIds),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Errore assegnazione");
      toast.success(
        bulkSponsorId
          ? `Sponsor assegnato a ${data.count} partite`
          : `Sponsor rimosso da ${data.count} partite`
      );
      setSelectedIds(new Set());
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setAssigning(false);
    }
  };

  const accent = GENERE_COLOR[genereAttivo];

  return (
    <SelectionContext.Provider value={{ isSelected, toggle: toggleMatch }}>
    <FieldsContext.Provider value={fields}>
    <div className="mx-auto max-w-[1400px] px-4 md:px-12 py-6 md:py-12">
      <div className="grid grid-cols-12 gap-4 md:gap-6 items-end mb-6 md:mb-8">
        <div className="col-span-12 md:col-span-7">
          <div className="text-eyebrow text-cream/50 mb-2 md:mb-3">04 / Diretta</div>
          <h1 className="text-display-jumbo text-cream text-[14vw] sm:text-[10vw] md:text-[6vw] leading-[0.85]">
            Partite
          </h1>
        </div>
        <div className="col-span-12 md:col-span-5 md:pl-8 md:border-l border-line">
          <p className="text-cream/70 text-sm md:text-base leading-relaxed">
            Ogni azione qui invia un overlay sui tabelloni del club. Click su{" "}
            <em className="font-display italic text-court-line">Inizia</em> per
            partire, poi inserisci punteggio quando il match si chiude.
          </p>
        </div>
      </div>

      <div
        className="mb-6 rounded-md border-2 p-3 md:p-4 flex items-center gap-3 md:gap-4"
        style={{
          borderColor: accent,
          background: `color-mix(in oklch, ${accent} 10%, transparent)`,
        }}
      >
        <div
          className="text-eyebrow shrink-0 hidden sm:block"
          style={{ color: accent }}
        >
          — tabellone
        </div>
        <div className="flex gap-2 flex-1">
          {(["MASCHILE", "FEMMINILE"] as const).map((g) => {
            const active = genereAttivo === g;
            const c = GENERE_COLOR[g];
            return (
              <button
                key={g}
                type="button"
                onClick={() => setGenereAttivo(g)}
                className="flex-1 sm:flex-none px-5 md:px-8 py-2.5 md:py-3 rounded-sm border-2 font-display uppercase tracking-widest text-base md:text-lg transition-colors"
                style={
                  active
                    ? {
                        background: c,
                        borderColor: c,
                        color: "var(--color-night-deep)",
                      }
                    : {
                        background: "transparent",
                        borderColor: `color-mix(in oklch, ${c} 50%, transparent)`,
                        color: c,
                      }
                }
              >
                {GENERE_LABEL[g]}
              </button>
            );
          })}
        </div>
      </div>

      {torneo && torneo.matches.length > 0 && (
        <div className="mb-6 flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative flex-1">
            <Input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filtra per nome, cognome o girone (es. 'Rossi', 'A')"
              className="bg-court-deep border-cream/15 text-cream pl-10 h-11"
            />
            <span
              aria-hidden
              className="absolute left-3 top-1/2 -translate-y-1/2 text-cream/40 cc-mono text-xs"
            >
              ⌕
            </span>
            {filter && (
              <button
                type="button"
                onClick={() => setFilter("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-cream/50 hover:text-cream px-2 text-sm"
                aria-label="Pulisci filtro"
              >
                ✕
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="flex items-center gap-2 text-sm text-cream/80 cursor-pointer select-none px-3 h-11 rounded-sm border border-cream/15 bg-court-deep">
              <input
                type="checkbox"
                checked={onlyActive}
                onChange={(e) => setOnlyActive(e.target.checked)}
                className="h-4 w-4 accent-court-line cursor-pointer"
              />
              Solo attive
            </label>
            <label className="flex items-center gap-2 text-sm text-cream/80 cursor-pointer select-none px-3 h-11 rounded-sm border border-cream/15 bg-court-deep">
              <input
                type="checkbox"
                checked={onlyDaIniziare}
                onChange={(e) => setOnlyDaIniziare(e.target.checked)}
                className="h-4 w-4 accent-court-line cursor-pointer"
              />
              Da iniziare
            </label>
            <label className="flex items-center gap-2 text-sm text-cream/80 cursor-pointer select-none px-3 h-11 rounded-sm border border-cream/15 bg-court-deep">
              <input
                type="checkbox"
                checked={onlyConcluse}
                onChange={(e) => setOnlyConcluse(e.target.checked)}
                className="h-4 w-4 accent-court-line cursor-pointer"
              />
              Concluse
            </label>
            <select
              value={fieldFilter}
              onChange={(e) => setFieldFilter(e.target.value)}
              className="bg-court-deep border border-cream/15 text-cream rounded-sm h-11 px-3 text-sm min-w-[180px]"
              aria-label="Filtra per campo"
            >
              <option value="">Tutti i campi</option>
              <option value="__none__">Senza campo</option>
              {fields.map((f) => (
                <option key={f.id} value={f.id}>
                  ◆ {f.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-cream/60">Caricamento...</p>
      ) : !torneo ? (
        <p className="text-cream/60">
          Nessun torneo {genereAttivo.toLowerCase()} disponibile. Creane uno e
          sorteggia i gironi dalla pagina Tornei.
        </p>
      ) : !torneo.matches.length ? (
        <p className="text-cream/60">
          Torneo &quot;{torneo.nome}&quot; senza partite. Esegui il sorteggio dalla pagina
          Tornei.
        </p>
      ) : (
        <>
          <div className="sticky top-[56px] md:top-[68px] z-20 -mx-4 md:-mx-12 px-4 md:px-12 py-2 bg-court-deep/95 backdrop-blur border-y border-court-line/30 mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-xs text-cream/80">
                <span className="cc-mono text-[10px] tracking-widest text-cream/50">
                  Sel
                </span>
                <strong className="text-court-line text-sm">
                  {selectedIds.size}
                </strong>
                <button
                  type="button"
                  onClick={selectAllVisible}
                  className="text-cream/60 hover:text-cream text-[11px] underline"
                >
                  tutte
                </button>
                {selectedIds.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set())}
                    className="text-cream/60 hover:text-cream text-[11px] underline"
                  >
                    pulisci
                  </button>
                )}
              </div>
              <div className="flex-1 flex items-center gap-2 justify-end min-w-[260px]">
                <select
                  value={bulkSponsorId}
                  onChange={(e) => setBulkSponsorId(e.target.value)}
                  className="bg-court-deep border border-cream/15 text-cream rounded-sm h-8 px-2 text-xs min-w-[200px]"
                  aria-label="Sponsor da assegnare"
                >
                  <option value="">— Rimuovi sponsor —</option>
                  {sponsors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome ?? `(solo logo) ${s.id.slice(-4)}`}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  onClick={assignBulk}
                  disabled={selectedIds.size === 0 || assigning}
                  className="bg-court-line text-court hover:bg-[#e7ff75] h-8 px-3 text-xs"
                >
                  {assigning ? "…" : `Assegna a ${selectedIds.size}`}
                </Button>
              </div>
            </div>
          </div>
          <PartiteSezioni
            torneo={torneo}
            onChange={load}
            filter={filter}
            onlyActive={onlyActive}
            onlyDaIniziare={onlyDaIniziare}
            onlyConcluse={onlyConcluse}
            fieldFilter={fieldFilter}
          />
        </>
      )}
    </div>
    </FieldsContext.Provider>
    </SelectionContext.Provider>
  );
}

function PartiteSezioni({
  torneo,
  onChange,
  filter,
  onlyActive,
  onlyDaIniziare,
  onlyConcluse,
  fieldFilter,
}: {
  torneo: TournamentWithMatches;
  onChange: () => Promise<void>;
  filter: string;
  onlyActive: boolean;
  onlyDaIniziare: boolean;
  onlyConcluse: boolean;
  fieldFilter: string;
}) {
  const allowedStati = new Set<StatoPartita>();
  if (onlyActive) {
    allowedStati.add("ATTESA");
    allowedStati.add("IN_CORSO");
  }
  if (onlyDaIniziare) allowedStati.add("ATTESA");
  if (onlyConcluse) allowedStati.add("COMPLETATA");
  const byStato =
    allowedStati.size > 0
      ? torneo.matches.filter((m) => allowedStati.has(m.stato as StatoPartita))
      : torneo.matches;
  const visibleMatches = !fieldFilter
    ? byStato
    : fieldFilter === "__none__"
    ? byStato.filter((m) => !m.fieldId)
    : byStato.filter((m) => m.fieldId === fieldFilter);
  const groupMatches = visibleMatches.filter((m) => m.groupId !== null);
  const bracketMatches = visibleMatches.filter((m) => m.bracketTipo !== null);
  const accent = GENERE_COLOR[torneo.genere];

  const filteredGroupMatchesCount = filter
    ? groupMatches.filter((m) => {
        const grp = torneo.groups.find((g) => g.id === m.groupId);
        return matchPassesFilter(m, grp?.nome ?? null, filter);
      }).length
    : groupMatches.length;
  const filteredBracketMatchesCount = filter
    ? bracketMatches.filter((m) => matchPassesFilter(m, null, filter)).length
    : bracketMatches.length;
  const noResults =
    filter &&
    filteredGroupMatchesCount === 0 &&
    filteredBracketMatchesCount === 0;

  return (
    <div className="space-y-10">
      <p className="text-sm text-cream/60 flex items-center gap-2 flex-wrap">
        <span
          className="cc-mono text-[10px] tracking-wider px-1.5 py-0.5 rounded-sm uppercase"
          style={genereChipStyle(torneo.genere)}
        >
          {GENERE_LABEL[torneo.genere]}
        </span>
        Torneo: <strong className="text-white">{torneo.nome}</strong> · {torneo.anno}{" "}
        · fase <span style={{ color: accent }}>{torneo.fase}</span>
      </p>

      {noResults && (
        <p className="text-cream/60 text-sm">
          Nessun match per &quot;{filter}&quot;.
        </p>
      )}

      {groupMatches.length > 0 && (
        <SezioneGironi
          groups={torneo.groups}
          matches={groupMatches}
          onChange={onChange}
          genere={torneo.genere}
          filter={filter}
        />
      )}

      {BRACKETS.map((tipo) => {
        const matches = bracketMatches.filter((m) => m.bracketTipo === tipo);
        if (matches.length === 0) return null;
        return (
          <SezioneBracket
            key={tipo}
            tipo={tipo}
            matches={matches}
            onChange={onChange}
            genere={torneo.genere}
            filter={filter}
          />
        );
      })}
    </div>
  );
}

function SezioneGironi({
  groups,
  matches,
  onChange,
  genere,
  filter,
}: {
  groups: GroupWithTeams[];
  matches: MatchWithTeams[];
  onChange: () => Promise<void>;
  genere: Genere;
  filter: string;
}) {
  const accent = GENERE_COLOR[genere];
  const visibleGroups = groups
    .map((g) => {
      const gm = matches
        .filter((m) => m.groupId === g.id)
        .filter((m) => matchPassesFilter(m, g.nome, filter));
      return { g, gm };
    })
    .filter(({ gm }) => gm.length > 0 || !filter);
  if (filter && visibleGroups.length === 0) return null;
  return (
    <section>
      <h2
        className="text-lg font-semibold mb-4 uppercase tracking-widest border-l-4 pl-3"
        style={{ borderColor: accent, color: accent }}
      >
        Fase Gironi
      </h2>
      <div className="grid md:grid-cols-2 gap-6">
        {visibleGroups.map(({ g, gm }) => (
          <div
            key={g.id}
            className={cn(
              "rounded-md border p-3 md:p-4 space-y-3",
              "border-cream/10 bg-court-deep/40"
            )}
          >
            <div className="flex items-baseline justify-between">
              <h3 className="font-semibold">Girone {g.nome}</h3>
              <span className="text-xs text-cream/50">
                {g.groupTeams.length} squadre · {gm.length} partite
              </span>
            </div>
            <div className="space-y-2">
              {gm
                .sort((a, b) => a.posizione - b.posizione)
                .map((m) => (
                  <PartitaCard
                    key={m.id}
                    match={m}
                    onAction={onChange}
                    genere={genere}
                  />
                ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SezioneBracket({
  tipo,
  matches,
  onChange,
  genere,
  filter,
}: {
  tipo: BracketTipo;
  matches: MatchWithTeams[];
  onChange: () => Promise<void>;
  genere: Genere;
  filter: string;
}) {
  const filtered = matches.filter((m) => matchPassesFilter(m, null, filter));
  if (filter && filtered.length === 0) return null;
  const matchesByRound = filtered.reduce<Record<number, MatchWithTeams[]>>(
    (acc, m) => {
      (acc[m.round] ??= []).push(m);
      return acc;
    },
    {}
  );
  const rounds = Object.keys(matchesByRound)
    .map(Number)
    .sort((a, b) => b - a);
  const maxRound = rounds[0] ?? 0;
  const accent = GENERE_COLOR[genere];

  return (
    <section>
      <h2
        className="text-lg font-semibold mb-4 uppercase tracking-widest border-l-4 pl-3"
        style={{ borderColor: accent, color: accent }}
      >
        Bracket {tipo}
      </h2>
      <div className="space-y-6">
        {rounds.map((round) => (
          <div key={round}>
            <h3 className="text-sm font-semibold mb-3 text-cream/60">
              {getRoundLabel(round, maxRound)}
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              {matchesByRound[round]
                .sort((a, b) => a.posizione - b.posizione)
                .map((m) => (
                  <PartitaCard
                    key={m.id}
                    match={m}
                    onAction={onChange}
                    genere={genere}
                  />
                ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
