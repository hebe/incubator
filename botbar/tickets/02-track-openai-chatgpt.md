# V2: Track OpenAI / ChatGPT usage & status

**Labels:** `enhancement`, `botbar`, `v2`, `needs-research`
**Milestone:** V2 (multi-provider)

## Summary
Extend Botbar beyond Claude to show OpenAI / ChatGPT usage alongside it, so the menubar becomes a single "AI capacity" dashboard.

## Motivation
Botbar's architecture is already provider-agnostic under the hood (a `UsageSnapshot` with windows). Adding OpenAI means generalizing the model into multiple provider "lanes" and rendering a segment per provider.

## Open questions / research needed
ChatGPT (the consumer subscription) does **not** expose a documented usage/quota API the way we reverse-engineered `/api/oauth/usage` for Claude. Investigate, in order of preference:
1. **Platform API (api.openai.com):** exposes billing/usage for **API** accounts (`/v1/usage`, `/dashboard/billing/usage`) — but that's pay-as-you-go API usage, *not* ChatGPT Plus/Pro subscription message limits. Useful only if the user has API spend to track.
2. **ChatGPT session/backend endpoints:** the chatgpt.com web app calls internal endpoints for rate-limit state. These are undocumented, auth'd via session cookie / bearer, and can break without notice. Feasible but fragile — same reverse-engineering approach we used for Claude Code.
3. **Manual entry / no-limit-API fallback:** if no reliable limit signal exists, show plan + renewal date only, or let the user log usage manually.

## Scope (once data source is chosen)
- Add a `Provider` abstraction: `{ id, displayName, accentColor, fetch() -> UsageSnapshot }`.
- Refactor `AppState` to hold `[Provider: UsageSnapshot]`.
- Menubar: either a combined ring (worst-case across providers) or a compact multi-segment glyph; make it a setting.
- Panel: one section per provider, each with its own auth + sign-in flow.
- Per-provider auth stored in separate keychain items.

## Acceptance criteria
- [ ] Decide + document the OpenAI data source (with its reliability caveats).
- [ ] Provider abstraction landed; Claude refactored onto it (no regression).
- [ ] OpenAI lane shows at least plan + renewal; usage windows if a source exists.
- [ ] Independent sign-in / sign-out per provider.

## Dependencies
Best done after the `Provider` refactor, which also unblocks #03 (Midjourney).
