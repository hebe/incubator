# Botbar — setup on a personal Mac

Instructions for Claude Code (or a human) to build, run, and verify Botbar on a
Mac signed into a **personal** Claude (Pro/Max) account.

## Context you need

Botbar is a native macOS menubar app that shows Claude **subscription** usage
(current 5-hour session, weekly limits, resets, renewal). It runs its **own**
claude.ai OAuth login and stores its **own** token in its **own** keychain item
(`com.botbar.credentials`). It does **not** read Claude Code's credentials and is
unaffected by whatever account Claude Code itself uses. When you sign in through
the app, you authenticate as the personal account you want to monitor.

The one unverified piece: the app was built and compiled on a machine logged into
a **company/API** account, which does not expose subscription usage windows, so
the JSON field mapping was never confirmed against a real personal-account
response. Your job includes verifying that mapping and fixing it if the numbers
look wrong (see "Verify" below).

## 1. Prerequisites

- macOS 14 or later.
- Swift toolchain. Command Line Tools is enough (full Xcode NOT required):
  ```bash
  swift --version || xcode-select --install
  ```

## 2. Build

From the repo root:
```bash
cd botbar
./build-app.sh
open build/Botbar.app
```
This compiles with `swiftc`, assembles `build/Botbar.app`, ad-hoc signs it, and
launches it. A ring icon should appear in the menubar (no dock icon — it's a
menubar-only agent).

If Gatekeeper blocks it ("unidentified developer"), clear the quarantine flag:
```bash
xattr -dr com.apple.quarantine build/Botbar.app
```
Then `open build/Botbar.app` again (or right-click the app → Open).

## 3. Sign in

1. Click the menubar ring → **Sign in with Claude**.
2. **Open in browser** → authorize on claude.ai **as the personal account**.
3. Copy the code claude.ai shows (format looks like `code#state`) and paste it
   back into the app.
4. **Connect.** Usage should appear within a couple of seconds.

## 4. Verify (important — the mapping is unconfirmed)

After signing in, open the panel and click **Raw JSON** in the footer. Compare
what the API returned to what the UI shows:

- Do the **session (5h)** and **weekly (7d)** percentages look plausible and match
  what claude.ai shows under Settings → Usage?
- Is the **reset countdown** in the future and sensible?
- Is the **subscription renewal** line present and correct? (This comes from
  `/api/oauth/profile` and is the most likely field to be wrong or missing.)

If anything is blank, wrong, or mismatched, the raw JSON is the source of truth.
The decoding lives in `Sources/UsageModels.swift`:
- `UsageResponse` maps the top-level usage windows (`five_hour`, `seven_day`,
  `seven_day_opus`, `seven_day_sonnet`, `overage`). It already accepts the
  windows either at the root or nested under a `rate_limits` key, and accepts
  `used_percentage` or `utilization`.
- `ProfileResponse` maps subscription type + renewal date (best-effort).

Adjust the `CodingKeys` / field names in those structs to match the actual JSON,
then rebuild with `./build-app.sh`. Do NOT guess — read the Raw JSON first and
map to exactly the keys the server sent.

## 5. Keep it running

To start Botbar at login:
- Move it into Applications: `cp -r build/Botbar.app /Applications/`
- System Settings → General → Login Items → add Botbar.

The token is stored per-machine in the keychain, so you sign in once on this Mac.

## Troubleshooting

- **Ring stays hollow / "Fetching usage…"** — not signed in, or the fetch failed.
  Open Raw JSON and check for an error banner in the panel.
- **HTTP 401** — token expired and couldn't refresh; sign out (footer) and sign
  back in.
- **Numbers look wrong** — almost certainly the field mapping; follow step 4.
- **Logs** — run the binary in the foreground to see `NSLog` output:
  `build/Botbar.app/Contents/MacOS/Botbar`
