# Tournament Restructure: 12 Gironi + Fase 2 + Semifinali Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild tournament flow into four phases — 12 gironi-1 of 3 teams → categorize 1°/2°/3° into Gold/Silver/Bronze → 4 gironi-2 per category → semifinals + final + 3°/4° per category.

**Architecture:** Extend `Tournament.fase` to `BOZZA → GIRONI_1 → GIRONI_2 → FINALI → COMPLETATO`. Extend `Group` with `fase: Int` and `bracketTipo: String?` to disambiguate phase-1 groups from phase-2 Gold/Silver/Bronze groups. Re-use existing `Match.bracketTipo` and `groupId` columns: phase-1 matches have `groupId` set, `bracketTipo = null`, `round = 0`; phase-2 matches have `groupId` set, `bracketTipo` set, `round = 0`; semifinals have `bracketTipo` set, `round = 2`, `posizione ∈ {0,1}`; finals have `round = 1`, `posizione = 0` (winners' final) or `posizione = 1` (3°/4° playoff). Walkovers (null team slot) auto-complete with 6-0/6-0 to other team.

**Tech Stack:** Next.js 16 App Router, Prisma 5 + Postgres, Supabase Realtime broadcast, React 19, TypeScript strict, vitest (new — added in Phase 0).

---

## Conventions used in this plan

- All file paths are absolute from repo root.
- Italian terms preserved (`gironi`, `partite`, `squadre`, `genere`) — match existing schema.
- `tsx` runs TypeScript scripts. `vitest` runs unit tests (added in Phase 0).
- Smoke-test endpoints use `curl` against `http://localhost:3000` with admin cookie. To get cookie: log in via `/admin/login` in browser, copy `next-auth.session-token` cookie value, export as `$COOKIE` env var.
- `git` commits use Conventional Commits (`feat:`, `refactor:`, `test:`, `chore:`).

---

## Phase 0 — Setup

### Task 0.1: Install vitest + tsx test runner

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install dev deps**

Run: `npm install -D vitest @vitest/coverage-v8`
Expected: deps added under `devDependencies`.

- [ ] **Step 2: Create vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: false,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

- [ ] **Step 3: Add scripts**

Edit `package.json` `scripts` block, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verify**

Run: `npm test -- --reporter=verbose`
Expected: exits 0, "No test files found" message OK.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest for unit tests on tournament logic"
```

---

### Task 0.2: Drop existing tournaments / migrations baseline

**Files:**
- Modify: `prisma/migrations/` (delete obsolete migrations)

User confirmed: start from scratch, drop existing data.

- [ ] **Step 1: Stop dev server if running**

Run: `pkill -f "next dev" || true`

- [ ] **Step 2: Reset local DB**

Run: `npm run db:reset -- --skip-seed`
Expected: prompts confirmation OR uses `--force` from existing script. Verify schema dropped & re-created.

If `db:reset` fails or refuses, run manually:

```bash
docker compose exec -T postgres psql -U postgres -d chanteclair -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
rm -rf prisma/migrations
```

- [ ] **Step 3: Commit migration deletion**

```bash
git rm -r prisma/migrations
git commit -m "chore: drop old migrations, rebuild schema for new tournament flow"
```

---

## Phase 1 — Schema changes

### Task 1.1: Update `Tournament.fase` and `Group` model

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Edit schema**

In `prisma/schema.prisma`:

Change `Tournament.fase` comment (keep type `String` since Prisma value is string; document allowed values):

```prisma
model Tournament {
  id        String   @id @default(cuid())
  nome      String
  genere    String
  stato     String   @default("BOZZA")
  // fase values: BOZZA | GIRONI_1 | GIRONI_2 | FINALI | COMPLETATO
  fase      String   @default("BOZZA")
  anno      Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  matches Match[]
  groups  Group[]

  @@index([genere, stato])
}
```

Add fields to `Group`:

```prisma
model Group {
  id           String     @id @default(cuid())
  tournamentId String
  tournament   Tournament @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  nome         String
  posizione    Int
  // fase: 1 = primo girone (sorteggio iniziale), 2 = secondo girone per categoria
  fase         Int        @default(1)
  // bracketTipo: null per fase 1; GOLD/SILVER/BRONZE per fase 2
  bracketTipo  String?
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  groupTeams GroupTeam[]
  matches    Match[]

  @@index([tournamentId])
  @@index([tournamentId, fase, bracketTipo])
}
```

- [ ] **Step 2: Create migration**

Run: `npx prisma migrate dev --name init_torneo_fasi`
Expected: migration applied, Prisma client regenerated.

- [ ] **Step 3: Verify schema**

Run: `npx prisma db pull --print | head -40`
Expected: shows `Group.fase`, `Group.bracketTipo`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(schema): add Group.fase and Group.bracketTipo for new tournament flow"
```

---

### Task 1.2: Update TypeScript types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Update `FaseTorneo` type**

Edit `src/types/index.ts` line containing `export type FaseTorneo`:

```ts
export type FaseTorneo = "BOZZA" | "GIRONI_1" | "GIRONI_2" | "FINALI" | "COMPLETATO";
```

- [ ] **Step 2: Update `GroupWithTeams` interface**

Find `export interface GroupWithTeams` and replace with:

```ts
export interface GroupWithTeams {
  id: string;
  tournamentId: string;
  nome: string;
  posizione: number;
  fase: number;
  bracketTipo: BracketTipo | null;
  groupTeams: GroupTeamWithStats[];
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: errors only in files that consume `FaseTorneo` with old values (e.g. `TabelloneClient.tsx`). Note these — they're fixed in Phase 8.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): extend FaseTorneo and GroupWithTeams for new flow"
```

---

## Phase 2 — Library: gironi fase 1 (12 gironi × 3 squadre, padding with null)

### Task 2.1: New `distribuisciGironi1` function

**Files:**
- Modify: `src/lib/gironi.ts`
- Test: `src/lib/gironi.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/lib/gironi.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { distribuisciGironi1 } from "./gironi";
import type { Team } from "@prisma/client";

function mkTeam(id: string, livello = 0): Team {
  return {
    id,
    nome: `Squadra ${id}`,
    genere: "MASCHILE",
    livello,
    player1Id: `p1-${id}`,
    player2Id: `p2-${id}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("distribuisciGironi1", () => {
  it("creates exactly 12 groups", () => {
    const squadre = Array.from({ length: 36 }, (_, i) => mkTeam(String(i)));
    const gironi = distribuisciGironi1(squadre);
    expect(gironi).toHaveLength(12);
  });

  it("each group has 3 slots", () => {
    const squadre = Array.from({ length: 36 }, (_, i) => mkTeam(String(i)));
    const gironi = distribuisciGironi1(squadre);
    for (const g of gironi) {
      expect(g.teams).toHaveLength(3);
    }
  });

  it("with fewer than 36 teams, missing slots are filled with null teamId", () => {
    const squadre = Array.from({ length: 30 }, (_, i) => mkTeam(String(i)));
    const gironi = distribuisciGironi1(squadre);
    expect(gironi).toHaveLength(12);
    const allSlots = gironi.flatMap((g) => g.teams);
    expect(allSlots.filter((s) => s.teamId === null)).toHaveLength(6);
    expect(allSlots.filter((s) => s.teamId !== null)).toHaveLength(30);
  });

  it("each real team appears exactly once", () => {
    const squadre = Array.from({ length: 36 }, (_, i) => mkTeam(`t${i}`));
    const gironi = distribuisciGironi1(squadre);
    const ids = gironi
      .flatMap((g) => g.teams.map((t) => t.teamId))
      .filter((x): x is string => x !== null);
    expect(new Set(ids).size).toBe(36);
  });

  it("group names are A..L", () => {
    const squadre = Array.from({ length: 36 }, (_, i) => mkTeam(String(i)));
    const gironi = distribuisciGironi1(squadre);
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

- [ ] **Step 2: Run test (expect failure)**

Run: `npm test -- gironi.test`
Expected: FAIL — `distribuisciGironi1` not exported.

- [ ] **Step 3: Update GroupDraft type and add function**

Edit `src/lib/gironi.ts`. Change `GroupDraft.teams` shape to allow `teamId: string | null`:

```ts
export type GroupDraft = {
  nome: string;
  posizione: number;
  fase: number;
  bracketTipo: "GOLD" | "SILVER" | "BRONZE" | null;
  teams: { teamId: string | null; seed: number | null }[];
};
```

Add new function (keep existing `shuffle`, `nomeGirone`, etc. — they're reused):

```ts
const NUM_GIRONI_FASE_1 = 12;
const SIZE_GIRONE = 3;
const CAPACITA_TOTALE = NUM_GIRONI_FASE_1 * SIZE_GIRONE; // 36

export function distribuisciGironi1(squadre: Team[]): GroupDraft[] {
  if (squadre.length < 2) {
    throw new Error("Servono almeno 2 squadre");
  }
  if (squadre.length > CAPACITA_TOTALE) {
    throw new Error(`Massimo ${CAPACITA_TOTALE} squadre supportate in fase 1`);
  }

  const mescolate = shuffle(squadre);
  const slots: (Team | null)[] = new Array(CAPACITA_TOTALE).fill(null);
  mescolate.forEach((t, i) => {
    slots[i] = t;
  });

  const gironi: GroupDraft[] = [];
  for (let g = 0; g < NUM_GIRONI_FASE_1; g++) {
    const teamSlots: { teamId: string | null; seed: number | null }[] = [];
    for (let s = 0; s < SIZE_GIRONE; s++) {
      const team = slots[g * SIZE_GIRONE + s];
      teamSlots.push({ teamId: team?.id ?? null, seed: null });
    }
    gironi.push({
      nome: nomeGirone(g),
      posizione: g,
      fase: 1,
      bracketTipo: null,
      teams: teamSlots,
    });
  }
  return gironi;
}
```

- [ ] **Step 4: Run test (expect pass)**

Run: `npm test -- gironi.test`
Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/gironi.ts src/lib/gironi.test.ts
git commit -m "feat(gironi): add distribuisciGironi1 — 12 random groups with null padding"
```

---

### Task 2.2: Match generation with auto-walkover for null slots

**Files:**
- Modify: `src/lib/gironi.ts`
- Modify: `src/lib/gironi.test.ts`

- [ ] **Step 1: Write failing test**

Append to `src/lib/gironi.test.ts`:

```ts
import { generaMatchGironi1 } from "./gironi";

describe("generaMatchGironi1", () => {
  it("girone of 3 real teams produces 3 matches, all ATTESA", () => {
    const gironi = [
      {
        nome: "A",
        posizione: 0,
        fase: 1,
        bracketTipo: null,
        teams: [
          { teamId: "t1", seed: null },
          { teamId: "t2", seed: null },
          { teamId: "t3", seed: null },
        ],
      },
    ];
    const matches = generaMatchGironi1(gironi);
    expect(matches).toHaveLength(3);
    expect(matches.every((m) => m.walkover === false)).toBe(true);
    expect(matches.every((m) => m.team1Id !== null && m.team2Id !== null)).toBe(true);
  });

  it("girone with 1 null slot produces 3 matches, 2 walkover", () => {
    const gironi = [
      {
        nome: "A",
        posizione: 0,
        fase: 1,
        bracketTipo: null,
        teams: [
          { teamId: "t1", seed: null },
          { teamId: "t2", seed: null },
          { teamId: null, seed: null },
        ],
      },
    ];
    const matches = generaMatchGironi1(gironi);
    expect(matches).toHaveLength(3);
    const walkovers = matches.filter((m) => m.walkover);
    expect(walkovers).toHaveLength(2);
    for (const w of walkovers) {
      expect(w.winnerTeamId).not.toBeNull();
      expect(w.set1Team1).toBeDefined();
      expect(w.set1Team2).toBeDefined();
    }
  });

  it("girone with 2 null slots: real team gets 2 walkover wins, null-vs-null skipped", () => {
    const gironi = [
      {
        nome: "A",
        posizione: 0,
        fase: 1,
        bracketTipo: null,
        teams: [
          { teamId: "t1", seed: null },
          { teamId: null, seed: null },
          { teamId: null, seed: null },
        ],
      },
    ];
    const matches = generaMatchGironi1(gironi);
    const walkovers = matches.filter((m) => m.walkover);
    expect(walkovers.length).toBeGreaterThanOrEqual(2);
    const nullVsNull = matches.filter(
      (m) => m.team1Id === null && m.team2Id === null
    );
    expect(nullVsNull).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test (expect fail)**

Run: `npm test -- gironi.test`
Expected: FAIL — `generaMatchGironi1` not exported.

- [ ] **Step 3: Implement**

Add to `src/lib/gironi.ts`:

```ts
export type GroupMatchDraft = {
  groupPosizione: number;
  posizione: number;
  team1Id: string | null;
  team2Id: string | null;
  walkover: boolean;
  winnerTeamId: string | null;
  set1Team1: number | null;
  set1Team2: number | null;
};

export function generaMatchGironi1(gironi: GroupDraft[]): GroupMatchDraft[] {
  const matches: GroupMatchDraft[] = [];
  for (const g of gironi) {
    let pos = 0;
    for (let i = 0; i < g.teams.length; i++) {
      for (let j = i + 1; j < g.teams.length; j++) {
        const t1 = g.teams[i].teamId;
        const t2 = g.teams[j].teamId;
        if (t1 === null && t2 === null) continue; // skip ghost vs ghost

        let winner: string | null = null;
        let s1: number | null = null;
        let s2: number | null = null;
        let walkover = false;
        if (t1 !== null && t2 === null) {
          walkover = true;
          winner = t1;
          s1 = 6;
          s2 = 0;
        } else if (t2 !== null && t1 === null) {
          walkover = true;
          winner = t2;
          s1 = 0;
          s2 = 6;
        }

        matches.push({
          groupPosizione: g.posizione,
          posizione: pos++,
          team1Id: t1,
          team2Id: t2,
          walkover,
          winnerTeamId: winner,
          set1Team1: s1,
          set1Team2: s2,
        });
      }
    }
  }
  return matches;
}
```

- [ ] **Step 4: Verify pass**

Run: `npm test -- gironi.test`
Expected: all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/gironi.ts src/lib/gironi.test.ts
git commit -m "feat(gironi): generaMatchGironi1 with auto-walkover for null slots"
```

---

## Phase 3 — Library: categoria assignment + gironi fase 2

### Task 3.1: `assegnaCategorie` — split phase-1 standings into Gold/Silver/Bronze

**Files:**
- Modify: `src/lib/gironi.ts`
- Modify: `src/lib/gironi.test.ts`

- [ ] **Step 1: Write failing test**

Append to `src/lib/gironi.test.ts`:

```ts
import { assegnaCategorie } from "./gironi";

describe("assegnaCategorie", () => {
  it("groups by posizioneFinale into GOLD/SILVER/BRONZE", () => {
    const standings = [
      { groupPosizione: 0, teamId: "tA1", posizioneFinale: 1 },
      { groupPosizione: 0, teamId: "tA2", posizioneFinale: 2 },
      { groupPosizione: 0, teamId: "tA3", posizioneFinale: 3 },
      { groupPosizione: 1, teamId: "tB1", posizioneFinale: 1 },
      { groupPosizione: 1, teamId: "tB2", posizioneFinale: 2 },
      { groupPosizione: 1, teamId: "tB3", posizioneFinale: 3 },
    ];
    const result = assegnaCategorie(standings);
    expect(result.GOLD).toEqual(["tA1", "tB1"]);
    expect(result.SILVER).toEqual(["tA2", "tB2"]);
    expect(result.BRONZE).toEqual(["tA3", "tB3"]);
  });

  it("ignores standings beyond position 3", () => {
    const standings = [
      { groupPosizione: 0, teamId: "t1", posizioneFinale: 1 },
      { groupPosizione: 0, teamId: "t4", posizioneFinale: 4 },
    ];
    const result = assegnaCategorie(standings);
    expect(result.GOLD).toEqual(["t1"]);
    expect(result.SILVER).toEqual([]);
    expect(result.BRONZE).toEqual([]);
  });
});
```

- [ ] **Step 2: Run (expect fail)**

Run: `npm test -- gironi.test`
Expected: FAIL — not exported.

- [ ] **Step 3: Implement**

Add to `src/lib/gironi.ts`:

```ts
export type StandingForCategory = {
  groupPosizione: number;
  teamId: string;
  posizioneFinale: number;
};

export type CategorieAssignment = {
  GOLD: string[];
  SILVER: string[];
  BRONZE: string[];
};

export function assegnaCategorie(
  standings: StandingForCategory[]
): CategorieAssignment {
  const sorted = [...standings].sort(
    (a, b) => a.groupPosizione - b.groupPosizione
  );
  const result: CategorieAssignment = { GOLD: [], SILVER: [], BRONZE: [] };
  for (const s of sorted) {
    if (s.posizioneFinale === 1) result.GOLD.push(s.teamId);
    else if (s.posizioneFinale === 2) result.SILVER.push(s.teamId);
    else if (s.posizioneFinale === 3) result.BRONZE.push(s.teamId);
  }
  return result;
}
```

- [ ] **Step 4: Pass**

Run: `npm test -- gironi.test`
Expected: green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/gironi.ts src/lib/gironi.test.ts
git commit -m "feat(gironi): assegnaCategorie splits standings into Gold/Silver/Bronze"
```

---

### Task 3.2: `distribuisciGironi2` — 4 random groups per category

**Files:**
- Modify: `src/lib/gironi.ts`
- Modify: `src/lib/gironi.test.ts`

- [ ] **Step 1: Write failing test**

Append to `src/lib/gironi.test.ts`:

```ts
import { distribuisciGironi2, generaMatchGironi1 as _g } from "./gironi";

describe("distribuisciGironi2", () => {
  it("creates 4 groups of 3 for full category (12 teams)", () => {
    const teams = Array.from({ length: 12 }, (_, i) => mkTeam(`g${i}`));
    const gironi = distribuisciGironi2(teams, "GOLD", 0);
    expect(gironi).toHaveLength(4);
    for (const g of gironi) {
      expect(g.teams).toHaveLength(3);
      expect(g.bracketTipo).toBe("GOLD");
      expect(g.fase).toBe(2);
    }
  });

  it("group names start at posizione offset", () => {
    const teams = Array.from({ length: 12 }, (_, i) => mkTeam(`g${i}`));
    const gironi = distribuisciGironi2(teams, "SILVER", 4);
    expect(gironi.map((g) => g.posizione)).toEqual([4, 5, 6, 7]);
  });

  it("with fewer than 12 teams, pads with null slots", () => {
    const teams = Array.from({ length: 9 }, (_, i) => mkTeam(`g${i}`));
    const gironi = distribuisciGironi2(teams, "GOLD", 0);
    expect(gironi).toHaveLength(4);
    const allSlots = gironi.flatMap((g) => g.teams);
    expect(allSlots.filter((s) => s.teamId === null)).toHaveLength(3);
  });

  it("each real team appears once", () => {
    const teams = Array.from({ length: 12 }, (_, i) => mkTeam(`g${i}`));
    const gironi = distribuisciGironi2(teams, "BRONZE", 8);
    const ids = gironi
      .flatMap((g) => g.teams.map((t) => t.teamId))
      .filter((x): x is string => x !== null);
    expect(new Set(ids).size).toBe(12);
  });
});
```

- [ ] **Step 2: Run (fail expected)**

Run: `npm test -- gironi.test`

- [ ] **Step 3: Implement**

Add to `src/lib/gironi.ts`:

```ts
const NUM_GIRONI_FASE_2_PER_CATEGORIA = 4;
const SIZE_GIRONE_FASE_2 = 3;
const CAPACITA_FASE_2 = NUM_GIRONI_FASE_2_PER_CATEGORIA * SIZE_GIRONE_FASE_2; // 12

export function distribuisciGironi2(
  squadre: Team[],
  bracketTipo: "GOLD" | "SILVER" | "BRONZE",
  posizioneOffset: number
): GroupDraft[] {
  if (squadre.length > CAPACITA_FASE_2) {
    throw new Error(`Massimo ${CAPACITA_FASE_2} squadre per categoria fase 2`);
  }

  const mescolate = shuffle(squadre);
  const slots: (Team | null)[] = new Array(CAPACITA_FASE_2).fill(null);
  mescolate.forEach((t, i) => {
    slots[i] = t;
  });

  const gironi: GroupDraft[] = [];
  for (let g = 0; g < NUM_GIRONI_FASE_2_PER_CATEGORIA; g++) {
    const teamSlots: { teamId: string | null; seed: number | null }[] = [];
    for (let s = 0; s < SIZE_GIRONE_FASE_2; s++) {
      const team = slots[g * SIZE_GIRONE_FASE_2 + s];
      teamSlots.push({ teamId: team?.id ?? null, seed: null });
    }
    gironi.push({
      nome: `${bracketTipo[0]}${g + 1}`, // G1, G2, G3, G4 (or S1..S4 / B1..B4)
      posizione: posizioneOffset + g,
      fase: 2,
      bracketTipo,
      teams: teamSlots,
    });
  }
  return gironi;
}
```

- [ ] **Step 4: Pass**

Run: `npm test -- gironi.test`
Expected: green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/gironi.ts src/lib/gironi.test.ts
git commit -m "feat(gironi): distribuisciGironi2 — 4 random groups per Gold/Silver/Bronze category"
```

---

## Phase 4 — Library: semifinals + finals + 3°/4°

### Task 4.1: `generaFinali` — 2 semi + finale + 3°/4° playoff

**Files:**
- Modify: `src/lib/bracket.ts`
- Create: `src/lib/bracket.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/lib/bracket.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { generaFinali } from "./bracket";

describe("generaFinali", () => {
  it("produces exactly 4 match drafts: 2 semi + final + 3rd-place playoff", () => {
    const teamIds = ["t1", "t2", "t3", "t4"];
    const drafts = generaFinali(teamIds, "torneo-x", "GOLD");
    expect(drafts).toHaveLength(4);
    const semi = drafts.filter((d) => d.round === 2);
    const finals = drafts.filter((d) => d.round === 1);
    expect(semi).toHaveLength(2);
    expect(finals).toHaveLength(2);
  });

  it("semis have both team slots populated, finals have nulls", () => {
    const drafts = generaFinali(["a","b","c","d"], "t", "SILVER");
    const semis = drafts.filter((d) => d.round === 2);
    expect(semis.every((d) => d.team1Id !== null && d.team2Id !== null)).toBe(true);
    const finals = drafts.filter((d) => d.round === 1);
    expect(finals.every((d) => d.team1Id === null && d.team2Id === null)).toBe(true);
  });

  it("final at posizione 0, 3rd-place at posizione 1", () => {
    const drafts = generaFinali(["a","b","c","d"], "t", "BRONZE");
    const finale = drafts.find((d) => d.round === 1 && d.posizione === 0);
    const terzo = drafts.find((d) => d.round === 1 && d.posizione === 1);
    expect(finale).toBeDefined();
    expect(terzo).toBeDefined();
  });

  it("all drafts carry the given bracketTipo and tournamentId", () => {
    const drafts = generaFinali(["a","b","c","d"], "torneo-id", "GOLD");
    expect(drafts.every((d) => d.bracketTipo === "GOLD")).toBe(true);
    expect(drafts.every((d) => d.tournamentId === "torneo-id")).toBe(true);
  });

  it("with fewer than 4 teams pads semis with nulls", () => {
    const drafts = generaFinali(["a","b"], "t", "GOLD");
    expect(drafts).toHaveLength(4);
    const semis = drafts.filter((d) => d.round === 2);
    const filledSlots = semis.flatMap((s) => [s.team1Id, s.team2Id]).filter((x) => x !== null);
    expect(filledSlots).toHaveLength(2);
  });

  it("throws if more than 4 teams", () => {
    expect(() => generaFinali(["a","b","c","d","e"], "t", "GOLD")).toThrow();
  });
});
```

- [ ] **Step 2: Run (fail)**

Run: `npm test -- bracket.test`
Expected: FAIL.

- [ ] **Step 3: Implement**

Edit `src/lib/bracket.ts`. Keep existing exports (`generaBracket` will be removed in Phase 11 cleanup; leave for now to not break references). Add at top:

```ts
export type FinalMatchDraft = {
  tournamentId: string;
  bracketTipo: "GOLD" | "SILVER" | "BRONZE";
  groupId: null;
  round: number;
  posizione: number;
  team1Id: string | null;
  team2Id: string | null;
  winnerId: null;
  punteggio: null;
  stato: "ATTESA";
  iniziataAt: null;
  finitaAt: null;
};

export function generaFinali(
  teamIds: string[],
  tournamentId: string,
  bracketTipo: "GOLD" | "SILVER" | "BRONZE"
): FinalMatchDraft[] {
  if (teamIds.length > 4) {
    throw new Error("Massimo 4 squadre per generare le finali");
  }

  const [t1 = null, t2 = null, t3 = null, t4 = null] = teamIds;

  const base = {
    tournamentId,
    bracketTipo,
    groupId: null as null,
    winnerId: null as null,
    punteggio: null as null,
    stato: "ATTESA" as const,
    iniziataAt: null as null,
    finitaAt: null as null,
  };

  return [
    // Semifinale 1: pos 0 — vincente promosso a finale (round 1 pos 0), perdente a 3°/4° (round 1 pos 1)
    { ...base, round: 2, posizione: 0, team1Id: t1, team2Id: t2 },
    // Semifinale 2: pos 1
    { ...base, round: 2, posizione: 1, team1Id: t3, team2Id: t4 },
    // Finale
    { ...base, round: 1, posizione: 0, team1Id: null, team2Id: null },
    // Playoff 3°/4°
    { ...base, round: 1, posizione: 1, team1Id: null, team2Id: null },
  ];
}
```

- [ ] **Step 4: Pass**

Run: `npm test -- bracket.test`
Expected: green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/bracket.ts src/lib/bracket.test.ts
git commit -m "feat(bracket): add generaFinali — 2 semi + final + 3rd-place playoff"
```

---

## Phase 5 — API: sorteggio fase 1

### Task 5.1: Rewrite `POST /api/tornei/[id]/sorteggio`

**Files:**
- Modify: `src/app/api/tornei/[id]/sorteggio/route.ts`

- [ ] **Step 1: Replace POST body**

Replace the existing `sorteggio/route.ts` body. Full file:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { distribuisciGironi1, generaMatchGironi1 } from "@/lib/gironi";
import { requireAdmin } from "@/lib/api-auth";

type RouteContext = { params: Promise<{ id: string }> };

const tournamentInclude = {
  matches: {
    include: {
      team1: { include: { player1: true, player2: true } },
      team2: { include: { player1: true, player2: true } },
      winner: { include: { player1: true, player2: true } },
    },
    orderBy: [{ round: "desc" }, { posizione: "asc" }],
  },
  groups: {
    include: {
      groupTeams: {
        include: { team: { include: { player1: true, player2: true } } },
      },
    },
    orderBy: { posizione: "asc" },
  },
} satisfies import("@prisma/client").Prisma.TournamentInclude;

export async function POST(_request: NextRequest, { params }: RouteContext) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const { id } = await params;

  const torneo = await prisma.tournament.findUnique({ where: { id } });
  if (!torneo) {
    return NextResponse.json({ error: "Torneo non trovato" }, { status: 404 });
  }

  const squadre = await prisma.team.findMany({
    where: { genere: torneo.genere },
  });

  if (squadre.length < 2) {
    return NextResponse.json(
      { error: "Servono almeno 2 squadre per il sorteggio" },
      { status: 400 }
    );
  }

  const gironi = distribuisciGironi1(squadre);
  const matchDrafts = generaMatchGironi1(gironi);

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // Hard reset existing rounds for this tournament
        await tx.match.deleteMany({ where: { tournamentId: torneo.id } });
        await tx.group.deleteMany({ where: { tournamentId: torneo.id } });

        const createdGroups = await Promise.all(
          gironi.map((g) =>
            tx.group.create({
              data: {
                tournamentId: torneo.id,
                nome: g.nome,
                posizione: g.posizione,
                fase: 1,
                bracketTipo: null,
                groupTeams: {
                  create: g.teams
                    .filter((t) => t.teamId !== null)
                    .map((t) => ({
                      teamId: t.teamId as string,
                      seed: t.seed,
                    })),
                },
              },
              select: { id: true, posizione: true },
            })
          )
        );
        const groupIdByPos = new Map<number, string>(
          createdGroups.map((g) => [g.posizione, g.id])
        );

        if (matchDrafts.length > 0) {
          await tx.match.createMany({
            data: matchDrafts.map((m) => ({
              tournamentId: torneo.id,
              groupId: groupIdByPos.get(m.groupPosizione)!,
              round: 0,
              posizione: m.posizione,
              team1Id: m.team1Id,
              team2Id: m.team2Id,
              winnerId: m.winnerTeamId,
              set1Team1: m.set1Team1,
              set1Team2: m.set1Team2,
              punteggio:
                m.set1Team1 !== null && m.set1Team2 !== null
                  ? `${m.set1Team1}-${m.set1Team2}`
                  : null,
              stato: m.walkover ? "COMPLETATA" : "ATTESA",
              finitaAt: m.walkover ? new Date() : null,
            })),
          });
        }

        // Recompute group stats for walkover-affected groups
        const groupIds = createdGroups.map((g) => g.id);
        for (const gid of groupIds) {
          await recomputeGroupStats(tx, gid);
        }

        return tx.tournament.update({
          where: { id: torneo.id },
          data: { fase: "GIRONI_1" },
          include: tournamentInclude,
        });
      },
      { maxWait: 15000, timeout: 60000 }
    );

    return NextResponse.json(result);
  } catch (err) {
    const e = err as Error & { code?: string; meta?: unknown };
    console.error("[sorteggio] error", {
      id,
      message: e.message,
      code: e.code,
      meta: e.meta,
    });
    return NextResponse.json(
      { error: e.message, code: e.code, meta: e.meta },
      { status: 500 }
    );
  }
}

async function recomputeGroupStats(
  tx: import("@prisma/client").Prisma.TransactionClient,
  groupId: string
) {
  const groupTeams = await tx.groupTeam.findMany({ where: { groupId } });
  const matches = await tx.match.findMany({
    where: { groupId, stato: "COMPLETATA" },
  });
  for (const gt of groupTeams) {
    let punti = 0, gv = 0, gp = 0, n = 0;
    for (const m of matches) {
      const isT1 = m.team1Id === gt.teamId;
      const isT2 = m.team2Id === gt.teamId;
      if (!isT1 && !isT2) continue;
      n++;
      const my = isT1 ? m.set1Team1 ?? 0 : m.set1Team2 ?? 0;
      const opp = isT1 ? m.set1Team2 ?? 0 : m.set1Team1 ?? 0;
      gv += my;
      gp += opp;
      if (m.winnerId === gt.teamId) punti += 2;
      else if (m.winnerId) punti += 1;
    }
    await tx.groupTeam.update({
      where: { id: gt.id },
      data: { punti, gameVinti: gv, gamePersi: gp, matchGiocate: n },
    });
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: pass (other consumers of `distribuisciGironi` may still error — those are addressed in subsequent tasks).

- [ ] **Step 3: Manual smoke test**

Start dev: `npm run dev` (background OK).

In another shell, seed 36 maschili + create torneo + sorteggio:

```bash
# Assumes admin logged in, $COOKIE export set with valid session.
# Pre-req: 36 squadre MASCHILE exist (handled by seed.ts update in Phase 12.3).

curl -s -X POST http://localhost:3000/api/tornei \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=$COOKIE" \
  -d '{"nome":"Test Fase1","generi":["MASCHILE"],"anno":2026}'

# Extract id from response, then:
TID="<id>"
curl -s -X POST http://localhost:3000/api/tornei/$TID/sorteggio \
  -H "Cookie: next-auth.session-token=$COOKIE" | jq '.fase, (.groups | length), (.matches | length)'
```

Expected output: `"GIRONI_1"`, `12`, `36` (12 gironi × 3 match each = 36).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/tornei/[id]/sorteggio/route.ts
git commit -m "refactor(api): sorteggio creates 12 fixed gironi with auto-walkover"
```

---

## Phase 6 — API: genera-gironi-2

### Task 6.1: New endpoint `POST /api/tornei/[id]/genera-gironi-2`

**Files:**
- Create: `src/app/api/tornei/[id]/genera-gironi-2/route.ts`

- [ ] **Step 1: Create route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  assegnaCategorie,
  computeStandings,
  distribuisciGironi2,
  generaMatchGironi1,
} from "@/lib/gironi";
import { requireAdmin } from "@/lib/api-auth";

type RouteContext = { params: Promise<{ id: string }> };

const tournamentInclude = {
  matches: {
    include: {
      team1: { include: { player1: true, player2: true } },
      team2: { include: { player1: true, player2: true } },
      winner: { include: { player1: true, player2: true } },
    },
    orderBy: [{ round: "desc" }, { posizione: "asc" }],
  },
  groups: {
    include: {
      groupTeams: {
        include: { team: { include: { player1: true, player2: true } } },
      },
    },
    orderBy: { posizione: "asc" },
  },
} satisfies import("@prisma/client").Prisma.TournamentInclude;

export async function POST(_request: NextRequest, { params }: RouteContext) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const { id } = await params;

  const torneo = await prisma.tournament.findUnique({
    where: { id },
    include: {
      groups: {
        where: { fase: 1 },
        include: { groupTeams: { include: { team: true } } },
        orderBy: { posizione: "asc" },
      },
      matches: true,
    },
  });

  if (!torneo) return NextResponse.json({ error: "Torneo non trovato" }, { status: 404 });
  if (torneo.fase !== "GIRONI_1") {
    return NextResponse.json(
      { error: "Fase corrente non è GIRONI_1" },
      { status: 400 }
    );
  }
  if (torneo.groups.length === 0) {
    return NextResponse.json(
      { error: "Sorteggio fase 1 non eseguito" },
      { status: 400 }
    );
  }

  const fase1Matches = torneo.matches.filter(
    (m) => m.groupId !== null && m.round === 0
  );
  const incompleti = fase1Matches.filter((m) => m.stato !== "COMPLETATA");
  if (incompleti.length > 0) {
    return NextResponse.json(
      { error: `Mancano ${incompleti.length} partite fase 1 da completare` },
      { status: 400 }
    );
  }

  // Compute standings per group, then assign categories
  type StandingForCategory = {
    groupPosizione: number;
    teamId: string;
    posizioneFinale: number;
  };
  const standingsAll: StandingForCategory[] = [];
  const standingsUpdates: { id: string; posizioneFinale: number }[] = [];

  for (const group of torneo.groups) {
    const groupMatchesG = fase1Matches.filter((m) => m.groupId === group.id);
    const standings = computeStandings(
      group.groupTeams.map((gt) => ({
        groupTeamId: gt.id,
        teamId: gt.teamId,
        punti: gt.punti,
        gameVinti: gt.gameVinti,
        gamePersi: gt.gamePersi,
        matchGiocate: gt.matchGiocate,
      })),
      groupMatchesG.map((m) => ({
        team1Id: m.team1Id ?? "",
        team2Id: m.team2Id ?? "",
        winnerId: m.winnerId,
      }))
    );
    for (const s of standings) {
      standingsUpdates.push({ id: s.groupTeamId, posizioneFinale: s.posizione });
      standingsAll.push({
        groupPosizione: group.posizione,
        teamId: s.teamId,
        posizioneFinale: s.posizione,
      });
    }
  }

  const categories = assegnaCategorie(standingsAll);

  // Fetch full Team rows for shuffling
  const allTeamIds = [...categories.GOLD, ...categories.SILVER, ...categories.BRONZE];
  const teamRows = await prisma.team.findMany({ where: { id: { in: allTeamIds } } });
  const teamById = new Map(teamRows.map((t) => [t.id, t]));

  const goldTeams = categories.GOLD.map((id) => teamById.get(id)!).filter(Boolean);
  const silverTeams = categories.SILVER.map((id) => teamById.get(id)!).filter(Boolean);
  const bronzeTeams = categories.BRONZE.map((id) => teamById.get(id)!).filter(Boolean);

  // Phase 2 group posizione offsets: 100..103 GOLD, 200..203 SILVER, 300..303 BRONZE
  // Use offsets >= 100 to keep distinct from phase 1 (0..11)
  const goldDraft = distribuisciGironi2(goldTeams, "GOLD", 100);
  const silverDraft = distribuisciGironi2(silverTeams, "SILVER", 200);
  const bronzeDraft = distribuisciGironi2(bronzeTeams, "BRONZE", 300);
  const allDrafts = [...goldDraft, ...silverDraft, ...bronzeDraft];
  const allMatchDrafts = generaMatchGironi1(allDrafts);

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // Persist posizioneFinale on phase-1 groupTeams
        await Promise.all(
          standingsUpdates.map((u) =>
            tx.groupTeam.update({
              where: { id: u.id },
              data: { posizioneFinale: u.posizioneFinale },
            })
          )
        );

        // Create phase-2 groups + matches
        const createdGroups = await Promise.all(
          allDrafts.map((g) =>
            tx.group.create({
              data: {
                tournamentId: torneo.id,
                nome: g.nome,
                posizione: g.posizione,
                fase: 2,
                bracketTipo: g.bracketTipo,
                groupTeams: {
                  create: g.teams
                    .filter((t) => t.teamId !== null)
                    .map((t) => ({ teamId: t.teamId as string, seed: t.seed })),
                },
              },
              select: { id: true, posizione: true },
            })
          )
        );
        const groupIdByPos = new Map<number, string>(
          createdGroups.map((g) => [g.posizione, g.id])
        );

        if (allMatchDrafts.length > 0) {
          await tx.match.createMany({
            data: allMatchDrafts.map((m) => {
              // Find draft to read bracketTipo
              const draft = allDrafts.find((d) => d.posizione === m.groupPosizione)!;
              return {
                tournamentId: torneo.id,
                groupId: groupIdByPos.get(m.groupPosizione)!,
                bracketTipo: draft.bracketTipo,
                round: 0,
                posizione: m.posizione,
                team1Id: m.team1Id,
                team2Id: m.team2Id,
                winnerId: m.winnerTeamId,
                set1Team1: m.set1Team1,
                set1Team2: m.set1Team2,
                punteggio:
                  m.set1Team1 !== null && m.set1Team2 !== null
                    ? `${m.set1Team1}-${m.set1Team2}`
                    : null,
                stato: m.walkover ? "COMPLETATA" : "ATTESA",
                finitaAt: m.walkover ? new Date() : null,
              };
            }),
          });
        }

        // Recompute stats for phase-2 walkover groups
        for (const cg of createdGroups) {
          await recomputeGroupStats(tx, cg.id);
        }

        return tx.tournament.update({
          where: { id: torneo.id },
          data: { fase: "GIRONI_2" },
          include: tournamentInclude,
        });
      },
      { maxWait: 15000, timeout: 60000 }
    );

    return NextResponse.json(result);
  } catch (err) {
    const e = err as Error & { code?: string; meta?: unknown };
    console.error("[genera-gironi-2] error", { id, message: e.message, code: e.code, meta: e.meta });
    return NextResponse.json(
      { error: e.message, code: e.code, meta: e.meta },
      { status: 500 }
    );
  }
}

async function recomputeGroupStats(
  tx: import("@prisma/client").Prisma.TransactionClient,
  groupId: string
) {
  const groupTeams = await tx.groupTeam.findMany({ where: { groupId } });
  const matches = await tx.match.findMany({
    where: { groupId, stato: "COMPLETATA" },
  });
  for (const gt of groupTeams) {
    let punti = 0, gv = 0, gp = 0, n = 0;
    for (const m of matches) {
      const isT1 = m.team1Id === gt.teamId;
      const isT2 = m.team2Id === gt.teamId;
      if (!isT1 && !isT2) continue;
      n++;
      const my = isT1 ? m.set1Team1 ?? 0 : m.set1Team2 ?? 0;
      const opp = isT1 ? m.set1Team2 ?? 0 : m.set1Team1 ?? 0;
      gv += my;
      gp += opp;
      if (m.winnerId === gt.teamId) punti += 2;
      else if (m.winnerId) punti += 1;
    }
    await tx.groupTeam.update({
      where: { id: gt.id },
      data: { punti, gameVinti: gv, gamePersi: gp, matchGiocate: n },
    });
  }
}
```

- [ ] **Step 2: Smoke test**

Pre-req: complete all 36 fase 1 matches first (use admin UI or PATCH each match).

Then:

```bash
curl -s -X POST http://localhost:3000/api/tornei/$TID/genera-gironi-2 \
  -H "Cookie: next-auth.session-token=$COOKIE" | jq '.fase, ([.groups[] | select(.fase == 2)] | length)'
```

Expected: `"GIRONI_2"`, `12` (4 Gold + 4 Silver + 4 Bronze).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/tornei/[id]/genera-gironi-2/route.ts
git commit -m "feat(api): genera-gironi-2 — assign Gold/Silver/Bronze and draw phase-2 groups"
```

---

## Phase 7 — API: genera-finali

### Task 7.1: New endpoint `POST /api/tornei/[id]/genera-finali`

**Files:**
- Create: `src/app/api/tornei/[id]/genera-finali/route.ts`

- [ ] **Step 1: Create route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeStandings } from "@/lib/gironi";
import { generaFinali } from "@/lib/bracket";
import { requireAdmin } from "@/lib/api-auth";

type RouteContext = { params: Promise<{ id: string }> };
type Categoria = "GOLD" | "SILVER" | "BRONZE";

const tournamentInclude = {
  matches: {
    include: {
      team1: { include: { player1: true, player2: true } },
      team2: { include: { player1: true, player2: true } },
      winner: { include: { player1: true, player2: true } },
    },
    orderBy: [{ round: "desc" }, { posizione: "asc" }],
  },
  groups: {
    include: {
      groupTeams: {
        include: { team: { include: { player1: true, player2: true } } },
      },
    },
    orderBy: { posizione: "asc" },
  },
} satisfies import("@prisma/client").Prisma.TournamentInclude;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function POST(_request: NextRequest, { params }: RouteContext) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const { id } = await params;

  const torneo = await prisma.tournament.findUnique({
    where: { id },
    include: {
      groups: {
        where: { fase: 2 },
        include: { groupTeams: { include: { team: true } } },
        orderBy: { posizione: "asc" },
      },
      matches: true,
    },
  });

  if (!torneo) return NextResponse.json({ error: "Torneo non trovato" }, { status: 404 });
  if (torneo.fase !== "GIRONI_2") {
    return NextResponse.json({ error: "Fase corrente non è GIRONI_2" }, { status: 400 });
  }

  const phase2GroupIds = new Set(torneo.groups.map((g) => g.id));
  const fase2Matches = torneo.matches.filter(
    (m) => m.groupId !== null && phase2GroupIds.has(m.groupId) && m.round === 0
  );
  const incompleti = fase2Matches.filter((m) => m.stato !== "COMPLETATA");
  if (incompleti.length > 0) {
    return NextResponse.json(
      { error: `Mancano ${incompleti.length} partite fase 2 da completare` },
      { status: 400 }
    );
  }

  // For each phase-2 group, pick the 1st-place team
  const primaPerCategoria: Record<Categoria, string[]> = {
    GOLD: [],
    SILVER: [],
    BRONZE: [],
  };
  const standingsUpdates: { id: string; posizioneFinale: number }[] = [];

  for (const group of torneo.groups) {
    const groupMatchesG = fase2Matches.filter((m) => m.groupId === group.id);
    const standings = computeStandings(
      group.groupTeams.map((gt) => ({
        groupTeamId: gt.id,
        teamId: gt.teamId,
        punti: gt.punti,
        gameVinti: gt.gameVinti,
        gamePersi: gt.gamePersi,
        matchGiocate: gt.matchGiocate,
      })),
      groupMatchesG.map((m) => ({
        team1Id: m.team1Id ?? "",
        team2Id: m.team2Id ?? "",
        winnerId: m.winnerId,
      }))
    );
    for (const s of standings) {
      standingsUpdates.push({ id: s.groupTeamId, posizioneFinale: s.posizione });
    }
    const primo = standings.find((s) => s.posizione === 1);
    const categoria = group.bracketTipo as Categoria | null;
    if (primo && categoria) {
      primaPerCategoria[categoria].push(primo.teamId);
    }
  }

  // Random pairing per category
  const allDrafts = (["GOLD", "SILVER", "BRONZE"] as const).flatMap((cat) => {
    const teams = shuffle(primaPerCategoria[cat]);
    if (teams.length === 0) return [];
    return generaFinali(teams, torneo.id, cat);
  });

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        await Promise.all(
          standingsUpdates.map((u) =>
            tx.groupTeam.update({
              where: { id: u.id },
              data: { posizioneFinale: u.posizioneFinale },
            })
          )
        );

        if (allDrafts.length > 0) {
          await tx.match.createMany({ data: allDrafts });
        }

        return tx.tournament.update({
          where: { id: torneo.id },
          data: { fase: "FINALI" },
          include: tournamentInclude,
        });
      },
      { maxWait: 10000, timeout: 30000 }
    );

    return NextResponse.json(result);
  } catch (err) {
    const e = err as Error & { code?: string; meta?: unknown };
    console.error("[genera-finali] error", { id, message: e.message, code: e.code, meta: e.meta });
    return NextResponse.json(
      { error: e.message, code: e.code, meta: e.meta },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Smoke test**

After completing all phase-2 group matches:

```bash
curl -s -X POST http://localhost:3000/api/tornei/$TID/genera-finali \
  -H "Cookie: next-auth.session-token=$COOKIE" | jq '.fase, ([.matches[] | select(.round == 2)] | length), ([.matches[] | select(.round == 1)] | length)'
```

Expected: `"FINALI"`, `6` (2 semi × 3 categories), `6` (final + 3°/4° × 3 categories).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/tornei/[id]/genera-finali/route.ts
git commit -m "feat(api): genera-finali — 2 semis + final + 3rd-place playoff per category"
```

---

## Phase 8 — API: promote winners from semifinals

### Task 8.1: Update `promoteWinner` in PATCH partite

**Files:**
- Modify: `src/app/api/partite/[id]/route.ts`

The current `promoteWinner` reads `match.posizione % 2` and goes to `floor(posizione / 2)` at `round - 1`. For our flow:
- Semifinale `round 2 pos 0`: winner → finale `round 1 pos 0` team1; loser → 3°/4° `round 1 pos 1` team1
- Semifinale `round 2 pos 1`: winner → finale `round 1 pos 0` team2; loser → 3°/4° `round 1 pos 1` team2

The existing helper handles winners. We need a parallel `promoteLoser` for the 3rd-place playoff.

- [ ] **Step 1: Add helper for loser promotion**

In `src/app/api/partite/[id]/route.ts`, add at the bottom (next to `promoteWinner`):

```ts
async function promoteLoser(match: {
  id: string;
  tournamentId: string;
  bracketTipo: string | null;
  round: number;
  posizione: number;
  team1Id: string | null;
  team2Id: string | null;
  winnerId: string | null;
}) {
  // Only applies to semifinals (round 2) in our flow
  if (match.round !== 2) return;
  if (!match.winnerId || !match.team1Id || !match.team2Id) return;

  const loserId =
    match.team1Id === match.winnerId ? match.team2Id : match.team1Id;

  // 3°/4° playoff lives at round 1, posizione 1
  const playoff = await prisma.match.findFirst({
    where: {
      tournamentId: match.tournamentId,
      bracketTipo: match.bracketTipo,
      round: 1,
      posizione: 1,
    },
  });
  if (!playoff) return;

  // Semi pos 0 → 3°/4° team1; semi pos 1 → 3°/4° team2
  const isTeam1 = match.posizione % 2 === 0;
  await prisma.match.update({
    where: { id: playoff.id },
    data: isTeam1 ? { team1Id: loserId } : { team2Id: loserId },
  });
}

async function unpromoteLoser(match: {
  tournamentId: string;
  bracketTipo: string | null;
  round: number;
  posizione: number;
  team1Id: string | null;
  team2Id: string | null;
  winnerId: string;
}) {
  if (match.round !== 2) return;
  const loserId =
    match.team1Id === match.winnerId ? match.team2Id : match.team1Id;
  if (!loserId) return;

  const playoff = await prisma.match.findFirst({
    where: {
      tournamentId: match.tournamentId,
      bracketTipo: match.bracketTipo,
      round: 1,
      posizione: 1,
    },
  });
  if (!playoff) return;

  const isTeam1 = match.posizione % 2 === 0;
  const slotMatches = isTeam1
    ? playoff.team1Id === loserId
    : playoff.team2Id === loserId;
  if (!slotMatches) return;

  await prisma.match.update({
    where: { id: playoff.id },
    data: isTeam1 ? { team1Id: null } : { team2Id: null },
  });
}
```

- [ ] **Step 2: Wire `promoteLoser` after `promoteWinner` in TERMINA branch**

In the `azione === "TERMINA"` branch, replace:

```ts
    if (updated.groupId) {
      await updateGroupStats(updated.groupId);
    } else {
      await promoteWinner(updated);
    }
```

with:

```ts
    if (updated.groupId) {
      await updateGroupStats(updated.groupId);
    } else {
      await promoteWinner(updated);
      await promoteLoser(updated);
    }
```

But note: `promoteWinner` currently has signature `MatchForPromotion` lacking `team1Id`/`team2Id`. Update its type:

```ts
type MatchForPromotion = {
  id: string;
  tournamentId: string;
  bracketTipo: string | null;
  groupId: string | null;
  round: number;
  posizione: number;
  team1Id: string | null;
  team2Id: string | null;
  winnerId: string | null;
};
```

The `Match` object from `prisma.match.update({...include: matchInclude})` already exposes `team1Id` and `team2Id`. No further change needed at call sites.

Also: `promoteWinner` currently advances winner to `floor(posizione / 2)` of next round. For our flow, semifinal pos 0 and 1 both need to advance to finale (round 1 pos 0). `floor(0/2) = 0` ✓, `floor(1/2) = 0` ✓ — works.

- [ ] **Step 3: Wire `unpromoteLoser` in RESET branch**

In `azione === "RESET"` branch, replace:

```ts
    } else if (wasWinnerId) {
      await unpromoteWinner({
        tournamentId: updated.tournamentId,
        bracketTipo: updated.bracketTipo,
        round: updated.round,
        posizione: updated.posizione,
        winnerId: wasWinnerId,
      });
    }
```

with:

```ts
    } else if (wasWinnerId) {
      await unpromoteWinner({
        tournamentId: updated.tournamentId,
        bracketTipo: updated.bracketTipo,
        round: updated.round,
        posizione: updated.posizione,
        winnerId: wasWinnerId,
      });
      await unpromoteLoser({
        tournamentId: updated.tournamentId,
        bracketTipo: updated.bracketTipo,
        round: updated.round,
        posizione: updated.posizione,
        team1Id: match.team1Id,
        team2Id: match.team2Id,
        winnerId: wasWinnerId,
      });
    }
```

- [ ] **Step 4: Smoke test**

Trigger TERMINA on a semifinal:

```bash
curl -s -X PATCH http://localhost:3000/api/partite/<SEMI_ID> \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=$COOKIE" \
  -d '{"azione":"TERMINA","set1Team1":6,"set1Team2":3}'

# Verify finale and 3°/4° were populated:
curl -s http://localhost:3000/api/tornei/$TID \
  -H "Cookie: next-auth.session-token=$COOKIE" | \
  jq '.matches[] | select(.round == 1 and .bracketTipo == "GOLD") | {posizione, team1: .team1.nome, team2: .team2.nome}'
```

Expected: finale (pos 0) has winner team filled in one slot; 3°/4° (pos 1) has loser in one slot.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/partite/[id]/route.ts
git commit -m "feat(api): promote semifinal losers to 3rd-place playoff"
```

---

## Phase 9 — Final-stage auto-completion `TORNEO_COMPLETATO`

### Task 9.1: Mark tournament as `COMPLETATO` when all finals completed

**Files:**
- Modify: `src/app/api/partite/[id]/route.ts`

- [ ] **Step 1: Add helper**

At bottom of file:

```ts
async function checkTournamentCompletion(tournamentId: string) {
  const torneo = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { fase: true },
  });
  if (!torneo || torneo.fase !== "FINALI") return;

  const remaining = await prisma.match.count({
    where: {
      tournamentId,
      stato: { not: "COMPLETATA" },
    },
  });
  if (remaining === 0) {
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { fase: "COMPLETATO" },
    });
  }
}
```

- [ ] **Step 2: Call after TERMINA**

After the `if (updated.groupId) ... else ...` block in TERMINA branch:

```ts
    await checkTournamentCompletion(updated.tournamentId);
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/partite/[id]/route.ts
git commit -m "feat(api): auto-set tournament fase to COMPLETATO when all finals done"
```

---

## Phase 10 — Frontend: types + Bracket component

### Task 10.1: Update `TabelloneClient` for new phases

**Files:**
- Modify: `src/components/TabelloneClient.tsx`

- [ ] **Step 1: Replace phase handling**

In `TabelloneClient.tsx`, change line 63:

```ts
  const [activePhase, setActivePhase] = useState<"GIRONI_1" | "GIRONI_2" | "FINALI">(
    torneoIniziale.fase === "BOZZA" ? "GIRONI_1" :
    torneoIniziale.fase === "COMPLETATO" ? "FINALI" :
    torneoIniziale.fase as "GIRONI_1" | "GIRONI_2" | "FINALI"
  );
```

Replace the line `const hasBracket = torneo.fase === "BRACKET";` and dependent logic:

```ts
  const hasFase1 = torneo.groups.some((g) => g.fase === 1);
  const hasFase2 = torneo.groups.some((g) => g.fase === 2);
  const hasFinali = torneo.matches.some((m) => m.bracketTipo !== null && m.groupId === null);
  const isFaseGironi = activePhase === "GIRONI_1" || activePhase === "GIRONI_2";
```

Update `bracketMatchesByTipo` to only count finale-stage matches (round 1 + round 2, no groupId):

```ts
  const bracketMatchesByTipo = useMemo(() => {
    const map = new Map<BracketTipo, typeof torneo.matches>();
    for (const tipo of BRACKETS) {
      map.set(
        tipo,
        torneo.matches.filter(
          (m) => m.bracketTipo === tipo && m.groupId === null
        )
      );
    }
    return map;
  }, [torneo.matches]);
```

Replace `PhaseToggle` invocation with new component (defined below). Replace existing `PhaseToggle` function with:

```tsx
function PhaseToggle({
  active,
  onChange,
  available,
  accent,
}: {
  active: "GIRONI_1" | "GIRONI_2" | "FINALI";
  onChange: (p: "GIRONI_1" | "GIRONI_2" | "FINALI") => void;
  available: { fase1: boolean; fase2: boolean; finali: boolean };
  accent: string;
}) {
  const phases: { value: "GIRONI_1" | "GIRONI_2" | "FINALI"; label: string; enabled: boolean }[] = [
    { value: "GIRONI_1", label: "Gironi 1", enabled: available.fase1 },
    { value: "GIRONI_2", label: "Gironi 2", enabled: available.fase2 },
    { value: "FINALI", label: "Finali", enabled: available.finali },
  ];
  return (
    <div className="flex items-center gap-2">
      {phases.map((p) => (
        <button
          key={p.value}
          type="button"
          disabled={!p.enabled}
          onClick={() => onChange(p.value)}
          className="cc-mono uppercase transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            fontSize: 11,
            padding: "6px 16px",
            background: active === p.value ? accent : "oklch(0.24 0.05 255)",
            color: active === p.value ? "var(--color-night-deep)" : "var(--color-paper)",
            border: `1px solid ${accent}`,
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
```

Update its call site:

```tsx
          {(hasFase1 || hasFase2 || hasFinali) && (
            <PhaseToggle
              active={activePhase}
              onChange={setActivePhase}
              available={{ fase1: hasFase1, fase2: hasFase2, finali: hasFinali }}
              accent={accent}
            />
          )}
```

- [ ] **Step 2: Filter gironi by active phase + category**

In the body where `<GironiView />` is rendered:

```tsx
      {isFaseGironi ? (
        <GironiView
          groups={
            activePhase === "GIRONI_1"
              ? torneo.groups.filter((g) => g.fase === 1)
              : torneo.groups.filter((g) => g.fase === 2 && g.bracketTipo === activeBracket)
          }
          matches={torneo.matches}
          accent={accent}
        />
      ) : ...}
```

- [ ] **Step 3: Show bracket tabs in GIRONI_2 and FINALI**

Change the condition wrapping `BracketTabs` from `!isFaseGironi` to `activePhase !== "GIRONI_1"`.

- [ ] **Step 4: Type-check + visual**

Run: `npx tsc --noEmit`
Expected: clean.

Open `http://localhost:3000/tabellone-maschile` in browser after creating a torneo and running sorteggio. Verify:
- "Gironi 1" tab shows 12 group cards
- After genera-gironi-2: "Gironi 2" tab + Gold/Silver/Bronze sub-tabs
- After genera-finali: "Finali" tab shows semifinal + finale + 3°/4° brackets

- [ ] **Step 5: Commit**

```bash
git add src/components/TabelloneClient.tsx
git commit -m "feat(ui): TabelloneClient supports GIRONI_1/GIRONI_2/FINALI phases"
```

---

### Task 10.2: Bracket layout for semifinali + finale + 3°/4°

**Files:**
- Modify: `src/components/Bracket.tsx`

The current Bracket groups matches by `round` and sorts by `posizione`. With our new structure:
- Round 2 (semifinals): 2 matches at positions 0, 1 → rendered as a column
- Round 1: position 0 = finale (highlight gold), position 1 = 3°/4° (different label)

The existing logic renders the round-1 column with a special "FINALE" treatment for `matches[0]`. We need both: finale **and** 3°/4° rendered as separate cards inside round 1, with distinct labels.

- [ ] **Step 1: Split round-1 rendering**

In `src/components/Bracket.tsx`, replace the `if (isFinaleCol) { ... }` block with:

```tsx
          if (isFinaleCol) {
            const finale = matches.find((m) => m.posizione === 0);
            const terzo = matches.find((m) => m.posizione === 1);
            return (
              <div
                key={round}
                data-round={round}
                className="flex flex-col items-stretch justify-center gap-6"
              >
                {finale && (
                  <div
                    style={{
                      padding: 4,
                      background: `linear-gradient(135deg, ${accent}, var(--color-yellow))`,
                    }}
                  >
                    <div style={{ background: "oklch(0.20 0.04 255)", padding: 14 }}>
                      <div
                        className="cc-mono text-center mb-1.5"
                        style={{ fontSize: 11, color: "var(--color-yellow)" }}
                      >
                        ★ FINALE
                      </div>
                      <BracketMatch
                        match={finale}
                        size={matchSize}
                        accent={accent}
                        focused={focused === buildCode(finale)}
                        onFocus={onFocus}
                        code={buildCode(finale)}
                      />
                      <div
                        className="cc-display text-center mt-2"
                        style={{ fontSize: 16, color: "var(--color-yellow)", letterSpacing: "0.05em" }}
                      >
                        Trofeo Chanteclair
                      </div>
                    </div>
                  </div>
                )}
                {terzo && (
                  <div
                    style={{
                      padding: 3,
                      background: "oklch(0.45 0.06 60)",
                    }}
                  >
                    <div style={{ background: "oklch(0.20 0.04 255)", padding: 10 }}>
                      <div
                        className="cc-mono text-center mb-1"
                        style={{ fontSize: 10, color: "oklch(0.75 0.08 60)" }}
                      >
                        3°/4° POSTO
                      </div>
                      <BracketMatch
                        match={terzo}
                        size={matchSize}
                        accent={"oklch(0.65 0.08 30)"}
                        focused={focused === buildCode(terzo)}
                        onFocus={onFocus}
                        code={buildCode(terzo)}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          }
```

- [ ] **Step 2: Visual verify**

Browser, with `fase === "FINALI"`: bracket shows two columns — semifinali (2 cards stacked) and finali (FINALE card + 3°/4° card stacked).

- [ ] **Step 3: Commit**

```bash
git add src/components/Bracket.tsx
git commit -m "feat(ui): Bracket renders finale + 3rd-place playoff side-by-side"
```

---

### Task 10.3: GironiView labels phase-2 groups by category

**Files:**
- Modify: `src/components/GironiView.tsx`

- [ ] **Step 1: Add header for phase 2**

In `GironiView.tsx`, around the existing `<h3>Girone {g.nome}</h3>`, append a category badge when `g.bracketTipo` is set:

```tsx
              <div className="flex items-center justify-between mb-2 shrink-0">
                <h3 className="cc-display text-base md:text-lg text-paper leading-tight flex items-center gap-2">
                  Girone {g.nome}
                  {g.bracketTipo && (
                    <span
                      className="cc-mono text-[9px] px-1.5 py-0.5 rounded"
                      style={{
                        background:
                          g.bracketTipo === "GOLD"
                            ? "var(--color-yellow)"
                            : g.bracketTipo === "SILVER"
                            ? "oklch(0.85 0.02 255)"
                            : "oklch(0.65 0.08 30)",
                        color: "var(--color-night-deep)",
                      }}
                    >
                      {g.bracketTipo}
                    </span>
                  )}
                </h3>
                <span
                  className="cc-mono text-[9px]"
                  style={{ color: "oklch(0.7 0.02 255)" }}
                >
                  {g.groupTeams.length} sq
                </span>
              </div>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/GironiView.tsx
git commit -m "feat(ui): GironiView labels phase-2 groups with Gold/Silver/Bronze badge"
```

---

## Phase 11 — Admin UI: phase-aware actions

### Task 11.1: Replace "Genera Bracket" button with phase-aware buttons

**Files:**
- Modify: `src/app/admin/torneo/page.tsx`

- [ ] **Step 1: Add handlers**

Inside `TorneoPage`, after `handleGeneraBracket`, add (and replace its body):

```tsx
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
```

- [ ] **Step 2: Replace conditional block**

Find the block (around line 407):

```tsx
                    {groupComplete && (
                      <Button
                        size="sm"
                        onClick={() => handleGeneraBracket(t)}
                        className="bg-court-line text-court hover:bg-[#e7ff75] h-10"
                      >
                        Genera Bracket
                      </Button>
                    )}
```

Replace with:

```tsx
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
```

- [ ] **Step 3: Remove now-unused `handleGeneraBracket`**

Delete the `handleGeneraBracket` function entirely.

- [ ] **Step 4: Update sorteggio confirmation message**

Replace the `handleSorteggio` body. Drop the call to `calcolaSizesGironi`. Change to:

```tsx
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
```

Remove the `import { calcolaSizesGironi }` line at the top — `calcolaSizesGironi` is no longer used.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/torneo/page.tsx
git commit -m "feat(admin): phase-aware buttons for genera-gironi-2 and genera-finali"
```

---

## Phase 12 — Cleanup

### Task 12.1: Remove obsolete `/api/tornei/[id]/genera-bracket`

**Files:**
- Delete: `src/app/api/tornei/[id]/genera-bracket/`

- [ ] **Step 1: Remove route**

Run:
```bash
rm -rf src/app/api/tornei/[id]/genera-bracket
```

- [ ] **Step 2: Grep for remaining references**

Run: `grep -rn "genera-bracket" src/ docs/`
Expected: zero results (admin page reference removed in Phase 11).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove obsolete genera-bracket endpoint"
```

---

### Task 12.2: Remove obsolete `generaBracket` / `calcolaSizesGironi`

**Files:**
- Modify: `src/lib/bracket.ts`
- Modify: `src/lib/gironi.ts`

- [ ] **Step 1: Grep for usage**

```bash
grep -rn "generaBracket\|calcolaSizesGironi\|distribuisciGironi\b" src/
```
Expected: only the export definitions (no consumers).

- [ ] **Step 2: Delete obsolete exports**

From `src/lib/bracket.ts`: delete `generaBracket`, `BracketMatchInput`, `calcolaNumeroDiRound`, `prossimaPotenzaDi2`, `shuffle`, `getSeedPositions` if not used elsewhere. Verify with grep before removing each.

From `src/lib/gironi.ts`: delete `distribuisciGironi` (the original), `calcolaSizesGironi`, `generaMatchGironi` (original) if not used elsewhere. Verify with grep.

- [ ] **Step 3: Type-check + tests**

Run: `npx tsc --noEmit && npm test`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/lib/bracket.ts src/lib/gironi.ts
git commit -m "chore: remove obsolete bracket/gironi helpers"
```

---

### Task 12.3: Update seed to create 36 squadre per gender

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Read current seed**

Run: `head -50 prisma/seed.ts`

Update the seed to produce 36 Player × 2 = 72 maschili players → 36 teams, same for femminili. Existing seed creates 8M + 8F per README — bump to 72M + 72F.

(Exact diff depends on current `prisma/seed.ts` layout — skipped here; the engineer reads the file and bumps the loop counts accordingly.)

- [ ] **Step 2: Reseed**

Run: `npm run db:seed`
Expected: success.

- [ ] **Step 3: Verify**

```bash
docker compose exec -T postgres psql -U postgres -d chanteclair -c \
  "SELECT genere, COUNT(*) FROM \"Team\" GROUP BY genere;"
```
Expected: 36 MASCHILE, 36 FEMMINILE.

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts
git commit -m "chore(seed): create 36 squadre per gender for new tournament flow"
```

---

### Task 12.4: Update CLAUDE.md tournament data model section

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Replace the "Tournament data model" section**

In `CLAUDE.md`, replace the existing section with:

```markdown
## Tournament data model

Players → Teams → enter Tournaments (one tournament per `genere`, max 36 teams). `Tournament.fase` lifecycle: `BOZZA` → `GIRONI_1` → `GIRONI_2` → `FINALI` → `COMPLETATO`.

- **GIRONI_1**: 12 random groups of 3 (`Group.fase = 1`, `bracketTipo = null`). Missing slots auto-walkover 6-0.
- **GIRONI_2**: 12 groups of 3 (`Group.fase = 2`, `bracketTipo ∈ {GOLD, SILVER, BRONZE}`). 1st place of each phase-1 group goes to GOLD, 2nd → SILVER, 3rd → BRONZE; 4 groups per category, random.
- **FINALI**: 4 matches per category — 2 semifinals (`round = 2`), final (`round = 1, posizione = 0`), 3rd-place playoff (`round = 1, posizione = 1`). Semifinal winner → finale; semifinal loser → 3rd-place playoff. Pairing is random per category.

Group-stage matches: `groupId` set, `round = 0`. Final-stage matches: `bracketTipo` set, `groupId = null`. Tie-break in `computeStandings`: punti → scontro diretto (only if exact 2-team tie) → diff games → game vinti.

Italian field names throughout schema (`nome`, `cognome`, `genere`, `punteggio`, etc.) — keep this convention.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md tournament model for new phase flow"
```

---

## Self-review checklist

Already integrated:
- Spec coverage: all 4 phases (fase-1 sorteggio, categorization, fase-2 sorteggio, semifinals+finals+3rd-place) → Tasks 5.1, 6.1, 7.1, 8.1 respectively. Walkover handling → 2.2, 5.1, 6.1. Animation reuse → 10.1 (TabelloneClient already calls `GironiAnimation` on `GIRONI_ANIMATION` realtime event; no new animation work required if existing trigger paths are kept — verify in browser during Phase 10 smoke test).
- Type consistency: `FaseTorneo` values `BOZZA | GIRONI_1 | GIRONI_2 | FINALI | COMPLETATO` referenced consistently. `GroupDraft.teams` shape `{ teamId: string | null; seed: number | null }` used in 2.1, 3.2, 5.1, 6.1. `generaFinali` returns `FinalMatchDraft[]` consumed in 7.1.
- Manual smoke tests + vitest unit tests cover the verified flows.

## Open items deferred (out of scope for this plan)

- **Animation for phase-2 sorteggio**: a new realtime event `GIRONI_2_ANIMATION` may be added later. For now, after `genera-gironi-2`, the tabellone simply refetches and renders the new groups. If the user wants the same animation overlay used for phase 1, that's a separate plan that extends `GironiAnimation` + adds a publish call in `genera-gironi-2`.
- **Mobile-specific finals layout**: current Bracket has responsive logic that should adapt. Verify visually but defer adjustments.
- **Misto tournament**: per user, not in scope.
