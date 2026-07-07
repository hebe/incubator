import AppKit

/// Draws the menubar glyph: a ring that fills clockwise with usage. Rendered as
/// a colored (non-template) image so the accent color survives, with a subtle
/// track so the ring reads even at 0%.
enum StatusIcon {
    @MainActor
    static func image(fraction: Double, accent: NSColor, height: CGFloat = 18) -> NSImage {
        let size = NSSize(width: height, height: height)
        let image = NSImage(size: size)
        image.lockFocus()
        defer { image.unlockFocus() }

        guard let ctx = NSGraphicsContext.current?.cgContext else { return image }
        ctx.setAllowsAntialiasing(true)

        let lineWidth: CGFloat = height * 0.16
        let inset = lineWidth / 2 + 1
        let rect = NSRect(x: inset, y: inset,
                          width: size.width - inset * 2,
                          height: size.height - inset * 2)
        let center = CGPoint(x: rect.midX, y: rect.midY)
        let radius = rect.width / 2

        // Track
        let track = NSBezierPath()
        track.appendArc(withCenter: center, radius: radius, startAngle: 0, endAngle: 360)
        track.lineWidth = lineWidth
        NSColor.secondaryLabelColor.withAlphaComponent(0.35).setStroke()
        track.stroke()

        // Fill arc — start at 12 o'clock (90°), sweep clockwise.
        let clamped = max(0, min(1, fraction))
        if clamped > 0 {
            let start: CGFloat = 90
            let end = start - CGFloat(clamped) * 360
            let arc = NSBezierPath()
            arc.appendArc(withCenter: center, radius: radius,
                          startAngle: start, endAngle: end, clockwise: true)
            arc.lineWidth = lineWidth
            arc.lineCapStyle = .round
            accent.setStroke()
            arc.stroke()
        }

        image.isTemplate = false
        return image
    }

    /// Fallback dot for the signed-out / error state.
    @MainActor
    static func hollow(height: CGFloat = 18) -> NSImage {
        image(fraction: 0, accent: .secondaryLabelColor, height: height)
    }
}
