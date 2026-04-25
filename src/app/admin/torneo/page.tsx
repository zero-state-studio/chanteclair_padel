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
  BOZZA: "bg-cream/20 text-cream",
  ATTIVO: "bg-court-line text-court",
  CONCLUSO: "bg-clay text-cream",
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
        fetch("/api/squadre?genere=MASCHILE", { cache: "no-store" }),
        fetch("/api/squadre?genere=FEMMINILE", { cache: "no-store" }),
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
    const numSquadre = counts[t.genere];
    if (numSquadre < 2) {
      toast.error(`Servono almeno 2 squadre (${t.genere})`);
      return;
    }
    const totale = prossimaPotenzaDi2(numSquadre);
    const numBye = totale - numSquadre;
    const haPartite = t.matches?.length > 0;

    const msg = [
      `Sorteggio per ${numSquadre} squadre${
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
    <div className="mx-auto max-w-[1400px] px-6 md:px-12 py-12 space-y-12">
      <div className="grid grid-cols-12 gap-6 items-end">
        <div className="col-span-12 md:col-span-7">
          <div className="text-eyebrow text-cream/50 mb-3">02 / Tornei</div>
          <h1 className="text-display-jumbo text-cream text-[10vw] md:text-[6vw]">
            Tornei
          </h1>
        </div>
        <div className="col-span-12 md:col-span-5 md:pl-8 md:border-l border-line">
          <p className="text-cream/70 leading-relaxed">
            Crea l&apos;edizione, sorteggia il bracket, attiva la diretta. Il
            sorteggio applica le teste di serie del regolamento e aggiunge i BYE
            necessari per chiudere il tabellone alla potenza di 2 successiva.
          </p>
        </div>
      </div>

      <section className="rounded-sm border border-line bg-court-deep p-8">
        <div className="text-eyebrow text-court-line mb-2">— nuova edizione</div>
        <h2 className="font-display text-3xl mb-6 text-cream">Crea torneo</h2>
        <form onSubmit={handleCreate} className="grid md:grid-cols-4 gap-3">
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="nome-t">Nome torneo</Label>
            <Input
              id="nome-t"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Es. Torneo Estivo"
              className="bg-cream/5 border-cream/15 text-cream"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Genere</Label>
            <Select
              value={form.genere}
              onValueChange={(v) => setForm({ ...form, genere: v as Genere })}
            >
              <SelectTrigger className="bg-cream/5 border-cream/15 text-cream">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-court-deep border-cream/15 text-cream">
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
              className="bg-cream/5 border-cream/15 text-cream"
              required
            />
          </div>
          <div className="md:col-span-4">
            <Button
              type="submit"
              disabled={creating}
              className="bg-court-line text-court hover:bg-[#e7ff75]"
            >
              {creating ? "Creazione..." : "Crea Torneo"}
            </Button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Tornei esistenti</h2>
        {loading ? (
          <p className="text-cream/60">Caricamento...</p>
        ) : tornei.length === 0 ? (
          <p className="text-cream/60">Nessun torneo. Creane uno qui sopra.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {tornei.map((t) => {
              const partite = t.matches?.length ?? 0;
              const squadreDisp = counts[t.genere as Genere];
              return (
                <div
                  key={t.id}
                  className="rounded-lg border border-line bg-court-deep p-5 space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">{t.nome}</h3>
                      <p className="text-sm text-cream/60">
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

                  <p className="text-sm text-cream/60">
                    Squadre {t.genere === "MASCHILE" ? "maschili" : "femminili"}{" "}
                    disponibili: <strong className="text-white">{squadreDisp}</strong>
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSorteggio(t)}
                      disabled={drawing === t.id || squadreDisp < 2}
                      className="bg-court-line text-court hover:bg-[#e7ff75]"
                    >
                      {drawing === t.id ? "Sorteggio..." : "Esegui Sorteggio"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPreviewTorneoId(t.id)}
                      className="bg-transparent border-cream/20 hover:bg-cream/5 text-cream"
                      disabled={partite === 0}
                    >
                      Anteprima Bracket
                    </Button>
                    {t.stato !== "CONCLUSO" && partite > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStato(t, "CONCLUSO")}
                        className="bg-transparent border-cream/20 hover:bg-cream/5 text-cream"
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
        <section className="rounded-lg border border-line bg-court-deep p-4">
          <div className="flex items-center justify-between mb-2 px-2">
            <h2 className="text-xl font-semibold">
              Anteprima Bracket — {previewTorneo.nome}
            </h2>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setPreviewTorneoId(null)}
              className="text-cream/60"
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
