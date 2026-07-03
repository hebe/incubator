# trip-ohoy

A vacation planner built around a **"daily menu"** idea: a trip is a bank of activity
cards you mix and match per day by energy, weather, and mood — a desktop kanban board for
planning before the trip, and a mobile day-by-day list for re-planning on the fly during
it. Prototype in the [incubator](../README.md) monorepo.

Rebuilt from a design handoff (see [`design_handoff/`](design_handoff) — open
`Mauritius-planner.dc.html` in a browser for the original reference).

**Stack:** SvelteKit (Svelte 5 runes) + TypeScript · Dexie (IndexedDB, local-first) ·
Leaflet minimap · Neon Postgres + Drizzle for sync (M3). Deployed as its own Vercel project
(Root Directory `trip-ohoy`).

## Run

```bash
npm install
npm run dev      # http://localhost:5173 → seeds a Mauritius trip, lands on the planner
npm run check    # svelte-check (typecheck)
npm run build    # production build (adapter-vercel)
```

The app is client-side / local-first: IndexedDB (via Dexie) is the source of truth, so
state survives reloads offline. SSR is disabled (`src/routes/+layout.ts`).

## Status — Milestone 1 (single-trip planner) ✅

- Desktop **board**: day columns, placed activity cards, activity bank, click-to-add **and**
  drag-and-drop, one-time vs reusable handling, per-day base chip / mood / car derivations.
- Mobile **day list** + add-activity **picker** modal (multi-add).
- **Detail modal**: Leaflet minimap pin, Google Maps deep link, links & notes (autosaving).
- A single **Mauritius** trip is seeded on first run (`src/lib/data/catalog.ts`).

Later milestones are tracked as GitHub issues on `hebe/incubator` (`[trip-ohoy]` prefix):
multi-trip + trip/activity CRUD (M2); Neon sync + auth + Vercel deploy (M3); polish
(Norwegian locale, category CRUD, reorder-within-day).

## Layout

```
src/lib/
  styles/tokens.css   oklch design tokens (font is the only deviation from the handoff)
  i18n/strings.ts     all UI copy (English; keyed for a later locale)
  types.ts            domain types (mirror the Dexie tables / future Neon schema)
  data/               catalog (categories + Mauritius seed), local (Dexie), derive (pure helpers)
  stores/planner.svelte.ts   rune state for one trip, write-through to Dexie
  components/         board, list, bank, modals, minimap
src/routes/
  +page.svelte              seeds + redirects to the trip (M2: trip list)
  trips/[id]/+page.svelte   the planner (board + list)
```

## Deploy (per incubator note-to-self)

Import the `incubator` repo as a new Vercel project, set **Root Directory = `trip-ohoy`**,
add an **Ignored Build Step** (`git diff --quiet HEAD^ HEAD -- trip-ohoy`), and (from M3)
add `DATABASE_URL` for the trip-ohoy Neon project to the Vercel env.
