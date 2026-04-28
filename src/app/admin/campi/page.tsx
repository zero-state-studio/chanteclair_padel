"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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

type Field = {
  id: string;
  nome: string;
  descrizione: string | null;
};

const empty = { nome: "", descrizione: "" };

export default function CampiPage() {
  const [fields, setFields] = useState<Field[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Field | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const normalize = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  const filtered = useMemo(() => {
    if (!filter.trim()) return fields;
    const q = normalize(filter.trim());
    return fields.filter(
      (f) =>
        normalize(f.nome).includes(q) ||
        normalize(f.descrizione ?? "").includes(q)
    );
  }, [fields, filter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/campi`, { cache: "no-store" });
      if (res.ok) setFields(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    setSelected(new Set());
  }, [load]);

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
      prev.size === filtered.length
        ? new Set()
        : new Set(filtered.map((s) => s.id))
    );
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (
      !confirm(
        `Eliminare ${selected.size} campi selezionati? Operazione non reversibile.`
      )
    )
      return;
    setBulkDeleting(true);
    try {
      const ids = Array.from(selected);
      const results = await Promise.allSettled(
        ids.map((id) => fetch(`/api/campi/${id}`, { method: "DELETE" }))
      );
      const failed = results.filter(
        (r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok)
      ).length;
      if (failed > 0) toast.error(`${failed} eliminazioni fallite su ${ids.length}`);
      else toast.success(`${ids.length} campi eliminati`);
      setSelected(new Set());
      await load();
    } finally {
      setBulkDeleting(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...empty });
    setDialogOpen(true);
  };

  const openEdit = (f: Field) => {
    setEditing(f);
    setForm({ nome: f.nome, descrizione: f.descrizione ?? "" });
    setDialogOpen(true);
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast.error("Nome obbligatorio");
      return;
    }
    setSubmitting(true);
    try {
      const url = editing ? `/api/campi/${editing.id}` : "/api/campi";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: form.nome.trim(),
          descrizione: form.descrizione.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Errore salvataggio");
      }
      toast.success(editing ? "Campo aggiornato" : "Campo creato");
      setDialogOpen(false);
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (f: Field) => {
    if (!confirm(`Eliminare ${f.nome}? Operazione non reversibile.`)) return;
    const res = await fetch(`/api/campi/${f.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Campo eliminato");
      await load();
    } else {
      toast.error("Errore eliminazione");
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-12 py-6 md:py-12">
      <div className="grid grid-cols-12 gap-4 md:gap-6 mb-6 md:mb-12 items-end">
        <div className="col-span-12 md:col-span-7">
          <div className="text-eyebrow text-cream/50 mb-2 md:mb-3">07 / Strutture</div>
          <h1 className="text-display-jumbo text-cream text-[14vw] sm:text-[10vw] md:text-[6vw] leading-[0.85]">
            Campi
          </h1>
        </div>
        <div className="col-span-12 md:col-span-5 flex md:justify-end">
          <Button
            onClick={openCreate}
            className="bg-court-line text-court hover:bg-[#e7ff75] font-body font-semibold tracking-wider uppercase text-xs h-12 px-6 rounded-sm w-full md:w-auto"
          >
            + Nuovo campo
          </Button>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-court-deep border-cream/15 text-cream max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifica campo" : "Nuovo campo"}
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
              <Label htmlFor="descrizione">Descrizione</Label>
              <textarea
                id="descrizione"
                value={form.descrizione}
                onChange={(e) =>
                  setForm({ ...form, descrizione: e.target.value })
                }
                rows={3}
                className="w-full rounded-sm bg-cream/5 border border-cream/15 text-cream px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-court-line"
                placeholder="Es. Campo coperto in erba sintetica…"
              />
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
          placeholder="Filtra per nome o descrizione…"
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
            ? `${filtered.length} di ${fields.length} campi`
            : `${fields.length} ${fields.length === 1 ? "campo" : "campi"}`}
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

      {/* Mobile */}
      <div className="md:hidden space-y-2">
        {loading ? (
          <p className="text-cream/60 text-center py-8">Caricamento...</p>
        ) : fields.length === 0 ? (
          <p className="text-cream/60 text-center py-8">
            Nessun campo. Aggiungine uno con il pulsante sopra.
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-cream/60 text-center py-8">
            Nessun campo per &quot;{filter}&quot;.
          </p>
        ) : (
          <>
            <label className="flex items-center gap-2 px-3 py-2 text-eyebrow text-cream/60">
              <input
                type="checkbox"
                checked={
                  filtered.length > 0 && selected.size === filtered.length
                }
                ref={(el) => {
                  if (el)
                    el.indeterminate =
                      selected.size > 0 && selected.size < filtered.length;
                }}
                onChange={toggleAll}
                className="h-4 w-4 accent-court-line cursor-pointer"
                aria-label="Seleziona tutti"
              />
              Seleziona tutti
            </label>
            {filtered.map((f) => (
              <div
                key={f.id}
                className={`rounded-md border border-line bg-court-deep p-3 flex items-start gap-3 ${
                  selected.has(f.id) ? "bg-court-line/5" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(f.id)}
                  onChange={() => toggleOne(f.id)}
                  className="h-5 w-5 accent-court-line cursor-pointer shrink-0 mt-1"
                  aria-label={`Seleziona ${f.nome}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-cream truncate">{f.nome}</p>
                  {f.descrizione && (
                    <p className="text-cream/60 text-sm mt-0.5 line-clamp-2">
                      {f.descrizione}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <a
                    href={`/campo/${f.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1 bg-court-line text-court hover:bg-[#e7ff75] h-7 px-2.5 text-[0.8rem] font-medium rounded-md"
                  >
                    ↗ Apri
                  </a>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(f)}
                    className="bg-transparent border-slate-700 hover:bg-court-deep h-8 px-3 text-xs"
                  >
                    Modifica
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(f)}
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

      {/* Desktop */}
      <div className="hidden md:block rounded-md border border-line bg-court-deep">
        <Table>
          <TableHeader>
            <TableRow className="border-line hover:bg-transparent">
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={
                    filtered.length > 0 && selected.size === filtered.length
                  }
                  ref={(el) => {
                    if (el)
                      el.indeterminate =
                        selected.size > 0 && selected.size < filtered.length;
                  }}
                  onChange={toggleAll}
                  className="h-4 w-4 accent-court-line cursor-pointer"
                  aria-label="Seleziona tutti"
                />
              </TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Descrizione</TableHead>
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
            ) : fields.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-cream/60 py-8">
                  Nessun campo. Aggiungine uno con il pulsante a destra.
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-cream/60 py-8">
                  Nessun campo per &quot;{filter}&quot;.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((f) => (
                <TableRow
                  key={f.id}
                  className={`border-line ${
                    selected.has(f.id) ? "bg-court-line/5" : ""
                  }`}
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selected.has(f.id)}
                      onChange={() => toggleOne(f.id)}
                      className="h-4 w-4 accent-court-line cursor-pointer"
                      aria-label={`Seleziona ${f.nome}`}
                    />
                  </TableCell>
                  <TableCell className="font-semibold">{f.nome}</TableCell>
                  <TableCell className="text-cream/70">
                    {f.descrizione ?? (
                      <span className="text-cream/30">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-2">
                      <a
                        href={`/campo/${f.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1 bg-court-line text-court hover:bg-[#e7ff75] h-7 px-2.5 text-[0.8rem] font-medium rounded-md"
                        title="Apri pagina campo in nuova scheda"
                      >
                        ↗ Apri
                      </a>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(f)}
                        className="bg-transparent border-slate-700 hover:bg-court-deep"
                      >
                        Modifica
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(f)}
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
