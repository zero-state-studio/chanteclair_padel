"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bracket } from "@/components/Bracket";
import { toast } from "sonner";
import { prossimaPotenzaDi2 } from "@/lib/bracket";
import type { Genere, StatoTorneo, TournamentWithMatches } from "@/types";

type TorneoListItem = TournamentWithMatches;

const STATO_BADGE: Record<StatoTorneo, string> = {
  BOZZA: "bg-slate-600",
  ATTIVO: "bg-green-600",
  CONCLUSO: "bg-blue-600",
};

export default function TorneoPage() {
  const annoCorrente = new Date().getFullYear();
  const [tornei, setTornei] = useState<TorneoListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [drawing, setDrawing] = useState<string | null>(null);
  const [previewTorneoId, setPreviewTorneoId] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<Genere, number>>({
    MASCHILE: 0,
    FEMMINILE: 0,
  });

  const [form, setForm] = useState({
    nome: "",
    genere: "MASCHILE" as Genere,
    anno: annoCorrente,
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, mRes, fRes] = await Promise.all([
        fetch("/api/tornei", { cache: "no-store" }),
        fetch("/api/giocatori?genere=MASCHILE", { cache: "no-store" }),
        fetch("/api/giocatori?genere=FEMMINILE", { cache: "no-store" }),
      ]);
      if (tRes.ok) setTornei(await tRes.json());
      const mList = mRes.ok ? ((await mRes.json()) as unknown[]) : [];
      const fList = fRes.ok ? ((await fRes.json()) as unknown[]) : [];
      setCounts({ MASCHILE: mList.length, FEMMINILE: fList.length });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast.error("Nome richiesto");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/tornei", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Errore creazione");
      }
      toast.success("Torneo creato");
      setForm({ nome: "", genere: "MASCHILE", anno: annoCorrente });
      await loadAll();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (t: TorneoListItem) => {
    if (
      !confirm(
        `Eliminare il torneo "${t.nome}"? Tutte le partite verranno cancellate.`
      )
    )
      return;
    const res = await fetch(`/api/tornei/${t.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Torneo eliminato");
      if (previewTorneoId === t.id) setPreviewTorneoId(null);
      await loadAll();
    } else {
      toast.error("Errore eliminazione");
    }
  };

  const handleSorteggio = async (t: TorneoListItem) => {
    const numGiocatori = counts[t.genere];
    if (numGiocatori < 2) {
      toast.error(`Servono almeno 2 giocatori (${t.genere})`);
      return;
    }
    const totale = prossimaPotenzaDi2(numGiocatori);
    const numBye = totale - numGiocatori;
    const haPartite = t.matches?.length > 0;

    const msg = [
      `Sorteggio per ${numGiocatori} giocatori${
        numBye > 0 ? ` + ${numBye} BYE` : ""
      }.`,
      haPartite ? "ATTENZIONE: le partite esistenti verranno cancellate." : "",
      "Confermi?",
    ]
      .filter(Boolean)
      .join("\n");

    if (!confirm(msg)) return;

    setDrawing(t.id);
    try {
      const res = await fetch(`/api/tornei/${t.id}/sorteggio`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Errore sorteggio");
      }
      toast.success("Sorteggio completato");
      setPreviewTorneoId(t.id);
      await loadAll();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDrawing(null);
    }
  };

  const handleStato = async (t: TorneoListItem, stato: StatoTorneo) => {
    const res = await fetch(`/api/tornei/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stato }),
    });
    if (res.ok) {
      toast.success(`Stato → ${stato}`);
      await loadAll();
    } else {
      toast.error("Errore aggiornamento");
    }
  };

  const previewTorneo = tornei.find((t) => t.id === previewTorneoId);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-10">
      <h1 className="text-3xl font-bold">Tornei & Sorteggio</h1>

      <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-6">
        <h2 className="text-xl font-semibold mb-4">Crea nuovo torneo</h2>
        <form onSubmit={handleCreate} className="grid md:grid-cols-4 gap-3">
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="nome-t">Nome torneo</Label>
            <Input
              id="nome-t"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Es. Torneo Estivo"
              className="bg-slate-800 border-slate-700"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Genere</Label>
            <Select
              value={form.genere}
              onValueChange={(v) => setForm({ ...form, genere: v as Genere })}
            >
              <SelectTrigger className="bg-slate-800 border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                <SelectItem value="MASCHILE">Maschile</SelectItem>
                <SelectItem value="FEMMINILE">Femminile</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="anno-t">Anno</Label>
            <Input
              id="anno-t"
              type="number"
              value={form.anno}
              onChange={(e) =>
                setForm({ ...form, anno: parseInt(e.target.value || "0", 10) })
              }
              className="bg-slate-800 border-slate-700"
              required
            />
          </div>
          <div className="md:col-span-4">
            <Button
              type="submit"
              disabled={creating}
              className="bg-green-600 hover:bg-green-500"
            >
              {creating ? "Creazione..." : "Crea Torneo"}
            </Button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Tornei esistenti</h2>
        {loading ? (
          <p className="text-slate-400">Caricamento...</p>
        ) : tornei.length === 0 ? (
          <p className="text-slate-400">Nessun torneo. Creane uno qui sopra.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {tornei.map((t) => {
              const partite = t.matches?.length ?? 0;
              const giocatoriDisp = counts[t.genere as Genere];
              return (
                <div
                  key={t.id}
                  className="rounded-lg border border-slate-800 bg-slate-900/40 p-5 space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">{t.nome}</h3>
                      <p className="text-sm text-slate-400">
                        {t.genere === "MASCHILE" ? "Maschile" : "Femminile"} ·{" "}
                        {t.anno} · {partite} partite
                      </p>
                    </div>
                    <Badge
                      className={`${STATO_BADGE[t.stato as StatoTorneo]} hover:opacity-100`}
                    >
                      {t.stato}
                    </Badge>
                  </div>

                  <p className="text-sm text-slate-400">
                    Giocatori {t.genere === "MASCHILE" ? "maschili" : "femminili"}{" "}
                    disponibili: <strong className="text-white">{giocatoriDisp}</strong>
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSorteggio(t)}
                      disabled={drawing === t.id || giocatoriDisp < 2}
                      className="bg-green-600 hover:bg-green-500"
                    >
                      {drawing === t.id ? "Sorteggio..." : "Esegui Sorteggio"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPreviewTorneoId(t.id)}
                      className="bg-transparent border-slate-700 hover:bg-slate-800"
                      disabled={partite === 0}
                    >
                      Anteprima Bracket
                    </Button>
                    {t.stato !== "CONCLUSO" && partite > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStato(t, "CONCLUSO")}
                        className="bg-transparent border-slate-700 hover:bg-slate-800"
                      >
                        Concludi
                      </Button>
                    )}
                    {t.stato === "BOZZA" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(t)}
                      >
                        Elimina
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {previewTorneo && previewTorneo.matches.length > 0 && (
        <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between mb-2 px-2">
            <h2 className="text-xl font-semibold">
              Anteprima Bracket — {previewTorneo.nome}
            </h2>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setPreviewTorneoId(null)}
              className="text-slate-400"
            >
              Chiudi
            </Button>
          </div>
          <Bracket torneo={previewTorneo} />
        </section>
      )}
    </div>
  );
}
