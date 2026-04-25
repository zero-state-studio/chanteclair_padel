"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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

const emptyForm = {
  player1Id: "",
  player2Id: "",
  livello: "0",
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
        fetch(`/api/giocatori?genere=${genereAttivo}`, { cache: "no-store" }),
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
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (team: TeamWithPlayers) => {
    setEditing(team);
    setForm({
      player1Id: team.player1.id,
      player2Id: team.player2.id,
      livello: String(team.livello),
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
              {editing ? "Modifica squadra" : "Nuova squadra"} ·{" "}
              {genereAttivo === "MASCHILE" ? "Maschile" : "Femminile"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="p1">Giocatore 1 *</Label>
              <select
                id="p1"
                value={form.player1Id}
                onChange={(e) => setForm({ ...form, player1Id: e.target.value })}
                required
                className="w-full bg-cream/5 border border-cream/15 rounded-sm px-3 py-2 text-cream"
              >
                <option value="">— seleziona —</option>
                {playersAvailable
                  .filter((p) => p.id !== form.player2Id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.cognome} {p.nome}
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="p2">Giocatore 2 *</Label>
              <select
                id="p2"
                value={form.player2Id}
                onChange={(e) => setForm({ ...form, player2Id: e.target.value })}
                required
                className="w-full bg-cream/5 border border-cream/15 rounded-sm px-3 py-2 text-cream"
              >
                <option value="">— seleziona —</option>
                {playersAvailable
                  .filter((p) => p.id !== form.player1Id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.cognome} {p.nome}
                    </option>
                  ))}
              </select>
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
