# Desktop widget (WidgetKit)

**Labels:** `enhancement`, `botbar`, `blocked:xcode`
**Milestone:** V1.1

## Summary
Add a macOS desktop/Notification Center widget that surfaces the most important Botbar info at a glance, without opening the menubar dropdown.

## Why
The menubar ring is great for a quick peek, but a widget gives an always-visible readout on the desktop or in Notification Center — useful during heavy sessions.

## Scope
- Small + medium widget sizes.
- **Small:** the primary usage ring (most-consumed of session/week) + percentage + reset countdown.
- **Medium:** session ring + weekly bar + subscription renewal line.
- Match the app's clay/amber/alert palette and SF Pro styling.
- Refresh via `TimelineProvider` (every ~15 min; WidgetKit budgets aggressive refresh).

## Blocker / prerequisite
WidgetKit requires a full **Xcode** project (app extension target, `WidgetBundle`, provisioning) — it cannot be built with the current `swiftc` + hand-assembled bundle pipeline. Two paths:
1. Migrate Botbar to an `.xcodeproj` (or an SPM project opened in Xcode with an app-extension target).
2. Keep the CLI build for the main app and add a separate Xcode target only for the widget.

## Acceptance criteria
- [ ] Widget appears in the widget gallery.
- [ ] Small + medium sizes render live usage from the shared token (App Group keychain share with the main app).
- [ ] Tapping the widget opens Botbar.
- [ ] Visual parity with the menubar panel.

## Notes
Shipped V1 deferred this (per project decision) because Xcode isn't installed on the build machine. An interim **floating always-on-top panel** (pure AppKit, no Xcode) is a possible fallback if a true widget stays blocked.
