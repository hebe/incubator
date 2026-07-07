import SwiftUI

/// Shared visual language. Aims for the intersection of macOS system materials
/// (SF Pro, vibrancy, restrained spacing) and Anthropic's warm palette.
enum Palette {
    /// Anthropic's signature clay/terracotta, used as the accent for healthy usage.
    static let clay = Color(red: 0.80, green: 0.44, blue: 0.30)
    static let clayDeep = Color(red: 0.70, green: 0.34, blue: 0.22)
    /// Warm amber as usage climbs.
    static let amber = Color(red: 0.90, green: 0.62, blue: 0.20)
    /// Red for near-limit.
    static let alert = Color(red: 0.86, green: 0.30, blue: 0.24)
    /// Muted track behind gauges.
    static let track = Color.primary.opacity(0.12)

    /// Accent color for a usage fraction (0–1), interpolating clay → amber → alert.
    static func accent(for fraction: Double) -> Color {
        switch fraction {
        case ..<0.75: return clay
        case ..<0.90: return amber
        default: return alert
        }
    }
}

enum Metrics {
    static let panelWidth: CGFloat = 340
    static let corner: CGFloat = 12
    static let rowSpacing: CGFloat = 14
}

extension Date {
    /// Compact human countdown, e.g. "4h 12m", "3d 5h", "12m".
    func countdownString(from now: Date = Date()) -> String {
        let secs = Int(timeIntervalSince(now))
        guard secs > 0 else { return "now" }
        let d = secs / 86400
        let h = (secs % 86400) / 3600
        let m = (secs % 3600) / 60
        if d > 0 { return "\(d)d \(h)h" }
        if h > 0 { return "\(h)h \(m)m" }
        return "\(m)m"
    }

    /// e.g. "resets Fri 3:00 PM" or "renews Aug 12".
    func shortLabel() -> String {
        if Calendar.current.isDate(self, equalTo: Date(), toGranularity: .weekOfYear) {
            return formatted(.dateTime.weekday(.abbreviated).hour().minute())
        }
        return formatted(.dateTime.month(.abbreviated).day())
    }
}
