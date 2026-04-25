"use client";

import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Genere, TeamWithPlayers } from "@/types";

type Player = {
  id: string;
  nome: string;
  cognome: string;
  genere: Genere;
  fotoUrl: string | null;
  teamAsPlayer1?: { id: string; nome: string } | null;
  teamAsPlayer2?: { id: string; nome: string } | null;
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function PlayerCombobox({
  id,
  players,
  value,
  onChange,
  placeholder,
  excludeId,
}: {
  id: string;
  players: Player[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  excludeId?: string;
}) {
  const selected = players.find((p) => p.id === value);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return players
      .filter((p) => p.id !== excludeId)
      .filter((p) =>
        q === "" ? true : normalize(`${p.cognome} ${p.nome}`).includes(q)
      )
      .slice(0, 50);
  }, [players, query, excludeId]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query, open]);

  const display = selected ? `${selected.cognome} ${selected.nome}` : "";

  const select = (p: Player) => {
    onChange(p.id);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  };

  const clear = () => {
    onChange("");
    setQuery("");
    setOpen(true);
    inputRef.current?.focus();
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={open ? query : display}
          placeholder={placeholder}
          autoComplete="off"
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIdx((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              if (open && filtered[activeIdx]) {
                e.preventDefault();
                select(filtered[activeIdx]);
              }
            } else if (e.key === "Escape") {
              setOpen(false);
              inputRef.current?.blur();
            }
          }}
          className="w-full bg-cream/5 border border-cream/15 rounded-sm px-3 py-2 pr-9 text-cream placeholder:text-cream/40 focus:outline-none focus:border-court-line"
        />
        {selected && !open && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-cream/50 hover:text-cream"
            aria-label="Cancella selezione"
          >
            ×
          </button>
        )}
        {!selected && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/40 pointer-events-none">
            ▾
          </span>
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-72 overflow-y-auto rounded-sm border border-cream/20 bg-court shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-cream/50">
              Nessun giocatore trovato
            </div>
          ) : (
            filtered.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(p);
                }}
                onMouseEnter={() => setActiveIdx(idx)}
                className={cn(
                  "w-full text-left px-3 py-2 flex items-center gap-3 text-sm transition-colors",
                  idx === activeIdx
                    ? "bg-court-line/15 text-cream"
                    : "text-cream/85 hover:bg-cream/5"
                )}
              >
                {p.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.fotoUrl}
                    alt=""
                    className="h-6 w-6 rounded-full object-cover bg-cream/10 shrink-0"
                  />
                ) : (
                  <span className="h-6 w-6 rounded-full bg-cream/10 flex items-center justify-center text-[10px] font-mono text-cream/70 shrink-0">
                    {p.nome[0]}
                    {p.cognome[0]}
                  </span>
                )}
                <span className="font-semibold">{p.cognome}</span>
                <span className="text-cream/60">{p.nome}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const emptyForm: { player1Id: string; player2Id: string; livello: string; genere: Genere } = {
  player1Id: "",
  player2Id: "",
  livello: "0",
  genere: "MASCHILE",
};

export default function SquadrePage() {
  const [genereAttivo, setGenereAttivo] = useState<Genere>("MASCHILE");
  const [players, setPlayers] = useState<Player[]>([]);
  const [squadre, setSquadre] = useState<TeamWithPlayers[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TeamWithPlayers | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        fetch(`/api/giocatori`, { cache: "no-store" }),
        fetch(`/api/squadre?genere=${genereAttivo}`, { cache: "no-store" }),
      ]);
      if (pRes.ok) setPlayers(await pRes.json());
      if (sRes.ok) setSquadre(await sRes.json());
    } finally {
      setLoading(false);
    }
  }, [genereAttivo]);

  useEffect(() => {
    load();
  }, [load]);

  const playersAvailable = useMemo(() => {
    return players.filter((p) => {
      if (editing) {
        if (p.id === editing.player1.id || p.id === editing.player2.id) return true;
      }
      return !p.teamAsPlayer1 && !p.teamAsPlayer2;
    });
  }, [players, editing]);

  const player1 = players.find((p) => p.id === form.player1Id);
  const player2 = players.find((p) => p.id === form.player2Id);
  const previewName =
    player1 && player2 && player1.id !== player2.id
      ? `${player1.cognome} / ${player2.cognome}`
      : "—";

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, genere: genereAttivo });
    setDialogOpen(true);
  };

  const openEdit = (team: TeamWithPlayers) => {
    setEditing(team);
    setForm({
      player1Id: team.player1.id,
      player2Id: team.player2.id,
      livello: String(team.livello),
      genere: team.genere,
    });
    setDialogOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.player1Id || !form.player2Id) {
      toast.error("Seleziona entrambi i giocatori");
      return;
    }
    if (form.player1Id === form.player2Id) {
      toast.error("I due giocatori devono essere diversi");
      return;
    }

    setSubmitting(true);
    try {
      const url = editing ? `/api/squadre/${editing.id}` : "/api/squadre";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player1Id: form.player1Id,
          player2Id: form.player2Id,
          livello: parseInt(form.livello, 10) || 0,
          genere: form.genere,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Errore");
      }
      toast.success(editing ? "Squadra aggiornata" : "Squadra creata");
      setDialogOpen(false);
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (team: TeamWithPlayers) => {
    if (!confirm(`Eliminare squadra "${team.nome}"?`)) return;
    try {
      const res = await fetch(`/api/squadre/${team.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Errore");
      toast.success("Squadra eliminata");
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] px-6 md:px-12 py-12">
      <div className="grid grid-cols-12 gap-6 mb-12 items-end">
        <div className="col-span-12 md:col-span-7">
          <div className="text-eyebrow text-cream/50 mb-3">02 / Pairs</div>
          <h1 className="text-display-jumbo text-cream text-[10vw] md:text-[6vw]">
            Squadre
          </h1>
        </div>
        <div className="col-span-12 md:col-span-5 md:pl-8 md:border-l border-line flex flex-col gap-3 md:items-end">
          <p className="text-cream/70 text-sm leading-relaxed">
            Coppie di giocatori dello stesso genere. Il nome è auto-generato dai
            cognomi. Un giocatore appartiene a una sola squadra.
          </p>
          <Button
            onClick={openCreate}
            className="bg-court-line text-court hover:bg-[#e7ff75] font-body font-semibold tracking-wider uppercase text-xs h-12 px-6 rounded-sm self-start md:self-end"
          >
            + Nuova squadra
          </Button>
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
      ) : squadre.length === 0 ? (
        <p className="text-cream/60">
          Nessuna squadra {genereAttivo.toLowerCase()}. Crea la prima sopra.
        </p>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {squadre.map((s) => (
            <div
              key={s.id}
              className="rounded-sm border border-line bg-court-deep p-5 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex -space-x-3 shrink-0">
                  {[s.player1, s.player2].map((p) =>
                    p.fotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={p.id}
                        src={p.fotoUrl}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover bg-cream/10 ring-2 ring-court-deep"
                      />
                    ) : (
                      <div
                        key={p.id}
                        className="h-10 w-10 rounded-full bg-cream/10 ring-2 ring-court-deep flex items-center justify-center text-xs font-mono text-cream/70"
                      >
                        {p.nome[0]}
                        {p.cognome[0]}
                      </div>
                    )
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-body font-semibold text-cream truncate">{s.nome}</p>
                  <p className="text-eyebrow text-cream/50 mt-1">
                    {s.livello > 0 ? `Testa di serie #${s.livello}` : "non tds"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openEdit(s)}
                  className="text-cream/70 hover:text-cream hover:bg-cream/5"
                >
                  Modifica
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => remove(s)}
                  className="text-clay hover:text-clay hover:bg-clay/10"
                >
                  Elimina
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-court-deep border-cream/15 text-cream">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifica squadra" : "Nuova squadra"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Tabellone *</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["MASCHILE", "FEMMINILE"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setForm({ ...form, genere: g })}
                    className={cn(
                      "px-3 py-2 rounded-sm border-2 text-sm font-semibold uppercase tracking-wider transition-colors",
                      form.genere === g
                        ? "border-court-line bg-court-line/10 text-cream"
                        : "border-cream/15 text-cream/70 hover:border-cream/40"
                    )}
                  >
                    {g === "MASCHILE" ? "Maschile" : "Femminile"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="p1">Giocatore 1 *</Label>
              <PlayerCombobox
                id="p1"
                players={playersAvailable}
                value={form.player1Id}
                onChange={(id) => setForm({ ...form, player1Id: id })}
                placeholder="Cerca per cognome o nome..."
                excludeId={form.player2Id}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="p2">Giocatore 2 *</Label>
              <PlayerCombobox
                id="p2"
                players={playersAvailable}
                value={form.player2Id}
                onChange={(id) => setForm({ ...form, player2Id: id })}
                placeholder="Cerca per cognome o nome..."
                excludeId={form.player1Id}
              />
            </div>

            <div className="rounded-sm bg-cream/5 px-4 py-3">
              <div className="text-eyebrow text-cream/50">Nome squadra</div>
              <div className="font-display text-2xl text-cream mt-1">{previewName}</div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="livello">Testa di serie (0 = non tds)</Label>
              <Input
                id="livello"
                type="number"
                min={0}
                value={form.livello}
                onChange={(e) => setForm({ ...form, livello: e.target.value })}
                className="bg-cream/5 border-cream/15 text-cream"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="bg-transparent border-cream/20 hover:bg-cream/5 text-cream"
              >
                Annulla
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-court-line text-court hover:bg-[#e7ff75]"
              >
                {submitting ? "Salvataggio..." : editing ? "Salva" : "Crea"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
