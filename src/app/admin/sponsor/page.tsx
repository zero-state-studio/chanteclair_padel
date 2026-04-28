"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

type Sponsor = {
  id: string;
  nome: string;
  logoUrl: string | null;
};

const empty = { nome: "" };

export default function SponsorPage() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Sponsor | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [showcasing, setShowcasing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showcase = async (ids: string[]) => {
    if (ids.length === 0) return;
    setShowcasing(true);
    try {
      const res = await fetch(`/api/sponsors/showcase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sponsorIds: ids }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Errore");
      toast.success(
        ids.length === 1
          ? "Sponsor mostrato sui tabelloni"
          : `${data.count} sponsor mostrati sui tabelloni`
      );
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setShowcasing(false);
    }
  };

  const assegnaSponsor = async () => {
    if (
      !confirm(
        "Assegnare uno sponsor a tutte le partite in programma? Le assegnazioni esistenti verranno sovrascritte."
      )
    )
      return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/sponsors/assegna`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Errore assegnazione");
      toast.success(
        `Assegnati ${data.sponsors} sponsor su ${data.matches} partite`
      );
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setAssigning(false);
    }
  };

  const normalize = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  const filteredSponsors = useMemo(() => {
    if (!filter.trim()) return sponsors;
    const q = normalize(filter.trim());
    return sponsors.filter((s) => normalize(s.nome).includes(q));
  }, [sponsors, filter]);

  const loadSponsors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sponsors`, { cache: "no-store" });
      if (res.ok) setSponsors(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSponsors();
    setSelected(new Set());
  }, [loadSponsors]);

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) =>
      prev.size === filteredSponsors.length
        ? new Set()
        : new Set(filteredSponsors.map((s) => s.id))
    );
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (
      !confirm(
        `Eliminare ${selected.size} sponsor selezionati? Operazione non reversibile.`
      )
    )
      return;
    setBulkDeleting(true);
    try {
      const ids = Array.from(selected);
      const results = await Promise.allSettled(
        ids.map((id) => fetch(`/api/sponsors/${id}`, { method: "DELETE" }))
      );
      const failed = results.filter(
        (r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok)
      ).length;
      if (failed > 0) toast.error(`${failed} eliminazioni fallite su ${ids.length}`);
      else toast.success(`${ids.length} sponsor eliminati`);
      setSelected(new Set());
      await loadSponsors();
    } finally {
      setBulkDeleting(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...empty });
    setLogo(null);
    setLogoPreview(null);
    setDialogOpen(true);
  };

  const openEdit = (s: Sponsor) => {
    setEditing(s);
    setForm({ nome: s.nome });
    setLogo(null);
    setLogoPreview(s.logoUrl);
    setDialogOpen(true);
  };

  const handleFile = (file: File | null) => {
    setLogo(file);
    if (!file) {
      setLogoPreview(editing?.logoUrl ?? null);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setLogoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast.error("Nome obbligatorio");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("nome", form.nome.trim());
      if (logo) fd.append("logo", logo);

      const url = editing ? `/api/sponsors/${editing.id}` : "/api/sponsors";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, { method, body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Errore salvataggio");
      }
      toast.success(editing ? "Sponsor aggiornato" : "Sponsor creato");
      setDialogOpen(false);
      await loadSponsors();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (s: Sponsor) => {
    if (!confirm(`Eliminare ${s.nome}? Operazione non reversibile.`)) return;
    const res = await fetch(`/api/sponsors/${s.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Sponsor eliminato");
      await loadSponsors();
    } else {
      toast.error("Errore eliminazione");
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-12 py-6 md:py-12">
      <div className="grid grid-cols-12 gap-4 md:gap-6 mb-6 md:mb-12 items-end">
        <div className="col-span-12 md:col-span-7">
          <div className="text-eyebrow text-cream/50 mb-2 md:mb-3">06 / Partner</div>
          <h1 className="text-display-jumbo text-cream text-[14vw] sm:text-[10vw] md:text-[6vw] leading-[0.85]">
            Sponsor
          </h1>
        </div>
        <div className="col-span-12 md:col-span-5 flex md:justify-end gap-2">
          <Button
            onClick={assegnaSponsor}
            disabled={assigning || sponsors.length === 0}
            className="bg-transparent border border-cream/30 text-cream hover:bg-cream/5 font-body font-semibold tracking-wider uppercase text-xs h-12 px-6 rounded-sm w-full md:w-auto"
          >
            {assigning ? "Assegnazione…" : "⚑ Assegna sponsor"}
          </Button>
          <Button
            onClick={openCreate}
            className="bg-court-line text-court hover:bg-[#e7ff75] font-body font-semibold tracking-wider uppercase text-xs h-12 px-6 rounded-sm w-full md:w-auto"
          >
            + Nuovo sponsor
          </Button>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-court-deep border-cream/15 text-cream max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifica sponsor" : "Nuovo sponsor"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="bg-cream/5 border-cream/15 text-cream"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo">Logo</Label>
              <div className="flex items-center gap-3">
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoPreview}
                    alt="anteprima"
                    className="h-16 w-16 rounded-sm object-contain bg-cream/10 p-1"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-sm bg-cream/10 flex items-center justify-center text-2xl">
                    🏷️
                  </div>
                )}
                <Input
                  id="logo"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                  className="bg-cream/5 border-cream/15 text-cream"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
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

      <div className="mb-4 relative">
        <Input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtra per nome…"
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

      <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
        <p className="text-eyebrow text-cream/50">
          {filter
            ? `${filteredSponsors.length} di ${sponsors.length} sponsor`
            : `${sponsors.length} ${sponsors.length === 1 ? "sponsor" : "sponsor"}`}
        </p>

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 rounded-sm border border-clay/40 bg-clay/10 w-full sm:w-auto">
            <span className="text-eyebrow text-cream/80">
              {selected.size} selezionati
            </span>
            <div className="flex gap-2 ml-auto sm:ml-0">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelected(new Set())}
                className="text-cream/70 hover:text-cream hover:bg-cream/5 h-8"
              >
                Deseleziona
              </Button>
              <Button
                size="sm"
                onClick={() => showcase(Array.from(selected))}
                disabled={showcasing}
                className="bg-court-line text-court hover:bg-[#e7ff75] h-8"
              >
                {showcasing ? "…" : `▶ Mostra ${selected.size}`}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={bulkDelete}
                disabled={bulkDeleting}
                className="h-8"
              >
                {bulkDeleting ? "Eliminazione..." : `Elimina ${selected.size}`}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile: card list */}
      <div className="md:hidden space-y-2">
        {loading ? (
          <p className="text-cream/60 text-center py-8">Caricamento...</p>
        ) : sponsors.length === 0 ? (
          <p className="text-cream/60 text-center py-8">
            Nessun sponsor. Aggiungine uno con il pulsante sopra.
          </p>
        ) : filteredSponsors.length === 0 ? (
          <p className="text-cream/60 text-center py-8">
            Nessun sponsor per &quot;{filter}&quot;.
          </p>
        ) : (
          <>
            <label className="flex items-center gap-2 px-3 py-2 text-eyebrow text-cream/60">
              <input
                type="checkbox"
                checked={
                  filteredSponsors.length > 0 &&
                  selected.size === filteredSponsors.length
                }
                ref={(el) => {
                  if (el)
                    el.indeterminate =
                      selected.size > 0 &&
                      selected.size < filteredSponsors.length;
                }}
                onChange={toggleAll}
                className="h-4 w-4 accent-court-line cursor-pointer"
                aria-label="Seleziona tutti"
              />
              Seleziona tutti
            </label>
            {filteredSponsors.map((s) => (
              <div
                key={s.id}
                className={`rounded-md border border-line bg-court-deep p-3 flex items-center gap-3 ${
                  selected.has(s.id) ? "bg-court-line/5" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(s.id)}
                  onChange={() => toggleOne(s.id)}
                  className="h-5 w-5 accent-court-line cursor-pointer shrink-0"
                  aria-label={`Seleziona ${s.nome}`}
                />
                {s.logoUrl ? (
                  <Image
                    src={s.logoUrl}
                    alt=""
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-sm object-contain bg-cream/10 p-1 shrink-0"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-sm bg-cream/10 flex items-center justify-center shrink-0">
                    🏷️
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-cream truncate">{s.nome}</p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => showcase([s.id])}
                    disabled={showcasing}
                    className="bg-court-line text-court hover:bg-[#e7ff75] h-8 px-3 text-xs"
                  >
                    ▶ Mostra
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(s)}
                    className="bg-transparent border-slate-700 hover:bg-court-deep h-8 px-3 text-xs"
                  >
                    Modifica
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(s)}
                    className="h-8 px-3 text-xs"
                  >
                    Elimina
                  </Button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block rounded-md border border-line bg-court-deep">
        <Table>
          <TableHeader>
            <TableRow className="border-line hover:bg-transparent">
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={
                    filteredSponsors.length > 0 &&
                    selected.size === filteredSponsors.length
                  }
                  ref={(el) => {
                    if (el)
                      el.indeterminate =
                        selected.size > 0 &&
                        selected.size < filteredSponsors.length;
                  }}
                  onChange={toggleAll}
                  className="h-4 w-4 accent-court-line cursor-pointer"
                  aria-label="Seleziona tutti"
                />
              </TableHead>
              <TableHead className="w-16">Logo</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-cream/60 py-8">
                  Caricamento...
                </TableCell>
              </TableRow>
            ) : sponsors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-cream/60 py-8">
                  Nessun sponsor. Aggiungine uno con il pulsante a destra.
                </TableCell>
              </TableRow>
            ) : filteredSponsors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-cream/60 py-8">
                  Nessun sponsor per &quot;{filter}&quot;.
                </TableCell>
              </TableRow>
            ) : (
              filteredSponsors.map((s) => (
                <TableRow
                  key={s.id}
                  className={`border-line ${
                    selected.has(s.id) ? "bg-court-line/5" : ""
                  }`}
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selected.has(s.id)}
                      onChange={() => toggleOne(s.id)}
                      className="h-4 w-4 accent-court-line cursor-pointer"
                      aria-label={`Seleziona ${s.nome}`}
                    />
                  </TableCell>
                  <TableCell>
                    {s.logoUrl ? (
                      <Image
                        src={s.logoUrl}
                        alt=""
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-sm object-contain bg-cream/10 p-1"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-sm bg-cream/10 flex items-center justify-center">
                        🏷️
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{s.nome}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => showcase([s.id])}
                        disabled={showcasing}
                        className="bg-court-line text-court hover:bg-[#e7ff75]"
                      >
                        ▶ Mostra
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(s)}
                        className="bg-transparent border-slate-700 hover:bg-court-deep"
                      >
                        Modifica
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(s)}
                      >
                        Elimina
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
