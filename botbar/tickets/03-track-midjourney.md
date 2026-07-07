# V2: Track Midjourney usage & status

**Labels:** `enhancement`, `botbar`, `v2`, `needs-research`
**Milestone:** V2 (multi-provider)

## Summary
Add a Midjourney lane to Botbar showing fast-hours / relax usage and subscription status.

## Motivation
Midjourney's key metered resource is **Fast GPU hours** (plus Relax mode on higher tiers). Surfacing "fast hours remaining this cycle" in the menubar fits Botbar's core purpose.

## Open questions / research needed
Midjourney has **no public API** (as of now). Data sources to investigate:
1. **midjourney.com account endpoints:** the web dashboard (`/account`, `/app`) shows Fast Time Remaining and subscription renewal — backed by internal JSON endpoints, auth'd via session cookie. Reverse-engineerable like we did for Claude, but undocumented and fragile.
2. **Discord data:** the `/info` command returns fast-hours remaining, but scraping Discord programmatically is against ToS and impractical for a menubar app.
3. **Manual entry fallback:** let the user paste/refresh a value periodically, or just track the renewal date.

Preference: option 1 (account endpoint) if stable, else manual fallback.

## Scope
- Build on the `Provider` abstraction from #02.
- Midjourney lane: Fast GPU hours used/remaining as the primary window; Relax as secondary; renewal date.
- Accent color: Midjourney's blue/purple to visually distinguish the lane.
- Its own auth (session token / cookie) in a separate keychain item.

## Acceptance criteria
- [ ] Decide + document the Midjourney data source (with reliability caveats).
- [ ] Midjourney lane shows fast-hours remaining + renewal (or manual fallback).
- [ ] Independent sign-in / sign-out.
- [ ] Visual parity with other lanes.

## Dependencies
Depends on the `Provider` refactor introduced in #02.
