"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Player = {
  id: string;
  nome: string;
  cognome: string;
  email: string | null;
  telefono: string | null;
  fotoUrl: string | null;
  teamAsPlayer1?: { id: string; nome: string; genere: string } | null;
  teamAsPlayer2?: { id: string; nome: string; genere: string } | null;
};

const empty = {
  nome: "",
  cognome: "",
  email: "",
  telefono: "",
};

export default function GiocatoriPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Player | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPlayers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/giocatori`, { cache: "no-store" });
      if (res.ok) setPlayers(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlayers();
    setSelected(new Set());
  }, [loadPlayers]);

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
      prev.size === players.length ? new Set() : new Set(players.map((p) => p.id))
    );
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (
      !confirm(
        `Eliminare ${selected.size} giocatori selezionati? Operazione non reversibile. Verranno eliminate anche le squadre che li contengono.`
      )
    )
      return;
    setBulkDeleting(true);
    try {
      const ids = Array.from(selected);
      const results = await Promise.allSettled(
        ids.map((id) => fetch(`/api/giocatori/${id}`, { method: "DELETE" }))
      );
      const failed = results.filter(
        (r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok)
      ).length;
      if (failed > 0) toast.error(`${failed} eliminazioni fallite su ${ids.length}`);
      else toast.success(`${ids.length} giocatori eliminati`);
      setSelected(new Set());
      await loadPlayers();
    } finally {
      setBulkDeleting(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...empty });
    setFoto(null);
    setFotoPreview(null);
    setDialogOpen(true);
  };

  const openEdit = (p: Player) => {
    setEditing(p);
    setForm({
      nome: p.nome,
      cognome: p.cognome,
      email: p.email ?? "",
      telefono: p.telefono ?? "",
    });
    setFoto(null);
    setFotoPreview(p.fotoUrl);
    setDialogOpen(true);
  };

  const handleFile = (file: File | null) => {
    setFoto(file);
    if (!file) {
      setFotoPreview(editing?.fotoUrl ?? null);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setFotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.nome.trim() || !form.cognome.trim()) {
      toast.error("Nome e cognome obbligatori");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("nome", form.nome.trim());
      fd.append("cognome", form.cognome.trim());
      fd.append("email", form.email.trim());
      fd.append("telefono", form.telefono.trim());
      if (foto) fd.append("foto", foto);

      const url = editing ? `/api/giocatori/${editing.id}` : "/api/giocatori";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, { method, body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Errore salvataggio");
      }
      toast.success(editing ? "Giocatore aggiornato" : "Giocatore creato");
      setDialogOpen(false);
      await loadPlayers();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (p: Player) => {
    if (!confirm(`Eliminare ${p.nome} ${p.cognome}? Operazione non reversibile.`))
      return;
    const res = await fetch(`/api/giocatori/${p.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Giocatore eliminato");
      await loadPlayers();
    } else {
      toast.error("Errore eliminazione");
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] px-6 md:px-12 py-12">
      <div className="grid grid-cols-12 gap-6 mb-12 items-end">
        <div className="col-span-12 md:col-span-7">
          <div className="text-eyebrow text-cream/50 mb-3">02 / Roster</div>
          <h1 className="text-display-jumbo text-cream text-[10vw] md:text-[6vw]">
            Giocatori
          </h1>
        </div>
        <div className="col-span-12 md:col-span-5 flex md:justify-end">
          <Button
            onClick={openCreate}
            className="bg-court-line text-court hover:bg-[#e7ff75] font-body font-semibold tracking-wider uppercase text-xs h-12 px-6 rounded-sm"
          >
            + Nuovo giocatore
          </Button>
        </div>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-court-deep border-cream/15 text-cream max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Modifica giocatore" : "Nuovo giocatore"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
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
                  <Label htmlFor="cognome">Cognome *</Label>
                  <Input
                    id="cognome"
                    value={form.cognome}
                    onChange={(e) => setForm({ ...form, cognome: e.target.value })}
                    className="bg-cream/5 border-cream/15 text-cream"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="bg-cream/5 border-cream/15 text-cream"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefono">Telefono</Label>
                <Input
                  id="telefono"
                  type="tel"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  className="bg-cream/5 border-cream/15 text-cream"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="foto">Foto</Label>
                <div className="flex items-center gap-3">
                  {fotoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={fotoPreview}
                      alt="anteprima"
                      className="h-16 w-16 rounded-full object-cover bg-cream/10"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-cream/10 flex items-center justify-center text-2xl">
                      👤
                    </div>
                  )}
                  <Input
                    id="foto"
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

      <div className="flex items-center justify-between mb-4 gap-4">
        <p className="text-eyebrow text-cream/50">
          {players.length} {players.length === 1 ? "giocatore" : "giocatori"}
        </p>

        {selected.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 rounded-sm border border-clay/40 bg-clay/10">
            <span className="text-eyebrow text-cream/80">
              {selected.size} selezionati
            </span>
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
        )}
      </div>

      <div className="rounded-md border border-line bg-court-deep">
        <Table>
          <TableHeader>
            <TableRow className="border-line hover:bg-transparent">
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={
                    players.length > 0 && selected.size === players.length
                  }
                  ref={(el) => {
                    if (el)
                      el.indeterminate =
                        selected.size > 0 && selected.size < players.length;
                  }}
                  onChange={toggleAll}
                  className="h-4 w-4 accent-court-line cursor-pointer"
                  aria-label="Seleziona tutti"
                />
              </TableHead>
              <TableHead className="w-16">Foto</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Cognome</TableHead>
              <TableHead>Squadra</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-cream/60 py-8">
                  Caricamento...
                </TableCell>
              </TableRow>
            ) : players.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-cream/60 py-8">
                  Nessun giocatore. Aggiungine uno con il pulsante a destra.
                </TableCell>
              </TableRow>
            ) : (
              players.map((p) => (
                <TableRow
                  key={p.id}
                  className={`border-line ${
                    selected.has(p.id) ? "bg-court-line/5" : ""
                  }`}
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleOne(p.id)}
                      className="h-4 w-4 accent-court-line cursor-pointer"
                      aria-label={`Seleziona ${p.nome} ${p.cognome}`}
                    />
                  </TableCell>
                  <TableCell>
                    {p.fotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.fotoUrl}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover bg-cream/10"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-cream/10 flex items-center justify-center">
                        👤
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{p.nome}</TableCell>
                  <TableCell>{p.cognome}</TableCell>
                  <TableCell>
                    {p.teamAsPlayer1 || p.teamAsPlayer2 ? (
                      <Badge className="bg-court-line text-court font-mono">
                        {p.teamAsPlayer1?.nome ?? p.teamAsPlayer2?.nome}
                      </Badge>
                    ) : (
                      <span className="text-cream/40">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-cream/60">{p.email ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(p)}
                        className="bg-transparent border-slate-700 hover:bg-court-deep"
                      >
                        Modifica
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(p)}
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
