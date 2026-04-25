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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import type { Genere } from "@/types";

type Player = {
  id: string;
  nome: string;
  cognome: string;
  email: string | null;
  telefono: string | null;
  fotoUrl: string | null;
  genere: Genere;
  livello: number;
};

const empty = {
  nome: "",
  cognome: "",
  email: "",
  telefono: "",
  livello: 0,
};

export default function GiocatoriPage() {
  const [genereAttivo, setGenereAttivo] = useState<Genere>("MASCHILE");
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Player | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPlayers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/giocatori?genere=${genereAttivo}`, {
        cache: "no-store",
      });
      if (res.ok) setPlayers(await res.json());
    } finally {
      setLoading(false);
    }
  }, [genereAttivo]);

  useEffect(() => {
    loadPlayers();
  }, [loadPlayers]);

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
      livello: p.livello,
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
      fd.append("genere", genereAttivo);
      fd.append("livello", String(form.livello));
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
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Gestione Giocatori</h1>
        <Button onClick={openCreate} className="bg-green-600 hover:bg-green-500">
          + Aggiungi Giocatore
        </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-h-[90vh] overflow-y-auto">
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
                    className="bg-slate-800 border-slate-700"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cognome">Cognome *</Label>
                  <Input
                    id="cognome"
                    value={form.cognome}
                    onChange={(e) => setForm({ ...form, cognome: e.target.value })}
                    className="bg-slate-800 border-slate-700"
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
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefono">Telefono</Label>
                <Input
                  id="telefono"
                  type="tel"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="livello">
                  Testa di Serie (0 = nessuna, 1 = prima, 2 = seconda...)
                </Label>
                <Input
                  id="livello"
                  type="number"
                  min={0}
                  value={form.livello}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      livello: parseInt(e.target.value || "0", 10),
                    })
                  }
                  className="bg-slate-800 border-slate-700"
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
                      className="h-16 w-16 rounded-full object-cover bg-slate-700"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-slate-700 flex items-center justify-center text-2xl">
                      👤
                    </div>
                  )}
                  <Input
                    id="foto"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                    className="bg-slate-800 border-slate-700"
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
                  className="bg-green-600 hover:bg-green-500"
                >
                  {submitting ? "Salvataggio..." : editing ? "Salva" : "Crea"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs
        value={genereAttivo}
        onValueChange={(v) => setGenereAttivo(v as Genere)}
        className="mb-4"
      >
        <TabsList className="bg-slate-800">
          <TabsTrigger value="MASCHILE">Maschile</TabsTrigger>
          <TabsTrigger value="FEMMINILE">Femminile</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="rounded-md border border-slate-800 bg-slate-900/40">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="w-16">Foto</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Cognome</TableHead>
              <TableHead>Testa di Serie</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                  Caricamento...
                </TableCell>
              </TableRow>
            ) : players.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                  Nessun giocatore. Aggiungine uno con il pulsante a destra.
                </TableCell>
              </TableRow>
            ) : (
              players.map((p) => (
                <TableRow key={p.id} className="border-slate-800">
                  <TableCell>
                    {p.fotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.fotoUrl}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover bg-slate-700"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center">
                        👤
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{p.nome}</TableCell>
                  <TableCell>{p.cognome}</TableCell>
                  <TableCell>
                    {p.livello > 0 ? (
                      <Badge className="bg-green-600">#{p.livello}</Badge>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-400">{p.email ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(p)}
                        className="bg-transparent border-slate-700 hover:bg-slate-800"
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
