# 🎾 Chanteclair Padel Tournament

Web app per la gestione di tornei di padel con tabelloni live, animazioni fullscreen e pannello admin.

## Stack Tecnologico

- **Next.js 16** (App Router, Turbopack) — framework full-stack
- **Prisma + SQLite** — database locale (da migrare a PostgreSQL/Supabase in produzione)
- **NextAuth v5** — autenticazione admin (credentials provider)
- **Tailwind CSS v4 + shadcn/ui** — UI
- **Framer Motion** — animazioni fullscreen live
- **Server-Sent Events (SSE)** — notifiche realtime (da migrare a Supabase Realtime per Vercel)

---

## Setup Locale

### 1. Installa le dipendenze

```bash
npm install
```

### 2. Configura le variabili d'ambiente

Il repo include già due file:

- `.env` — usato da Prisma (solo `DATABASE_URL`)
- `.env.local` — usato da Next.js (auth + admin)

Valori di sviluppo (modificali se necessario):

```env
# .env
DATABASE_URL="file:./dev.db"

# .env.local
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="chanteclair-padel-secret-key-2024"
AUTH_SECRET="chanteclair-padel-secret-key-2024"
AUTH_TRUST_HOST="true"
NEXTAUTH_URL="http://localhost:3000"
ADMIN_EMAIL="admin@chanteclair.it"
ADMIN_PASSWORD="admin123"
```

### 3. Crea il database e applica le migrazioni

```bash
npx prisma migrate dev
```

### 4. Popola con dati demo

```bash
npm run db:seed
```

Crea 8 giocatori maschili + 8 femminili (4 teste di serie ciascuno) e 2 tornei in stato `BOZZA`.

### 5. Avvia il server di sviluppo

```bash
npm run dev
```

App disponibile su **http://localhost:3000**.

---

## Mappa URL

| URL | Descrizione |
|-----|-------------|
| `/` | Landing page pubblica |
| `/tabellone-maschile` | Tabellone maschile (realtime via SSE) |
| `/tabellone-femminile` | Tabellone femminile (realtime via SSE) |
| `/admin/login` | Login admin |
| `/admin/giocatori` | Gestione giocatori (CRUD + upload foto) |
| `/admin/torneo` | Creazione tornei + sorteggio bracket |
| `/admin/partite` | Gestione partite live (notifiche SSE) |
| `/api/sse` | Endpoint Server-Sent Events |
| `/api/giocatori` · `/api/giocatori/[id]` | API CRUD giocatori |
| `/api/tornei` · `/api/tornei/[id]` · `/api/tornei/[id]/sorteggio` | API tornei + sorteggio |
| `/api/partite` · `/api/partite/[id]` | API partite (azioni `INIZIA` / `TERMINA`) |

---

## Test del Flusso End-to-End

### Setup iniziale
1. Vai su **http://localhost:3000/admin/login**
2. Accedi con `admin@chanteclair.it` / `admin123`

### Creazione e sorteggio torneo
3. **Admin → Tornei**
4. Click su `Esegui Sorteggio` sul torneo maschile
5. Click su `Anteprima Bracket` per vedere il tabellone generato

### Test animazioni live (funzionalità principale)
6. Apri **http://localhost:3000/tabellone-maschile** in un altro tab (o un altro dispositivo nella stessa rete)
7. Torna su **Admin → Partite**
8. Trova una partita con due giocatori e click su **`▶ Inizia Partita`**
9. **→ Sul tabellone pubblico appare l'overlay fullscreen verde "🎾 Partita Iniziata!"**
10. Inserisci punteggio (es. `6-3, 7-5`), seleziona vincitore e click su **`✓ Conferma e Notifica`**
11. **→ Sul tabellone pubblico appare l'overlay blu "🏆 Partita Terminata!" con risultato e vincitore**
12. Il bracket si aggiorna mostrando il vincitore promosso al round successivo

---

## Architettura Realtime

```
Admin (PATCH /api/partite/[id])
        ↓
sseEmitter.emit('live-event', LiveEvent)
        ↓
GET /api/sse  ← stream aperto da tutti i browser pubblici
        ↓
useSSE hook nel TabelloneClient
        ↓
LiveMatchOverlay (Framer Motion fullscreen)
```

**Nota**: l'`EventEmitter` globale vive nella memoria del processo Node.js. Funziona solo in sviluppo locale o in deploy single-process. Per Vercel/serverless si dovrà migrare a **Supabase Realtime** o un broker esterno.

---

## Comandi utili

```bash
npm run dev          # avvia dev server
npm run build        # build di produzione
npm run db:seed      # popola DB con dati demo
npm run db:reset     # reset migrate + ri-seed
npm run db:studio    # apre Prisma Studio
```

---

## Struttura del progetto

```
src/
  app/
    page.tsx                       # Landing
    tabellone-maschile/page.tsx
    tabellone-femminile/page.tsx
    admin/
      layout.tsx, login/, giocatori/, torneo/, partite/
    api/
      auth/[...nextauth]/route.ts
      giocatori/, tornei/, partite/, sse/
  components/
    Bracket.tsx, BracketMatch.tsx
    TabelloneClient.tsx
    LiveMatchOverlay.tsx
    AdminNav.tsx
    ui/                            # shadcn/ui
  hooks/useSSE.ts
  lib/
    prisma.ts, auth.ts, sse.ts, bracket.ts, uploads.ts, utils.ts
  middleware.ts                    # protezione /admin/*
  types/index.ts
prisma/
  schema.prisma, seed.ts, migrations/
public/
  uploads/                         # foto giocatori (gitignored)
```
