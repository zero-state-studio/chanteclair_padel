"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { GENERE_COLOR, genereChipStyle } from "@/lib/genere-style";
import type { Genere, StatoTorneo, TournamentWithMatches } from "@/types";

const GENERI_OPZIONI: { value: Genere; label: string; disabled?: boolean }[] = [
  { value: "MASCHILE", label: "Maschile" },
  { value: "FEMMINILE", label: "Femminile" },
  { value: "MISTO", label: "Misto", disabled: true },
];

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
  const [counts, setCounts] = useState<Record<Genere, number>>({
    MASCHILE: 0,
    FEMMINILE: 0,
    MISTO: 0,
  });

  const [form, setForm] = useState<{
    nome: string;
    generi: Genere[];
    anno: number;
  }>({
    nome: "",
    generi: ["MASCHILE"],
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
      setCounts({ MASCHILE: mList.length, FEMMINILE: fList.length, MISTO: 0 });
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
    if (form.generi.length === 0) {
      toast.error("Seleziona almeno un tabellone");
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
      toast.success(
        form.generi.length === 1 ? "Torneo creato" : `${form.generi.length} tornei creati`
      );
      setForm({ nome: "", generi: ["MASCHILE"], anno: annoCorrente });
      await loadAll();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const toggleGenere = (g: Genere) => {
    setForm((f) => ({
      ...f,
      generi: f.generi.includes(g)
        ? f.generi.filter((x) => x !== g)
        : [...f.generi, g],
    }));
  };

  const handleDelete = async (t: TorneoListItem) => {
    if (
      !confirm(
        `Eliminare il torneo "${t.nome}"? Verranno cancellate solo le partite. Squadre e giocatori restano.`
      )
    )
      return;
    const res = await fetch(`/api/tornei/${t.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Torneo eliminato");
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
    if (numSquadre > 36) {
      toast.error(`Massimo 36 squadre supportate (${t.genere}, attuali: ${numSquadre})`);
      return;
    }
    const haPartite = (t.matches?.length ?? 0) > 0;
    const buchi = 36 - numSquadre;
    const msg = [
      `Sorteggio fase 1: 12 gironi da 3 squadre${
        buchi > 0 ? ` (${buchi} slot vuoti, walkover automatici)` : ""
      }.`,
      haPartite ? "ATTENZIONE: gironi e partite esistenti verranno cancellati." : "",
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
      toast.success("Sorteggio fase 1 completato");
      await loadAll();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDrawing(null);
    }
  };

  const handleGeneraGironi2 = async (t: TorneoListItem) => {
    if (
      !confirm(
        `Generare gironi fase 2 (Gold/Silver/Bronze) per "${t.nome}"? Le partite fase 1 non saranno più modificabili.`
      )
    )
      return;
    try {
      const res = await fetch(`/api/tornei/${t.id}/genera-gironi-2`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Errore");
      }
      toast.success("Gironi fase 2 generati");
      await loadAll();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleGeneraFinali = async (t: TorneoListItem) => {
    if (
      !confirm(
        `Generare semifinali + finali per "${t.nome}"?`
      )
    )
      return;
    try {
      const res = await fetch(`/api/tornei/${t.id}/genera-finali`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Errore");
      }
      toast.success("Finali generate");
      await loadAll();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleInizia = async (t: TorneoListItem, conAnimazione: boolean) => {
    if (!t.groups?.length) {
      toast.error("Sorteggia prima i gironi");
      return;
    }
    const label = conAnimazione ? "con animazione" : "";
    const msg = `Iniziare il torneo "${t.nome}"${label ? " " + label : ""}? Il tabellone diventerà pubblicamente visibile.`;
    if (!confirm(msg)) return;
    const endpoint = conAnimazione
      ? `/api/tornei/${t.id}/inizia-con-animazione`
      : `/api/tornei/${t.id}/inizia`;
    try {
      const res = await fetch(endpoint, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Errore avvio torneo");
      }
      toast.success(
        conAnimazione ? "Torneo avviato con animazione" : "Torneo avviato"
      );
      await loadAll();
    } catch (err) {
      toast.error((err as Error).message);
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

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-12 py-6 md:py-12 space-y-8 md:space-y-12">
      <div className="grid grid-cols-12 gap-4 md:gap-6 items-end">
        <div className="col-span-12 md:col-span-7">
          <div className="text-eyebrow text-cream/50 mb-2 md:mb-3">01 / Tornei</div>
          <h1 className="text-display-jumbo text-cream text-[14vw] sm:text-[10vw] md:text-[6vw] leading-[0.85]">
            Tornei
          </h1>
        </div>
        <div className="col-span-12 md:col-span-5 md:pl-8 md:border-l border-line">
          <p className="text-cream/70 text-sm md:text-base leading-relaxed">
            Crea l&apos;edizione, sorteggia il bracket, attiva la diretta. Il
            sorteggio applica le teste di serie del regolamento e aggiunge i BYE
            necessari per chiudere il tabellone alla potenza di 2 successiva.
          </p>
        </div>
      </div>

      <section className="rounded-sm border border-line bg-court-deep p-5 md:p-8">
        <div className="text-eyebrow text-court-line mb-2">— nuova edizione</div>
        <h2 className="font-display text-2xl md:text-3xl mb-5 md:mb-6 text-cream">Crea torneo</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
          <div className="space-y-2 md:col-span-2">
            <Label>Tabelloni da generare</Label>
            <div className="flex flex-wrap gap-3">
              {GENERI_OPZIONI.map((opt) => {
                const checked = form.generi.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2 px-3 py-2 rounded border text-sm ${
                      opt.disabled
                        ? "border-cream/10 text-cream/40 cursor-not-allowed"
                        : "border-cream/15 text-cream cursor-pointer hover:bg-cream/5"
                    } ${checked && !opt.disabled ? "bg-court-line/10 border-court-line" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={opt.disabled}
                      onChange={() => !opt.disabled && toggleGenere(opt.value)}
                      className="accent-court-line"
                    />
                    {opt.label}
                    {opt.disabled && (
                      <span className="text-[10px] text-cream/40">(prossimamente)</span>
                    )}
                  </label>
                );
              })}
            </div>
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
              className="bg-court-line text-court hover:bg-[#e7ff75] w-full md:w-auto h-11"
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
              const generaLabel =
                t.genere === "MASCHILE" ? "Maschile" : t.genere === "FEMMINILE" ? "Femminile" : "Misto";
              const accent = GENERE_COLOR[t.genere as Genere];
              return (
                <div
                  key={t.id}
                  className="rounded-lg border bg-court-deep p-4 md:p-5 space-y-4"
                  style={{
                    borderColor: "var(--color-line)",
                    borderLeftWidth: 5,
                    borderLeftColor: accent,
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-base md:text-lg font-semibold truncate">{t.nome}</h3>
                      <p className="text-xs md:text-sm text-cream/60 mt-1 flex items-center gap-2 flex-wrap">
                        <span
                          className="cc-mono text-[10px] tracking-wider px-1.5 py-0.5 rounded-sm uppercase"
                          style={genereChipStyle(t.genere as Genere)}
                        >
                          {generaLabel}
                        </span>
                        <span>· {t.anno} · {partite} partite · fase{" "}
                          <span className="text-court-line">{t.fase}</span>
                        </span>
                      </p>
                    </div>
                    <Badge
                      className={`${STATO_BADGE[t.stato as StatoTorneo]} hover:opacity-100 shrink-0`}
                    >
                      {t.stato}
                    </Badge>
                  </div>

                  <p className="text-xs md:text-sm text-cream/60">
                    Squadre{" "}
                    {t.genere === "MASCHILE"
                      ? "maschili"
                      : t.genere === "FEMMINILE"
                      ? "femminili"
                      : "miste"}{" "}
                    disponibili: <strong className="text-white">{squadreDisp}</strong>
                  </p>

                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSorteggio(t)}
                      disabled={drawing === t.id || squadreDisp < 2}
                      className="bg-court-line text-court hover:bg-[#e7ff75] h-10 col-span-2 sm:col-span-1"
                    >
                      {drawing === t.id ? "Sorteggio..." : "Sorteggia Gironi"}
                    </Button>
                    {t.stato === "BOZZA" && (t.groups?.length ?? 0) > 0 && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleInizia(t, false)}
                          className="bg-court-line text-court hover:bg-[#e7ff75] h-10"
                        >
                          Inizia torneo
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleInizia(t, true)}
                          className="bg-court-line text-court hover:bg-[#e7ff75] h-10"
                        >
                          Inizia torneo con animazione
                        </Button>
                      </>
                    )}
                    {(() => {
                      const phase1Matches = t.matches?.filter(
                        (m) => m.groupId !== null && m.round === 0
                      ) ?? [];
                      const phase2GroupIds = new Set(
                        t.groups?.filter((g) => g.fase === 2).map((g) => g.id) ?? []
                      );
                      const phase1GroupIds = new Set(
                        t.groups?.filter((g) => g.fase === 1).map((g) => g.id) ?? []
                      );
                      const phase1Matches1 = phase1Matches.filter(
                        (m) => phase1GroupIds.has(m.groupId!)
                      );
                      const phase2Matches = phase1Matches.filter(
                        (m) => phase2GroupIds.has(m.groupId!)
                      );
                      const fase1Complete =
                        t.fase === "GIRONI_1" &&
                        phase1Matches1.length > 0 &&
                        phase1Matches1.every((m) => m.stato === "COMPLETATA");
                      const fase2Complete =
                        t.fase === "GIRONI_2" &&
                        phase2Matches.length > 0 &&
                        phase2Matches.every((m) => m.stato === "COMPLETATA");
                      return (
                        <>
                          {fase1Complete && (
                            <Button
                              size="sm"
                              onClick={() => handleGeneraGironi2(t)}
                              className="bg-court-line text-court hover:bg-[#e7ff75] h-10"
                            >
                              Genera Gironi 2
                            </Button>
                          )}
                          {fase2Complete && (
                            <Button
                              size="sm"
                              onClick={() => handleGeneraFinali(t)}
                              className="bg-court-line text-court hover:bg-[#e7ff75] h-10"
                            >
                              Genera Finali
                            </Button>
                          )}
                        </>
                      );
                    })()}
                    {partite > 0 ? (
                      <Link
                        href={`/admin/tabelloni?id=${t.id}`}
                        className={cn(
                          buttonVariants({ size: "sm", variant: "outline" }),
                          "bg-transparent border-cream/20 hover:bg-cream/5 text-cream h-10"
                        )}
                      >
                        Anteprima
                      </Link>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled
                        className="bg-transparent border-cream/20 text-cream h-10"
                      >
                        Anteprima
                      </Button>
                    )}
                    {t.stato !== "CONCLUSO" && partite > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStato(t, "CONCLUSO")}
                        className="bg-transparent border-cream/20 hover:bg-cream/5 text-cream h-10"
                      >
                        Concludi
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(t)}
                      className="h-10"
                    >
                      Elimina
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}
