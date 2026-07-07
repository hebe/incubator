import SwiftUI

/// A circular fill gauge — the primary usage motif, reused in the panel.
struct RingGauge: View {
    var fraction: Double
    var lineWidth: CGFloat = 10
    var label: String? = nil
    var sublabel: String? = nil

    var body: some View {
        ZStack {
            Circle()
                .stroke(Palette.track, lineWidth: lineWidth)
            Circle()
                .trim(from: 0, to: max(0.001, min(1, fraction)))
                .stroke(
                    Palette.accent(for: fraction),
                    style: StrokeStyle(lineWidth: lineWidth, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))
                .animation(.easeInOut(duration: 0.6), value: fraction)
            VStack(spacing: 1) {
                if let label {
                    Text(label)
                        .font(.system(size: 20, weight: .semibold, design: .rounded))
                        .monospacedDigit()
                        .contentTransition(.numericText())
                }
                if let sublabel {
                    Text(sublabel)
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(.secondary)
                        .textCase(.uppercase)
                }
            }
        }
    }
}

/// Horizontal capsule bar — used for secondary windows in the panel.
struct UsageBar: View {
    var title: String
    var window: UsageWindow?
    var accentOverride: Color? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            HStack {
                Text(title)
                    .font(.system(size: 12, weight: .medium))
                Spacer()
                if let w = window {
                    Text("\(Int(w.usedPercentage.rounded()))%")
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(.secondary)
                } else {
                    Text("—")
                        .font(.system(size: 12))
                        .foregroundStyle(.tertiary)
                }
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Palette.track)
                    if let w = window {
                        Capsule()
                            .fill(accentOverride ?? Palette.accent(for: w.fraction))
                            .frame(width: max(4, geo.size.width * w.fraction))
                            .animation(.easeInOut(duration: 0.6), value: w.fraction)
                    }
                }
            }
            .frame(height: 6)
            if let reset = window?.resetsAt {
                Text("resets in \(reset.countdownString()) · \(reset.shortLabel())")
                    .font(.system(size: 10))
                    .foregroundStyle(.tertiary)
            }
        }
    }
}
