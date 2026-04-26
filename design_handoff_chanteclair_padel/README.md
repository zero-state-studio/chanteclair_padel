# Handoff: Chanteclair Padel Cup — Site Redesign

## Overview

Restyling completo del sito **chanteclair-padel.vercel.app** per renderlo coerente con un torneo sportivo (Chanteclair Padel Cup, 13 giugno 2026, Sant'Agata Bolognese). Il sito attuale ha un'estetica minimale/editoriale che non comunica l'energia di un torneo; il nuovo design adotta un linguaggio sportivo, condensato e impattante, ispirato alla locandina dell'evento (`reference-poster.jpeg`).

Pagine in scope:
1. **Homepage** — hero impattante, due tornei (M/F), CTA iscrizione
2. **Tabelloni** — bracket a eliminazione diretta, sempre completamente visibile, focus di default sui match in esecuzione

## About the Design Files

I file HTML/JSX in questo bundle sono **riferimenti di design**, non codice da copiare in produzione. Sono prototipi React standalone (Babel in-browser, nessun build step) che mostrano il look-and-feel desiderato e i comportamenti chiave.

Il task è **ricreare questi design nel codebase esistente** (Next.js + Vercel) seguendo i pattern già stabiliti del progetto. Se il codebase non ha un design system, scegliere lo stack più appropriato (Tailwind consigliato per matchare velocemente i token).

## Fidelity

**High-fidelity (hifi)** — Le mockup contengono colori, tipografie, spaziature e interazioni finali. Da ricreare pixel-perfect.

## Direzione scelta

Direzione approvata: **"Iper-energica"** (definita in `variant-energica.jsx`, renderizzata da `Homepage.html`). Era una di tre varianti esplorate; le altre due sono state scartate.

## Come aprire i file

I due HTML caricano JSX via Babel in-browser e fetchano i `.jsx` adiacenti. **Aprirli con doppio click da `file://` può non funzionare in alcuni browser** (CORS sui file locali). Se vedi una pagina vuota, servili da un server locale:

```bash
cd design_handoff_chanteclair_padel
python3 -m http.server 8000
# poi apri http://localhost:8000/Homepage.html
```

Oppure usa `npx serve .` se hai Node.

---

## Design Tokens

Tutti i token sono definiti in `styles.css` come custom properties (`:root`). Si consiglia di trasferirli su Tailwind config o CSS variables nel codebase target.

### Colors

| Token | Value (oklch) | Approx. hex | Uso |
|---|---|---|---|
| `--night-deep` | `oklch(0.14 0.04 255)` | `#0e1424` | Background principale (homepage + tabelloni) |
| `--night` | `oklch(0.22 0.04 255)` | `#1c2440` | Card / sezioni secondarie |
| `--night-2` | `oklch(0.28 0.05 255)` | `#262f4d` | Bordi e divisori scuri |
| `--paper` | `oklch(0.985 0.005 95)` | `#fbfaf6` | Testo su sfondo scuro / sfondo light |
| `--paper-2` | `oklch(0.95 0.01 95)` | `#f1efe8` | Background secondario light |
| `--ink` | `oklch(0.18 0.03 255)` | `#161d2e` | Testo su sfondo light |
| `--line` | `oklch(0.88 0.01 255)` | `#dadbe0` | Bordi su light |
| `--yellow` | `oklch(0.86 0.18 95)` | `#ecd24a` | Accento primario (CTA, highlight LIVE) |
| `--yellow-2` | `oklch(0.78 0.18 80)` | `#d4a82e` | Accento giallo scuro |
| `--red` | `oklch(0.6 0.2 25)` | `#d04a2a` | Logo + accent rosso |
| `--pink` | `oklch(0.66 0.22 0)` | `#e34770` | Torneo Femminile |
| `--blue` | `oklch(0.62 0.18 250)` | `#5a7fde` | Torneo Maschile |

### Typography

```
--display: "Bebas Neue", "Anton", "Oswald", Impact, sans-serif;
--sans:    "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
--mono:    ui-monospace, "JetBrains Mono", "Menlo", monospace;
```

**Caricamento Google Fonts** (in `<head>`):
```html
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
```

**Scale d'uso (Variante C):**
- **Display XXL** (hero "Padel Cup"): `clamp(180px, 26vw, 400px)`, line-height 0.82
- **Display XL** ("Chanteclair"): `clamp(120px, 17vw, 260px)`, line-height 0.84, text-shadow `0 6px 0 var(--night-deep)`
- **Display L** (titoli sezione, numeri stat): 96px, line-height 0.9
- **Display M** (sub-headline gialla): 44px
- **Display S** (CTA, label): 22-32px, letterSpacing 0.04em, uppercase
- **Body**: Inter 14-17px, line-height 1.5
- **Mono** (metadata, eyebrows): 11px, letterSpacing 0.08em, uppercase

### Spacing

Padding di sezione standard: `60-80px verticale × 40px orizzontale`
Padding card: `18-32px`
Gap tra elementi: `12 / 16 / 24 / 36 / 60px`

### Border radius

Praticamente assente — il design è "blocky", squadrato, sportivo. Eccezioni:
- Logo: `border-radius: 50%`
- Status dot LIVE: `border-radius: 50%`

### Shadows

- Card hover: `0 20px 60px rgba(0,0,0,0.4)` (raro, solo su elementi flottanti)
- Match LIVE glow: `0 0 0 4px oklch(0.30 0.05 255), 0 0 24px var(--blue/pink)55`
- Hero text: `text-shadow: 0 6px 0 var(--night-deep)` (effetto "stamp" sportivo)

---

## Screen 1 — Homepage (Variante C "Iper-energica")

File di riferimento: `variant-energica.jsx`

### Layout (top → bottom)

1. **Top marquee** (giallo, h~42px) — ticker animato, scroll orizzontale infinito 22s, contenuto `★ Iscrizioni aperte · 13.06.2026 · Sant'Agata Bolognese ·` ripetuto. Background `var(--yellow)`, testo `var(--night-deep)`, font display 22px.

2. **Header** (h~84px) — flex space-between, padding `20px 40px`:
   - Logo placeholder circolare rosso (44×44, "C" bianca in Bebas) + wordmark "Chanteclair" (display 24px)
   - Nav: Tornei · Premi · Programma · Tabelloni (sans 14px, bianco)
   - CTA "Iscriviti ora →" (button giallo, display 18px)

3. **Hero** (min-height 720px, padding `30px 40px 60px`):
   - Background a strisce diagonali: `repeating-linear-gradient(115deg, transparent 0 80px, oklch(0.18 0.04 255) 80px 81px)` opacity 0.6
   - Slash gialla diagonale (`var(--yellow)`, h180px, rotate -6deg, posizionato top:30%, full-width +20%)
   - Eyebrow rosso: badge piatto `var(--red)` con `◆ Sabato 13 Giugno 2026 · Open Padel S.A.B.`
   - **H1 stack** (z-index 3):
     - "Chanteclair" — display, `clamp(120px, 17vw, 260px)`, color `var(--paper)`, text-shadow `0 6px 0 var(--night-deep)`
     - "Padel Cup" — display, `clamp(180px, 26vw, 400px)`, color `var(--night-deep)` (sì, scuro su sfondo scuro — emerge solo grazie alla slash gialla dietro)
   - Sub-headline (display 44px): "Due tornei, [paper] un'unica grande [/paper] giornata di sport." — riga centrale in `var(--paper)`, le altre in `var(--yellow)`
   - 2 CTA: "Iscrivi la coppia →" (giallo) + "Programma" (ghost bianco)

4. **Stat strip** (background paper, h~200px, padding `32px 40px`):
   - 4 colonne: `64 Coppie iscritte` · `8 Campi attivi` · `12h Sport non-stop` · `2K€ Montepremi totale`
   - Numero in display 96px, label in mono 11px sotto
   - Bordo sinistro 1px tra colonne

5. **Sezione "I due tornei"** (split 50/50, h~420px):
   - Sinistra: bg `var(--blue)`, "Maschile" display 220px, eyebrow mono "Torneo · 01 / 02"
   - Destra: bg `var(--pink)`, "Femminile" display 220px, eyebrow "Torneo · 02 / 02"
   - Su entrambe: sub "32 coppie · Tabellone live", CTA giallo "Iscrivi →"
   - Lettera enorme decorativa (M / F) in basso a destra, opacity 0.10, font 520px

6. **Bottom CTA** (bg night-deep, padding 60×40, center-aligned):
   - Eyebrow giallo `◆ Le iscrizioni chiudono il 5 giugno`
   - Display gigante giallo `clamp(80px, 12vw, 180px)`: "Pronto a giocare?"
   - CTA giallo "Iscriviti adesso →" (display 28px, padding 20×36)

7. **Bottom marquee** — identico al top marquee.

### Interazioni

- **Marquee**: animation `cc-marquee 22s linear infinite` (definita in `styles.css`)
- **CTA hover**: `transform: translateY(-1px)` + cambio background paper
- **Ghost button hover**: invertito (background diventa `currentColor`, testo `var(--night-deep)`)

### Routing

- "Tabelloni" in nav e "Tabellone live" sulle card torneo → `/tabelloni`
- Tutte le CTA "Iscriviti" → `/iscrizione` (page non designata, scope futuro)

---

## Screen 2 — Tabelloni

File di riferimento: `tabelloni.jsx`

### Requirements chiave

1. **Layout fullscreen**: `height: 100vh`, NO scroll della pagina. Il bracket deve stare SEMPRE completamente nel viewport.
2. **Default focus sui match LIVE**: appena la pagina si apre, l'attenzione va ai match in corso (striscia in alto + evidenziazione sul bracket).
3. **Auto-scale**: il bracket si misura con `getBoundingClientRect` e applica un `transform: scale(s)` per fittare lo stage residuo (`ResizeObserver` su resize).

### Layout (grid-rows: auto auto auto 1fr)

1. **Header** (~64px, padding `14px 32px`, bg `oklch(0.16 0.04 255)`):
   - Logo + wordmark "Chanteclair Padel Cup" + sub mono "Tabelloni · 13.06.2026"
   - **Tab Maschile / Femminile**: pill segmented control, attivo bg `var(--blue)` o `var(--pink)`, display 22px
   - "● Aggiornato in tempo reale" (dot verde pulsante)
   - "← Home" (link mono)

2. **Live strip** (~110px, bg `linear-gradient(90deg, accent22, transparent 60%)`):
   - Sinistra: dot giallo grosso pulsante + "In esecuzione" display 26px giallo + count "{N} match · ora 14:42"
   - Destra: griglia di card (1 per match live), ognuna mostra:
     - mono "M3 · Campo 3"
     - 2 righe nome coppie (display 16px)
     - punteggio live grande giallo "5-4 · —" (display 22px)
     - badge "● LIVE" mono accent

3. **Round labels strip** (~50px, padding `10px 32px`, 4 colonne):
   - "Ottavi · 14:30 · 8 match" / "Quarti · 16:00 · 4 match" / "Semifinali · 17:30 · 2 match" / "Finale · 19:30 · 1 match" (in giallo)

4. **Bracket stage** (`flex: 1`, `overflow: hidden`):
   - Container `width: 1280px`, `transform: scale(s)`, `transform-origin: center center`
   - **Grid 4 colonne**: `1.5fr 1.2fr 1fr 1fr`
     - Col 1 — Ottavi (8 card, flex column gap 4)
     - Col 2 — Quarti (4 card big, flex column space-around gap 4)
     - Col 3 — Semifinali (2 card big, flex column space-around gap 4)
     - Col 4 — Finale (1 card grande, wrappata in cornice gradient `linear-gradient(135deg, accent, yellow)` con padding 4px, label "★ FINALE" giallo + "Trofeo Chanteclair" giallo)

### Match card (componente `<Match>`)

```
+---------------------------+
| M1 · C1          ● LIVE   |  ← mono 9px
|---------------------------|
| ROSSI / BIANCHI           |  ← display 13px (16/18 se big)
|     ────────              |  ← divider 1px
| VERDI / NERI              |
|---------------------------|
| 6-4 · 3-2                 |  ← mono 10px giallo (solo se live/done)
+---------------------------+
```

**Stati visuali:**
- **Default** (pending/next): bg `oklch(0.24 0.05 255)`, border 1px `oklch(0.32 0.05 255)`
- **Hover** (focused): bg `oklch(0.32 0.05 255)`, border 1.5px accent (blue/pink in base al tab)
- **Live**: bg `oklch(0.30 0.05 255)`, border 1.5px accent, **boxShadow `0 0 0 4px oklch(0.30 0.05 255), 0 0 24px {accent}55`** (glow), badge "● LIVE" giallo con dot pulsante
- **Done**: opacity 0.65, perdente in grigio, badge "✓" verde, score in `oklch(0.7 0.02 255)`
- **Next**: badge orario es. "15:30" in mono grigio

Nome coppie: `whiteSpace: nowrap`, `overflow: hidden`, `textOverflow: ellipsis` (le card scalate possono essere strette).

### Interazioni

- **Hover su match nella live strip** → evidenzia lo stesso match nel bracket (state condiviso `focused`).
- **Click tab M/F** → cambia dataset, ricalcola scale dopo render.
- **Window resize / panel resize** → `ResizeObserver` ricalcola scale.

### Animazioni (definite inline in `<style>`)

```css
@keyframes live-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.8); }
}
```
Durata 1.4s ease-in-out infinite, applicata ai dot LIVE.

```css
@keyframes cc-marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
```
Durata 22s linear infinite (fast) o 40s (default).

### Data shape

```ts
type Match = {
  code: string;        // "M1", "F3", "Q2", "S1", "F1"
  a: string;           // "Rossi / Bianchi"
  b: string;           // "Verdi / Neri"
  court: string;       // "C1" | "Centrale" | "—"
  score: string;       // "6-4 · 3-2" | "—"
  status: "live" | "done" | "next" | "pending";
  winner?: 0 | 1;      // solo se status === "done"
  time?: string;       // solo se status === "next", es. "15:30"
};
```

Vedi `tabelloni.jsx` (costante `COUPLES`) per dataset di esempio. In produzione: data fetch da API, polling ogni 15-30s (o websocket per veri update live).

---

## State Management

### Homepage
Statica — nessuno state se non eventuali toggle dei tweaks (non in scope produttivo).

### Tabelloni
- `tab: "M" | "F"` — categoria attiva
- `focused: string | null` — codice match evidenziato (hover sincronizzato strip ↔ bracket)
- `scale: number` — fattore di transform per il bracket, calcolato in useEffect

In un'app reale: `tab` può essere routing param (`/tabelloni/maschile`), i match arrivano da API.

---

## Assets

- **Foto**: tutti placeholder a strisce diagonali con label monospace (`.cc-ph` in `styles.css`). Il cliente fornirà foto reali successivamente. Tre toni disponibili: default (chiaro), `data-tone="dark"`, `data-tone="yellow"`.
- **Logo**: placeholder circolare rosso con iniziale "C" in Bebas. **Il cliente fornirà il logo SVG vero del galletto Chanteclair** — quando arriva, sostituire il `<span class="cc-logo">` ovunque.
- **Locandina riferimento**: `reference-poster.jpeg` — usarla come moodboard per palette ed energia, NON come asset del sito.

---

## Files

| File | Scopo |
|---|---|
| `Homepage.html` | Pagina principale (variante Iper-energica) |
| `Tabelloni.html` | Pagina tabelloni fullscreen |
| `styles.css` | Design tokens (CSS vars), classi utility (`.cc-display`, `.cc-mono`, `.cc-btn`, `.cc-ph`, `.cc-logo`, `.cc-ticker`) |
| `variant-energica.jsx` | Componente React della homepage |
| `tabelloni.jsx` | Componente React del bracket |
| `reference-poster.jpeg` | Locandina dell'evento — moodboard |

---

## Note finali per l'implementazione

1. **Stack consigliato**: Next.js (già usato dal sito attuale) + Tailwind. I CSS vars in `:root` si trasferiscono direttamente in `tailwind.config.js`.
2. **Bebas Neue** è gratuita su Google Fonts, va bene per produzione. Per Inter idem.
3. **Accessibility**: i contrasti yellow-on-night-deep sono OK (AAA). Lo "scuro su scuro" del titolo "Padel Cup" funziona solo perché ha la slash gialla dietro — assicurarsi che la slash sia ARIA-hidden e il titolo abbia sufficiente contrasto col background reale che lo copre.
4. **Performance**: l'auto-scale del bracket usa `transform`, non layout-affecting. Va bene a 60fps. Il `ResizeObserver` è già modernamente supportato.
5. **Mobile**: i mockup sono desktop-first. Adattare:
   - Hero homepage: ridurre `clamp()` minimi, stack verticale per CTA
   - Stat strip: 2×2 invece di 4×1
   - Sezione tornei: stack verticale full-width
   - Tabelloni: aggiungere scroll orizzontale o vista alternativa "lista match" su <768px (i bracket non sono leggibili su schermi piccoli)
