# Teste di serie — sorteggio GIRONI_1 per fasce

**Data:** 2026-06-09
**Stato:** Design approvato

## Obiettivo

Il sorteggio della fase `GIRONI_1` è oggi completamente random (`distribuisciGironi1`
usa `shuffle()` puro e salva `seed: null` su ogni `GroupTeam`). Vogliamo introdurre
le **teste di serie a fasce**: ogni girone della fase 1 deve contenere, dove possibile,
una squadra di fascia 1, una di fascia 2 e una di fascia 3.

## Modello dati (nessuna migrazione)

- La testa di serie è già il campo **`Team.livello`** (`Int @default(0)`), esposto nel
  form squadre come "Testa di serie (0 = non tds)".
  - `0` = non testa di serie
  - `1` / `2` / `3` = fascia
- `GroupTeam.seed` (`Int?`) viene popolato con `team.livello` così che la Uova
  (`GironiView`, `GironiAnimation`, `MatchLiveClient`) mostri il badge `[1]/[2]/[3]`.
  Oggi è sempre `null`.

Nessuna modifica allo schema Prisma: si riusano i campi esistenti.

## Ambito

- **Solo `GIRONI_1`.** `GIRONI_2` e `FINALI` restano invariati (sono già ordinati per
  piazzamento dei gironi precedenti).
- Strategia in caso di fasce sbilanciate: **best-effort + avviso** (il sorteggio
  procede sempre).

## Algoritmo — `distribuisciGironi1` (`src/lib/gironi.ts`)

Sostituisce lo shuffle puro con un pot system.

```
Input: Team[]  (Team.livello = fascia)
Costanti: NUM_GIRONI_FASE_1 = 12, SIZE_GIRONE = 3, CAPACITA_TOTALE = 36

1. Split in pot per livello:
   - pot1 = livello === 1
   - pot2 = livello === 2
   - pot3 = livello === 3
   - extra = livello === 0 oppure livello > 3
2. Shuffle ogni pot indipendentemente.
3. Per g in 0..11: assegna pot1[g], pot2[g], pot3[g] al girone g (se l'indice esiste).
4. Slot ancora vuoti → pool di riempimento = (squadre non piazzate: overflow oltre i
   primi 12 di ciascun pot + extra). Shuffle del pool, riempi gli slot vuoti in ordine
   (girone per girone, posizione per posizione).
5. GroupTeam.seed = team.livello per ogni squadra piazzata.
6. Costruisci warnings[] (vedi sotto).

Output: { gironi: GroupDraft[], warnings: string[] }
```

### Firma

`distribuisciGironi1(squadre: Team[]): { gironi: GroupDraft[]; warnings: string[] }`

(prima ritornava `GroupDraft[]`). `generaMatchGironi1` continua a ricevere `GroupDraft[]`.

### Vincoli preservati

- Validazioni esistenti: `< 2` squadre → throw; `> 36` squadre → throw.
- Numero gironi (12), dimensione girone (3), slot vuoti → ghost/walkover 6-0 come oggi
  (logica in `generaMatchGironi1` invariata).

### Regole warnings

Genera un warning quando la distribuzione ideale (12 per fascia) non è rispettata:

- Conteggio di una fascia ≠ 12, es. `"Fascia 1: 9 squadre (attese 12)"`.
- Presenza di squadre con `livello = 0` o `livello > 3`, es.
  `"4 squadre senza testa di serie valida distribuite casualmente"`.

I warning sono puramente informativi: non bloccano il sorteggio.

## API — `src/app/api/tornei/[id]/sorteggio/route.ts`

- Usa il nuovo ritorno: `const { gironi, warnings } = distribuisciGironi1(squadre)`.
- Nel `create` dei `groupTeams` salva `seed: t.seed` (già presente; ora `t.seed` arriva
  valorizzato dall'algoritmo).
- Aggiunge `warnings` al JSON di risposta finale:
  `return NextResponse.json({ ...result, warnings })`.

## UI

### `src/app/admin/torneo/page.tsx`
- Dopo il sorteggio, se `response.warnings?.length`, mostrarli all'utente (alert/toast
  inline). Il sorteggio è comunque andato a buon fine.

### `src/app/admin/squadre/page.tsx`
- Limitare l'input "Testa di serie" a `0-3`:
  - `<input type="number" min={0} max={3} ...>`
  - clamp in `parseInt(form.livello, 10)` → `Math.min(3, Math.max(0, n))`.

## Test — `src/lib/gironi.test.ts`

Aggiungere casi per `distribuisciGironi1`:

1. **36 bilanciato (12/12/12):** ogni girone contiene esattamente un livello 1, un 2,
   un 3; `warnings` vuoto; `seed` propagato.
2. **Sbilanciato (es. 12/9/12):** best-effort, 3 gironi senza fascia 2; warning su
   fascia 2.
3. **Con tds=0:** squadre a livello 0 distribuite nel pool extra; warning emesso.
4. **Overflow (es. 15 in fascia 1):** primi 12 nei gironi per fascia, i 3 in eccesso
   nel pool di riempimento; warning.
5. **Regressione:** `< 2` throw, `> 36` throw ancora validi.

## Componenti NON toccati

- `GironiView`, `GironiAnimation`, `MatchLiveClient`: già leggono/mostrano `seed`.
  La valorizzazione di `GroupTeam.seed` li attiva senza modifiche.
- `genera-gironi-2`, `genera-finali`: fasi successive, fuori ambito.
