import SwiftUI

/// The dropdown shown when the menubar item is clicked.
struct PanelView: View {
    @ObservedObject var state: AppState
    @State private var showingDebug = false
    var onLogin: () -> Void
    var onQuit: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            header
            Divider().opacity(0.5)
            if !state.isLoggedIn {
                signedOut
            } else if let snap = state.snapshot {
                content(snap)
            } else {
                loading
            }
            if showingDebug {
                Divider().opacity(0.5)
                debugSheet
            }
            Divider().opacity(0.5)
            footer
        }
        .frame(width: Metrics.panelWidth)
        .background(.regularMaterial)
    }

    // MARK: Sections

    private var header: some View {
        HStack(spacing: 8) {
            Image(systemName: "sparkle")
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(Palette.clay)
            Text("Claude Usage")
                .font(.system(size: 13, weight: .semibold))
            Spacer()
            if state.isRefreshing {
                ProgressView().controlSize(.small)
            } else if state.isLoggedIn {
                Button {
                    Task { await state.refresh() }
                } label: {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: 11, weight: .semibold))
                }
                .buttonStyle(.plain)
                .foregroundStyle(.secondary)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    @ViewBuilder
    private func content(_ snap: UsageSnapshot) -> some View {
        VStack(spacing: Metrics.rowSpacing) {
            // Hero: primary window as a big ring.
            if let primary = snap.primary {
                HStack(spacing: 16) {
                    RingGauge(
                        fraction: primary.window.fraction,
                        lineWidth: 11,
                        label: "\(Int(primary.window.usedPercentage.rounded()))%",
                        sublabel: "used"
                    )
                    .frame(width: 84, height: 84)

                    VStack(alignment: .leading, spacing: 6) {
                        heroLine(primary.kind == .session ? "Current session" : "This week",
                                 primary.window)
                    }
                    Spacer()
                }
            }

            // Windows breakdown.
            VStack(spacing: 12) {
                UsageBar(title: "Current session (5h)", window: snap.fiveHour)
                UsageBar(title: "Weekly (7d)", window: snap.sevenDay)
                if snap.sevenDayOpus != nil {
                    UsageBar(title: "Weekly · Opus", window: snap.sevenDayOpus)
                }
                if snap.sevenDaySonnet != nil {
                    UsageBar(title: "Weekly · Sonnet", window: snap.sevenDaySonnet)
                }
                if let overage = snap.overage, overage.usedPercentage > 0 {
                    UsageBar(title: "Overage", window: overage, accentOverride: Palette.alert)
                }
            }

            subscriptionRow(snap)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)

        if let err = state.lastError {
            errorBanner(err)
        }
    }

    private func heroLine(_ title: String, _ w: UsageWindow) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.system(size: 13, weight: .semibold))
            if let reset = w.resetsAt {
                Label {
                    Text("Resets in \(reset.countdownString())")
                        .font(.system(size: 12))
                } icon: {
                    Image(systemName: "clock").font(.system(size: 11))
                }
                .foregroundStyle(.secondary)
                Text(reset.shortLabel())
                    .font(.system(size: 11))
                    .foregroundStyle(.tertiary)
            }
        }
    }

    @ViewBuilder
    private func subscriptionRow(_ snap: UsageSnapshot) -> some View {
        if snap.subscriptionType != nil || snap.subscriptionRenewsAt != nil {
            HStack(spacing: 8) {
                Image(systemName: "creditcard")
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
                VStack(alignment: .leading, spacing: 1) {
                    if let type = snap.subscriptionType {
                        Text(type.capitalized)
                            .font(.system(size: 12, weight: .medium))
                    }
                    if let renew = snap.subscriptionRenewsAt {
                        Text("Renews in \(renew.countdownString()) · \(renew.shortLabel())")
                            .font(.system(size: 11))
                            .foregroundStyle(.secondary)
                    }
                }
                Spacer()
            }
            .padding(.top, 2)
        }
    }

    private var loading: some View {
        VStack(spacing: 10) {
            ProgressView()
            Text("Fetching usage…")
                .font(.system(size: 12))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }

    private var signedOut: some View {
        VStack(spacing: 12) {
            Image(systemName: "person.crop.circle.badge.questionmark")
                .font(.system(size: 30))
                .foregroundStyle(Palette.clay)
            Text("Sign in to your personal Claude account")
                .font(.system(size: 13, weight: .medium))
                .multilineTextAlignment(.center)
            Text("Botbar keeps its own login, separate from Claude Code.")
                .font(.system(size: 11))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Button(action: onLogin) {
                Text("Sign in with Claude")
                    .font(.system(size: 12, weight: .semibold))
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(Palette.clay)
            .controlSize(.large)
        }
        .padding(20)
    }

    private func errorBanner(_ msg: String) -> some View {
        HStack(alignment: .top, spacing: 6) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(Palette.amber)
                .font(.system(size: 11))
            Text(msg)
                .font(.system(size: 10))
                .foregroundStyle(.secondary)
                .lineLimit(3)
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 10)
    }

    private var footer: some View {
        HStack(spacing: 14) {
            if state.isLoggedIn {
                footerButton("Sign out") { state.signOut() }
            }
            footerButton(showingDebug ? "Hide raw" : "Raw JSON") {
                showingDebug.toggle()
            }
            Spacer()
            footerButton("Quit", action: onQuit)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 9)
    }

    private func footerButton(_ title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title).font(.system(size: 11, weight: .medium))
        }
        .buttonStyle(.plain)
        .foregroundStyle(.secondary)
    }

    private var debugSheet: some View {
        ScrollView {
            Text(state.rawJSON.isEmpty ? "No data yet." : state.rawJSON)
                .font(.system(size: 10, design: .monospaced))
                .textSelection(.enabled)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(10)
        }
        .frame(height: 200)
        .background(.thickMaterial)
    }
}
