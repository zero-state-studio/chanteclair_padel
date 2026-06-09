# Teste di serie GIRONI_1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Il sorteggio della fase `GIRONI_1` distribuisce le squadre per fasce (teste di serie), così che ogni girone contenga — dove possibile — una squadra di fascia 1, una di fascia 2 e una di fascia 3.

**Architecture:** `distribuisciGironi1` passa da shuffle puro a un pot-system su `Team.livello`. Ritorna `{ gironi, warnings }` (best-effort: il sorteggio procede sempre, gli sbilanciamenti generano avvisi). `GroupTeam.seed` viene popolato con la fascia così che la UI esistente mostri i badge. Nessuna migrazione DB.

**Tech Stack:** TypeScript, Vitest, Next.js App Router (route handler), Prisma, React (admin), sonner (toast).

---

## File Structure

- `src/lib/gironi.ts` — algoritmo di distribuzione. Cambia firma di `distribuisciGironi1` + nuovo helper `buildGironi1Warnings`.
- `src/lib/gironi.test.ts` — aggiorna test esistenti alla nuova firma + nuovi test seeding.
- `src/app/api/tornei/[id]/sorteggio/route.ts` — consuma il nuovo ritorno, salva `seed`, restituisce `warnings`.
- `src/app/admin/torneo/page.tsx` — mostra i warnings via toast.
- `src/app/admin/squadre/page.tsx` — limita l'input tds a 0-3.

Ordine: lib+test (Task 1-2) → API (Task 3) → UI (Task 4-5). `npm run build` torna verde dopo Task 3.

---

### Task 1: Pot-system in `distribuisciGironi1`

**Files:**
- Modify: `src/lib/gironi.ts:42-72` (la funzione `distribuisciGironi1`)
- Test: `src/lib/gironi.test.ts:18-67` (aggiorna i test esistenti alla nuova firma)

- [ ] **Step 1: Aggiorna i test esistenti alla nuova firma `{ gironi, warnings }`**

In `src/lib/gironi.test.ts`, sostituisci l'intero blocco `describe("distribuisciGironi1", ...)` (righe 18-67) con:

```ts
describe("distribuisciGironi1", () => {
  it("creates exactly 12 groups", () => {
    const squadre = Array.from({ length: 36 }, (_, i) => mkTeam(String(i)));
    const { gironi } = distribuisciGironi1(squadre);
    expect(gironi).toHaveLength(12);
  });

  it("each group has 3 slots", () => {
    const squadre = Array.from({ length: 36 }, (_, i) => mkTeam(String(i)));
    const { gironi } = distribuisciGironi1(squadre);
    for (const g of gironi) {
      expect(g.teams).toHaveLength(3);
    }
  });

  it("with fewer than 36 teams, missing slots are filled with null teamId", () => {
    const squadre = Array.from({ length: 30 }, (_, i) => mkTeam(String(i)));
    const { gironi } = distribuisciGironi1(squadre);
    expect(gironi).toHaveLength(12);
    const allSlots = gironi.flatMap((g) => g.teams);
    expect(allSlots.filter((s) => s.teamId === null)).toHaveLength(6);
    expect(allSlots.filter((s) => s.teamId !== null)).toHaveLength(30);
  });

  it("each real team appears exactly once", () => {
    const squadre = Array.from({ length: 36 }, (_, i) => mkTeam(`t${i}`));
    const { gironi } = distribuisciGironi1(squadre);
    const ids = gironi
      .flatMap((g) => g.teams.map((t) => t.teamId))
      .filter((x): x is string => x !== null);
    expect(new Set(ids).size).toBe(36);
  });

  it("group names are A..L", () => {
    const squadre = Array.from({ length: 36 }, (_, i) => mkTeam(String(i)));
    const { gironi } = distribuisciGironi1(squadre);
    expect(gironi.map((g) => g.nome)).toEqual([
      "A","B","C","D","E","F","G","H","I","J","K","L",
    ]);
  });

  it("throws on more than 36 teams", () => {
    const squadre = Array.from({ length: 37 }, (_, i) => mkTeam(String(i)));
    expect(() => distribuisciGironi1(squadre)).toThrow(/massimo 36/i);
  });

  it("throws on fewer than 2 teams", () => {
    expect(() => distribuisciGironi1([mkTeam("a")])).toThrow(/almeno 2/i);
  });
});
```

- [ ] **Step 2: Run i test — devono fallire**

Run: `npx vitest run src/lib/gironi.test.ts`
Expected: FAIL — `distribuisciGironi1(...)` ritorna ancora un array, quindi `const { gironi } = ...` produce `gironi === undefined` e gli `expect` su `gironi` falliscono.

- [ ] **Step 3: Implementa il pot-system in `gironi.ts`**

In `src/lib/gironi.ts`, sostituisci l'intera funzione `distribuisciGironi1` (righe 42-72) con il codice seguente. Lascia invariati `shuffle`, `nomeGirone`, le costanti `NUM_GIRONI_FASE_1 / SIZE_GIRONE / CAPACITA_TOTALE` e tutto il resto del file.

```ts
export type Gironi1Result = {
  gironi: GroupDraft[];
  warnings: string[];
};

function buildGironi1Warnings(
  n1: number,
  n2: number,
  n3: number,
  nExtra: number
): string[] {
  const warnings: string[] = [];
  [n1, n2, n3].forEach((count, i) => {
    if (count !== NUM_GIRONI_FASE_1) {
      warnings.push(
        `Fascia ${i + 1}: ${count} squadre (attese ${NUM_GIRONI_FASE_1})`
      );
    }
  });
  if (nExtra > 0) {
    warnings.push(
      `${nExtra} squadre senza testa di serie valida distribuite casualmente`
    );
  }
  return warnings;
}

export function distribuisciGironi1(squadre: Team[]): Gironi1Result {
  if (squadre.length < 2) {
    throw new Error("Servono almeno 2 squadre");
  }
  if (squadre.length > CAPACITA_TOTALE) {
    throw new Error(`Massimo ${CAPACITA_TOTALE} squadre supportate in fase 1`);
  }

  // Pot per fascia (Team.livello). 0 o >3 finiscono nel pool extra.
  const pot1 = shuffle(squadre.filter((t) => t.livello === 1));
  const pot2 = shuffle(squadre.filter((t) => t.livello === 2));
  const pot3 = shuffle(squadre.filter((t) => t.livello === 3));
  const extra = shuffle(squadre.filter((t) => t.livello < 1 || t.livello > 3));

  // slots[girone][posizione]
  const slots: (Team | null)[][] = Array.from(
    { length: NUM_GIRONI_FASE_1 },
    () => new Array<Team | null>(SIZE_GIRONE).fill(null)
  );

  // Una squadra per fascia per girone (i primi 12 di ciascun pot).
  // L'eccedenza oltre 12 confluisce nel pool di riempimento.
  const fillPool: Team[] = [];
  [pot1, pot2, pot3].forEach((pot, fasciaIdx) => {
    pot.forEach((team, i) => {
      if (i < NUM_GIRONI_FASE_1) {
        slots[i][fasciaIdx] = team;
      } else {
        fillPool.push(team);
      }
    });
  });
  fillPool.push(...extra);
  const shuffledPool = shuffle(fillPool);

  // Riempi gli slot rimasti vuoti, girone per girone.
  let poolIdx = 0;
  for (let g = 0; g < NUM_GIRONI_FASE_1; g++) {
    for (let s = 0; s < SIZE_GIRONE; s++) {
      if (slots[g][s] === null && poolIdx < shuffledPool.length) {
        slots[g][s] = shuffledPool[poolIdx++];
      }
    }
  }

  const gironi: GroupDraft[] = [];
  for (let g = 0; g < NUM_GIRONI_FASE_1; g++) {
    const teamSlots = slots[g].map((team) => ({
      teamId: team?.id ?? null,
      seed:
        team && team.livello >= 1 && team.livello <= 3 ? team.livello : null,
    }));
    gironi.push({
      nome: nomeGirone(g),
      posizione: g,
      fase: 1,
      bracketTipo: null,
      teams: teamSlots,
    });
  }

  const warnings = buildGironi1Warnings(
    pot1.length,
    pot2.length,
    pot3.length,
    extra.length
  );
  return { gironi, warnings };
}
```

- [ ] **Step 4: Run i test — devono passare**

Run: `npx vitest run src/lib/gironi.test.ts`
Expected: PASS (tutti i `describe`, inclusi `generaMatchGironi1`, `assegnaCategorie`, `distribuisciGironi2` che non cambiano).

- [ ] **Step 5: Commit**

```bash
git add src/lib/gironi.ts src/lib/gironi.test.ts
git commit -m "feat(gironi): pot-system per teste di serie in distribuisciGironi1"
```

---

### Task 2: Test del seeding per fasce

**Files:**
- Test: `src/lib/gironi.test.ts` (aggiungi un nuovo blocco `describe`)

- [ ] **Step 1: Scrivi i nuovi test**

In `src/lib/gironi.test.ts`, aggiungi questo blocco subito dopo la chiusura del `describe("distribuisciGironi1", ...)` (prima di `import { generaMatchGironi1 } ...`):

```ts
describe("distribuisciGironi1 — teste di serie per fasce", () => {
  function balancedTeams(): Team[] {
    const teams: Team[] = [];
    for (let f = 1; f <= 3; f++) {
      for (let i = 0; i < 12; i++) teams.push(mkTeam(`f${f}-${i}`, f));
    }
    return teams; // 36 squadre, 12 per fascia
  }

  it("36 bilanciato: ogni girone ha una squadra per fascia {1,2,3}, nessun warning", () => {
    const { gironi, warnings } = distribuisciGironi1(balancedTeams());
    expect(warnings).toEqual([]);
    for (const g of gironi) {
      const seeds = g.teams.map((t) => t.seed).sort();
      expect(seeds).toEqual([1, 2, 3]);
    }
  });

  it("propaga il seed dalla fascia (Team.livello)", () => {
    const { gironi } = distribuisciGironi1(balancedTeams());
    const allSlots = gironi.flatMap((g) => g.teams);
    expect(allSlots.filter((s) => s.seed === 1)).toHaveLength(12);
    expect(allSlots.filter((s) => s.seed === 2)).toHaveLength(12);
    expect(allSlots.filter((s) => s.seed === 3)).toHaveLength(12);
  });

  it("sbilanciato (12/9/12): best-effort + warning sulla fascia 2", () => {
    const teams: Team[] = [];
    for (let i = 0; i < 12; i++) teams.push(mkTeam(`a${i}`, 1));
    for (let i = 0; i < 9; i++) teams.push(mkTeam(`b${i}`, 2));
    for (let i = 0; i < 12; i++) teams.push(mkTeam(`c${i}`, 3));
    const { gironi, warnings } = distribuisciGironi1(teams);
    expect(gironi).toHaveLength(12);
    expect(warnings).toContain("Fascia 2: 9 squadre (attese 12)");
    // 33 squadre piazzate, 3 slot null
    const ids = gironi
      .flatMap((g) => g.teams.map((t) => t.teamId))
      .filter((x): x is string => x !== null);
    expect(new Set(ids).size).toBe(33);
  });

  it("squadre con tds=0: finiscono nel pool extra con seed null + warning", () => {
    const teams: Team[] = [];
    for (let i = 0; i < 12; i++) teams.push(mkTeam(`a${i}`, 1));
    for (let i = 0; i < 12; i++) teams.push(mkTeam(`b${i}`, 2));
    for (let i = 0; i < 8; i++) teams.push(mkTeam(`c${i}`, 3));
    for (let i = 0; i < 4; i++) teams.push(mkTeam(`z${i}`, 0)); // non tds
    const { gironi, warnings } = distribuisciGironi1(teams);
    expect(warnings).toContain(
      "4 squadre senza testa di serie valida distribuite casualmente"
    );
    const allSlots = gironi.flatMap((g) => g.teams);
    // le 4 squadre tds=0 hanno seed null
    const placedZeroSeed = allSlots.filter(
      (s) => s.teamId?.startsWith("z") && s.seed === null
    );
    expect(placedZeroSeed).toHaveLength(4);
  });

  it("overflow (15 in fascia 1): primi 12 per fascia, 3 nel pool, warning", () => {
    const teams: Team[] = [];
    for (let i = 0; i < 15; i++) teams.push(mkTeam(`a${i}`, 1));
    for (let i = 0; i < 12; i++) teams.push(mkTeam(`b${i}`, 2));
    for (let i = 0; i < 9; i++) teams.push(mkTeam(`c${i}`, 3));
    const { gironi, warnings } = distribuisciGironi1(teams);
    expect(warnings).toContain("Fascia 1: 15 squadre (attese 12)");
    expect(gironi).toHaveLength(12);
    // tutte le 36 squadre piazzate
    const ids = gironi
      .flatMap((g) => g.teams.map((t) => t.teamId))
      .filter((x): x is string => x !== null);
    expect(new Set(ids).size).toBe(36);
    // ci sono 15 slot con seed 1 (12 piazzati per fascia + 3 overflow dal pool)
    const allSlots = gironi.flatMap((g) => g.teams);
    expect(allSlots.filter((s) => s.seed === 1)).toHaveLength(15);
  });
});
```

- [ ] **Step 2: Run i test — devono passare**

Run: `npx vitest run src/lib/gironi.test.ts`
Expected: PASS. (L'implementazione del Task 1 soddisfa già questi contratti.)

> Nota: il test overflow verifica 15 slot con `seed === 1` perché il seed deriva da `Team.livello`, non dalla posizione: le 3 squadre fascia-1 in eccedenza finiscono nel pool ma conservano `seed = 1`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/gironi.test.ts
git commit -m "test(gironi): copertura seeding per fasce 1/2/3"
```

---

### Task 3: API route — usa il nuovo ritorno, salva seed, restituisci warnings

**Files:**
- Modify: `src/app/api/tornei/[id]/sorteggio/route.ts:48` e `:112-121`

- [ ] **Step 1: Consuma `{ gironi, warnings }`**

In `src/app/api/tornei/[id]/sorteggio/route.ts`, sostituisci la riga 48:

```ts
  const gironi = distribuisciGironi1(squadre);
```

con:

```ts
  const { gironi, warnings } = distribuisciGironi1(squadre);
```

(La riga 49 `const matchDrafts = generaMatchGironi1(gironi);` resta invariata. Il `create` dei `groupTeams` salva già `seed: t.seed` alla riga 72 — ora `t.seed` arriva valorizzato, nessuna modifica lì.)

- [ ] **Step 2: Restituisci i warnings nella risposta**

Sempre nello stesso file, sostituisci il blocco return finale del try (righe 120-121):

```ts
    return NextResponse.json(result);
```

con:

```ts
    return NextResponse.json({ ...result, warnings });
```

- [ ] **Step 3: Verifica build/typecheck**

Run: `npm run lint`
Expected: nessun errore su `route.ts`. (`result` è il `Tournament` aggiornato; lo spread aggiunge il campo `warnings` al JSON.)

- [ ] **Step 4: Commit**

```bash
git add src/app/api/tornei/[id]/sorteggio/route.ts
git commit -m "feat(api): sorteggio salva seed di fascia e restituisce warnings"
```

---

### Task 4: UI torneo — mostra i warnings

**Files:**
- Modify: `src/app/admin/torneo/page.tsx:155-161`

- [ ] **Step 1: Leggi e mostra i warnings dopo il sorteggio**

In `src/app/admin/torneo/page.tsx`, sostituisci il blocco (righe 155-161):

```ts
      const res = await fetch(`/api/tornei/${t.id}/sorteggio`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Errore sorteggio");
      }
      toast.success("Sorteggio fase 1 completato");
      await loadAll();
```

con:

```ts
      const res = await fetch(`/api/tornei/${t.id}/sorteggio`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Errore sorteggio");
      }
      const data = await res.json().catch(() => ({}));
      toast.success("Sorteggio fase 1 completato");
      const warnings: string[] = Array.isArray(data?.warnings)
        ? data.warnings
        : [];
      for (const w of warnings) {
        toast.warning(w);
      }
      await loadAll();
```

- [ ] **Step 2: Verifica lint**

Run: `npm run lint`
Expected: nessun errore. (`toast.warning` è supportato da sonner, già usato nel file.)

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/torneo/page.tsx
git commit -m "feat(admin): mostra warnings sbilanciamento fasce dopo sorteggio"
```

---

### Task 5: Form squadre — limita tds a 0-3

**Files:**
- Modify: `src/app/admin/squadre/page.tsx:311` e `:554-561`

- [ ] **Step 1: Clamp del valore tds in submit**

In `src/app/admin/squadre/page.tsx`, sostituisci la riga 311:

```ts
          livello: parseInt(form.livello, 10) || 0,
```

con:

```ts
          livello: Math.min(3, Math.max(0, parseInt(form.livello, 10) || 0)),
```

- [ ] **Step 2: Aggiungi `max={3}` all'input**

Sempre nello stesso file, nell'`<Input id="livello" ...>` (riga 556), aggiungi `max={3}` accanto a `min={0}`:

```tsx
              <Input
                id="livello"
                type="number"
                min={0}
                max={3}
                value={form.livello}
                onChange={(e) => setForm({ ...form, livello: e.target.value })}
                className="bg-cream/5 border-cream/15 text-cream"
              />
```

- [ ] **Step 3: Verifica lint**

Run: `npm run lint`
Expected: nessun errore.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/squadre/page.tsx
git commit -m "feat(admin): limita testa di serie a 0-3 nel form squadre"
```

---

### Task 6: Verifica finale

- [ ] **Step 1: Test suite completa**

Run: `npx vitest run`
Expected: PASS (tutti i file).

- [ ] **Step 2: Lint completo**

Run: `npm run lint`
Expected: nessun errore.

- [ ] **Step 3 (opzionale): smoke manuale**

Avvia `npm run dev`, assegna tds 1/2/3 ad alcune squadre, esegui il sorteggio dalla pagina torneo, verifica i badge `[1]/[2]/[3]` nei gironi e gli eventuali toast di warning.

---

## Note implementative

- Nessuna migrazione Prisma: si riusano `Team.livello` (fascia) e `GroupTeam.seed`.
- `GIRONI_2` / `FINALI` fuori ambito: invariati.
- `GironiView`, `GironiAnimation`, `MatchLiveClient` leggono già `seed` → si attivano da soli.
- Il seed riflette la fascia (`Team.livello`), non la posizione nel girone: una squadra in eccedenza mantiene il suo seed anche se piazzata via pool.
