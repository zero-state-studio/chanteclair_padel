# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Stack

Next.js 16.2.4 (App Router + Turbopack) · React 19.2 · TypeScript strict · Prisma 5 + Postgres · NextAuth v5 (beta) · Tailwind v4 + shadcn/ui · Framer Motion. Path alias `@/*` → `./src/*`.

## Commands

```bash
npm run dev          # next dev (Turbopack), port 3000
npm run build        # prisma generate && prisma migrate deploy && next build
npm run lint         # eslint
npm run db:seed      # tsx prisma/seed.ts
npm run db:reset     # DESTRUCTIVE: prisma migrate reset --force
npm run db:studio    # prisma studio
docker compose up -d # local Postgres on :5432
```

`postinstall` runs `prisma generate`. No test suite is configured.

## Database env vars (NOT `DATABASE_URL`)

`prisma/schema.prisma` reads **`POSTGRES_PRISMA_URL`** (pooled) and **`POSTGRES_URL_NON_POOLING`** (direct). The README's `DATABASE_URL` / `DIRECT_URL` names are outdated — do not use them. Local dev points to docker Postgres; commented-out `*_PROD` vars in `.env` point to Supabase.

## Realtime (broadcast, not SSE)

Live overlays use **Supabase Realtime broadcast**, not SSE. Server routes call `publishLiveEvent()` from `src/lib/realtime.ts`, which POSTs to `${SUPABASE_URL}/realtime/v1/api/broadcast` on topic `live-events`. Browser subscribes via `src/hooks/useRealtime.ts`. Requires `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`) and `SUPABASE_SERVICE_ROLE_KEY`. The `/api/sse` route and `sseEmitter` mentioned in README no longer exist.

Publishers: `api/partite/[id]`, `api/sponsors/showcase`, `api/tornei/[id]/inizia*`, `api/tornei/[id]/anima-gironi`.

## Auth

NextAuth v5 with single hardcoded admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars (`src/lib/auth.ts`). JWT session strategy. `src/middleware.ts` protects `/admin/:path*` and redirects unauthenticated users to `/admin/login`.

## Tournament data model

Players → Teams → enter Tournaments (one tournament per `genere`, max 36 teams). `Tournament.fase` lifecycle: `BOZZA` → `GIRONI_1` → `GIRONI_2` → `FINALI` → `COMPLETATO`.

- **GIRONI_1**: 12 random groups of 3 (`Group.fase = 1`, `bracketTipo = null`). Missing slots auto-walkover 6-0.
- **GIRONI_2**: 12 groups of 3 (`Group.fase = 2`, `bracketTipo ∈ {GOLD, SILVER, BRONZE}`). 1st place of each phase-1 group goes to GOLD, 2nd → SILVER, 3rd → BRONZE; 4 groups per category, random.
- **FINALI**: 4 matches per category — 2 semifinals (`round = 2`), final (`round = 1, posizione = 0`), 3rd-place playoff (`round = 1, posizione = 1`). Semifinal winner → finale; semifinal loser → 3rd-place playoff. Pairing is random per category.

Group-stage matches: `groupId` set, `round = 0`. Final-stage matches: `bracketTipo` set, `groupId = null`. `Match.stato` lifecycle: `ATTESA` → `IN_CORSO` → `COMPLETATA`. Tie-break in `computeStandings`: punti → scontro diretto (only if exact 2-team tie) → diff games → game vinti.

Italian field names throughout schema (`nome`, `cognome`, `genere`, `punteggio`, etc.) — keep this convention.

## Routing layout

```
src/app/
  (public)/              # landing
  tabellone-{maschile,femminile}/   # public live brackets
  campo/, partita/       # public single-screen views
  admin/{login,giocatori,squadre,torneo,partite,tabelloni,campi,sponsor,animazioni}/
  api/{auth,giocatori,squadre,tornei,partite,campi,sponsors}/
```

## Gotchas

- `next.config.ts` pins `serverExternalPackages: ["@prisma/client", "@prisma/engines"]` — do not bundle Prisma for Edge. Keep Prisma-using routes on Node runtime.
- `binaryTargets` in `schema.prisma` includes `rhel-openssl-3.0.x` for Vercel deploys — leave it.
- After pulling new migrations against an already-migrated Supabase DB, use `npx prisma migrate resolve --applied <name>` instead of `migrate deploy` to avoid conflicts.
- `public/uploads/` is gitignored and used for player photo uploads via `src/lib/uploads.ts`.
- `prisma/seed.ts` runs via `tsx` (declared under `prisma.seed` in `package.json`).
