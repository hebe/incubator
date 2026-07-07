# Botbar

A tiny, native macOS **menubar app** for keeping an eye on your personal Claude
subscription usage. A ring in the menubar fills up as you consume your limits;
click it for a clean dropdown with your current session, weekly limits, reset
countdowns, and subscription renewal.

Built to feel like something Apple and Anthropic made together — SF Pro, system
materials, and Anthropic's clay palette.

![menubar ring → dropdown panel](docs/preview.png)

## What it shows

- **Menubar glyph** — a ring that fills clockwise with your most-consumed window
  (session or weekly), tinted clay → amber → red as you approach the limit.
  Hover for a tooltip.
- **Dropdown panel** — a hero ring for the primary limit plus bars for:
  - Current session (5-hour window) with reset countdown
  - Weekly (7-day) window
  - Weekly Opus / Sonnet sub-limits (when present)
  - Overage (when in use)
  - Subscription type + renewal countdown
- **Raw JSON** — a debug toggle in the footer showing exactly what the API
  returned, so the field mapping can be tuned against your real account.

## How it works

Botbar reads the same usage endpoint Claude Code uses —
`GET https://api.anthropic.com/api/oauth/usage` — authenticated with an OAuth
token for your **personal** claude.ai account.

It runs its **own** OAuth login (PKCE, manual code paste) and stores its **own**
token in the macOS keychain (`com.botbar.credentials`). It never reads or writes
Claude Code's credentials, so you can run Claude Code signed into a *work*
account while Botbar watches your *personal* one. The token auto-refreshes.

## Requirements

- macOS 14+
- Swift toolchain (Command Line Tools is enough — full Xcode **not** required)

## Build & run

```bash
./build-app.sh            # produces build/Botbar.app (release, ad-hoc signed)
open build/Botbar.app     # launches into the menubar
```

Install it for everyday use:

```bash
cp -r build/Botbar.app /Applications/
```

To have it start at login, add it in **System Settings → General → Login Items**.

For development iteration you can skip the bundle:

```bash
swift run
```

### First launch

1. Click the menubar ring → **Sign in with Claude**.
2. **Open in browser** → authorize on claude.ai.
3. Copy the code claude.ai shows you (format `code#state`) and paste it back.
4. **Connect.** Usage appears within a couple of seconds and refreshes every few
   minutes (configurable via the `refreshIntervalSeconds` default).

## Using it across multiple Macs

Botbar stores its token in the local keychain, so sign in once per machine.
Nothing syncs between Macs by design (the token is machine-local).

## Notes on the data

The `/api/oauth/usage` response shape was reverse-engineered from the Claude Code
binary. Field names for the usage windows (`five_hour`, `seven_day`,
`seven_day_opus`, `seven_day_sonnet`, `overage`, each with `used_percentage` and
`resets_at`) are confirmed; the envelope is decoded defensively in
`UsageModels.swift` and the subscription-renewal fields from `/api/oauth/profile`
are best-effort. If anything looks off, open the **Raw JSON** panel and adjust
the mapping — the decoder is built to tolerate variation.

## Roadmap

See [`tickets/`](tickets) for the V1.1 / V2 backlog:

- **Desktop widget** (WidgetKit — needs Xcode) — `tickets/01-desktop-widget.md`
- **Track OpenAI / ChatGPT** — `tickets/02-track-openai-chatgpt.md`
- **Track Midjourney** — `tickets/03-track-midjourney.md`

## Project layout

```
Sources/
  main.swift          App entry, NSStatusItem + popover wiring
  AppState.swift       Observable state + polling loop
  Auth.swift           OAuth (PKCE) + token refresh
  Keychain.swift       Generic-password wrapper (own keychain item)
  UsageClient.swift    Calls /usage and /profile
  UsageModels.swift    Defensive decoding of the usage payload
  StatusIcon.swift     Draws the menubar ring glyph
  RingGauge.swift      Ring + bar SwiftUI components
  PanelView.swift      The dropdown UI
  LoginView.swift      The sign-in window
  DesignSystem.swift   Palette, metrics, date helpers
```
