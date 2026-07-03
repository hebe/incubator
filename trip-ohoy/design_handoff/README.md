# Handoff: Vacation Planner App ("Daily Menu" Trip Planning)

## Overview

Build a **vacation planner app**. The core idea: a trip is planned as a **"daily menu"** — not a rigid itinerary but a bank of activity cards the user mixes and matches per day, based on energy, weather, and mood. The app must make it easy to plan before the trip AND to re-plan on the fly during it (rain, tiredness, changed minds).

This generalizes an existing single-trip prototype (Mauritius, included as design reference) into a multi-trip product:

1. **Trips** — the user creates trips: destination, start date, end date. A trip owns everything below.
2. **Per-trip planner** — each trip gets the planner experience shown in the prototype: a desktop kanban board of days + activity bank, and a mobile day-by-day list.

## About the Design Files

The files in this bundle are **design references created in HTML** (`Mauritius-planner.dc.html` + its `support.js` runtime — open the HTML directly in a browser to interact with it). They are prototypes showing intended look and behavior, **not production code to copy**. The author explicitly wants you to do the scaffolding, architecture, and code choices from scratch: **recreate the design in whatever stack you judge best for this product** (they have no existing codebase). Do not port the prototype's rendering approach, state handling, or file structure — only its UX, layout, and visual language.

## Fidelity

- **Planner views (board, mobile day list, activity detail modal): high-fidelity.** Recreate the look closely — colors, spacing, type, badges, interactions are intentional and were iterated with the user.
- **Everything that is new in this brief (trip list, trip creation, multi-trip navigation, custom activity creation): unspecified.** Design these yourself in the same visual language (tokens below). Keep them as clean and functional as the planner.

**UI language: Norwegian (bokmål).** All prototype copy is Norwegian; keep it that way (i18n architecture is a bonus, not a requirement).

## Product Model

### Trip
- Destination name (e.g. "Mauritius")
- Start date, end date → the app derives the day columns (the prototype hardcodes 31 Jul–9 Aug 2026 = 10 days; the real app must generate days from the date range)
- One or more **bases** (places you stay). The prototype has two ("Grand Baie" / "Sørvest"); each day is assigned to a base via a tappable chip, letting the user plan a mid-trip relocation. Generalize: a trip has a user-defined list of bases; each day points at one.
- A **minimap**: the prototype uses a hand-drawn SVG outline of Mauritius with percentage-positioned pins. For the real app decide on an approach that generalizes to any destination (e.g. a small static map image/tile with lat-lng pins, or a lightweight map library). The point of the minimap is *at-a-glance orientation inside the detail view*, not full mapping.

### Activity (belongs to a trip's activity bank)
- Emoji icon, name
- Category — prototype set: Vann, Natur & eventyr, Severdighet, Hvile, Mat, Shopping. Each has a fixed color used for card left-borders and dots. Consider letting users add categories per trip.
- Duration label (e.g. "Hel dag", "Halvdag", "2 timer", "1 time")
- Energy level: Lav / Middels / Høy (rendered as a small colored dot: green/amber/red)
- Weather suitability: `good` (☀️ krever godt vær), `rainy` (🌧️ bra på regndag), or `any`
- Needs car: boolean (🚗 badge)
- **Reusable flag** — the key mechanic:
  - *One-time activities* (boat trip, safari park…) can be placed on only ONE day; once placed they show "✓ Planlagt" in the bank and are dimmed/unaddable until removed.
  - *Reusable activities* (beach day, dinner out, grocery run…) show a ↻ mark and can be added to any number of days.
- Location: place label + map position (for the minimap pin)
- **Notes** (free text) and **links** (list of {label, url}) — per activity, shared across all placements of a reusable activity.

Users must be able to **create and edit their own activities** (the prototype ships a fixed catalog; the real app cannot).

### Day plan
- Ordered list of activity placements per day
- Derived per day: 🚗 indicator if any placed activity needs a car; a mood chip — "Aktiv dag" (any Høy), "Balansert dag" (any Middels), "Rolig dag" (all Lav) — color-coded red/blue/green tints.

## Screens / Views

### 1. Trip list + creation (new — design it)
- Entry point: list of trips (destination, dates, maybe day count). Create-trip flow asks: destination, leaving date, return date, base(s).
- Opening a trip lands on the planner.

### 2. Overview board (desktop) — see prototype
- **Sticky header**: destination wordmark (uppercase, letterspaced, deep blue), subtitle "Familieferie · 31. juli – 9. august 2026" style dates; summary pills (📋 total activities, 🚗 number of car days); a two-tab segmented control "Oversikt / Dagsliste".
- **Day columns** in a horizontally scrolling row, 234px wide each. Column header: weekday (small caps grey) + date (bold), base chip (📍 Grand Baie — tinted per base, click cycles base), 🚗 if needed. Body: stacked activity cards. Footer: mood chip + "+ Legg til" button.
- **Selected day**: clicking a column header selects it (blue ring). Cards clicked in the bank are added to the selected day.
- **Activity cards (placed)**: white card, 1px border, 3px left border in category color, emoji + name + "duration · energy" meta line with energy dot, badges row (🚗 Bil / ☀️ Godt vær / 🌧️ Regndag), × remove button, › affordance; click opens detail.
- **Drag & drop**: bank cards drag into day columns (column shows green dashed highlight on drag-over). Click-to-add must also work (explicit user requirement — both paths).
- **Activity bank** below the columns: section header explains the interaction, legend (☀️ / 🌧️ / 🚗 / ↻), category filter chips (pill chips with category color dot; active chip solid dark blue), responsive card grid (`repeat(auto-fill, minmax(228px, 1fr))`). Bank cards: same anatomy as placed cards plus ⓘ detail button top-right; one-time activities already placed are dimmed at 50% opacity, desaturated, with a "✓ Planlagt" pill.
- Empty day columns show a dashed "Tom dag" placeholder.

### 3. Day list (mobile) — see prototype
- Single column, max-width 560px, day sections separated by a 2px bottom-border header: date (18px bold) + weekday, then mood chip + base chip + 🚗 on the right.
- Activity rows: larger cards (4px category left border, 12px radius), emoji 22px, name 14.5px semibold, meta + badges. Tap opens detail; × removes.
- "+ Legg til aktivitet" full-width button per day → opens the **picker modal**: bottom-sheet-like modal listing the bank (same filter chips), rows with a + button; already-placed one-time items show "✓ Planlagt". Modal stays open for multi-add; "Ferdig" closes.
- This view is the on-trip companion — optimize for glanceability and thumb reach; hit targets ≥ 44px.

### 4. Activity detail modal — see prototype
- Opened from any card. Header: emoji (30px) + name (18px bold), category chip w/ dot, meta, ↻ marker, badges; × close.
- **Minimap block**: 168×218 rounded panel, sea gradient background, island silhouette (light green fill, muted green stroke), category-colored pin with white ring + soft halo at the activity's location. Beside it: "Hvor på Mauritius" label, 📍 place name, "🗺️ Åpne i Google Maps ↗" button (deep-link search for the place name + destination).
- **Lenker & info**: list of saved links (label + hostname, opens new tab, × to delete) + add-row: title input (optional), URL input, "Legg til" button; Enter submits; bare domains get `https://` prefixed; empty label falls back to hostname.
- **Notater**: autosaving textarea, placeholder "Bookingdetaljer, hva å huske, hvem som ble anbefalt det, tider, priser…".

## Interactions & Behavior

- Add activity: drag bank→column, click bank card (adds to selected day), or picker modal (mobile). Reusable can repeat; one-time cannot.
- Remove: × on any placed card (stopPropagation vs. the card's open-detail click).
- Base chip click toggles/cycles the day's base.
- All mutations **persist immediately** (the prototype uses localStorage; the real app should use a proper local store or backend — user's choice of stack, but data must survive reloads and ideally sync across the user's devices, since planning happens on desktop and usage on phone).
- Card hover: subtle lift (`translateY(-1px)` + shadow) on bank cards; border tint on placed cards. Transitions ~120ms.
- Modals: dark scrim `rgba(35,32,28,0.4)`, click-outside closes, 18px radius panel, large soft shadow.

## Design Tokens

The prototype uses **oklch** colors throughout. Key values:

- Page background: `oklch(0.97 0.008 85)` (warm off-white); surfaces `oklch(0.995 0.004 90)`; borders `oklch(0.9 0.01 85)`
- Text: primary `oklch(0.26 0.012 70)`, secondary `oklch(0.52 0.012 70)`, faint `oklch(0.72 0.01 80)`
- Brand/accent (deep blue): `oklch(0.34 0.06 220)`; action buttons `oklch(0.42 0.06 230)` on white text
- Category colors: Vann `oklch(0.58 0.11 230)` · Natur `oklch(0.56 0.11 150)` · Severdighet `oklch(0.55 0.11 300)` · Hvile `oklch(0.66 0.08 70)` · Mat `oklch(0.62 0.13 45)` · Shopping `oklch(0.58 0.06 255)`
- Energy dots: Høy `oklch(0.62 0.16 30)`, Middels `oklch(0.74 0.13 75)`, Lav `oklch(0.64 0.1 150)`
- Base chips: north `oklch(0.42 0.08 220)` on `oklch(0.93 0.03 220)`; south/west `oklch(0.46 0.11 45)` on `oklch(0.94 0.045 45)`
- Mood chips: Aktiv `oklch(0.5 0.13 35)` on `oklch(0.95 0.045 35)`; Balansert `oklch(0.46 0.09 230)` on `oklch(0.95 0.03 230)`; Rolig `oklch(0.45 0.09 150)` on `oklch(0.95 0.035 150)`
- Typography: **Schibsted Grotesk** (Google Fonts), weights 400–700. Body 13–14.5px, meta 11–12px, headers 15–20px.
- Radii: chips 20px (pill), small cards 8px, cards 10–12px, modals 18px. Left accent borders: 3px (column cards) / 4px (bank & list cards).
- Emoji are used as activity icons deliberately — keep that; no icon library needed for activity glyphs.

## State Management (functional requirements, not prescriptions)

- Trips: CRUD; active trip selection.
- Per trip: activity catalog (CRUD), day list derived from dates, placements (add/remove; consider reorder-within-day as a nice-to-have), per-day base assignment, per-activity notes/links.
- View state: board/list tab, category filter, selected day, open modals.
- Derived: per-day car flag + mood, per-trip totals (activity count, car-day count — useful for deciding car-rental span, one of the user's stated goals).

## Assets

None external. Fonts from Google Fonts (Schibsted Grotesk). The Mauritius island silhouette in the prototype is an inline SVG path — treat as placeholder; choose a real minimap approach for arbitrary destinations.

## Files

- `Mauritius-planner.dc.html` — the interactive prototype (both views, picker, detail modal). Open in a browser; requires `support.js` alongside.
- `support.js` — runtime for the prototype file. Reference only; irrelevant to your implementation.
