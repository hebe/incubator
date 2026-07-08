#!/usr/bin/env swift
//
// make-icon.swift — renders Botbar's app icon (AppIcon.icns) with no Xcode.
//
// Draws the same usage-ring motif as the menubar StatusIcon, in the app's
// clay/amber palette, onto the standard macOS rounded-square icon grid. Emits a
// full .iconset size ladder and runs `iconutil` to produce Resources/AppIcon.icns.
//
// Usage:  swift Scripts/make-icon.swift
//
import AppKit

// MARK: Palette
// Warm amber ring on a deep blue-green (near-black) ground.
let bgTop    = NSColor(red: 0.05, green: 0.13, blue: 0.13, alpha: 1)
let bgBottom = NSColor(red: 0.02, green: 0.06, blue: 0.07, alpha: 1)
let amber    = NSColor(red: 0.95, green: 0.68, blue: 0.28, alpha: 1)

/// Renders the icon at a given pixel size into a PNG at `url`.
func renderIcon(px: CGFloat, to url: URL) {
    let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil, pixelsWide: Int(px), pixelsHigh: Int(px),
        bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
        colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    rep.size = NSSize(width: px, height: px)

    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    let ctx = NSGraphicsContext.current!.cgContext
    ctx.setAllowsAntialiasing(true)
    ctx.interpolationQuality = .high

    let s = px                     // canvas side
    // macOS icon grid: rounded square inset within the full canvas.
    let inset = s * 0.10
    let side = s - inset * 2
    let corner = side * 0.2255     // Big Sur continuous-corner ratio
    let bgRect = CGRect(x: inset, y: inset, width: side, height: side)
    let bgPath = NSBezierPath(roundedRect: bgRect, xRadius: corner, yRadius: corner)

    // Background: warm clay gradient, top-lit.
    bgPath.addClip()
    let grad = NSGradient(colors: [bgTop, bgBottom])!
    grad.draw(in: bgRect, angle: -90)

    // Soft top highlight for a little depth.
    let hi = NSGradient(colors: [
        NSColor.white.withAlphaComponent(0.14),
        NSColor.white.withAlphaComponent(0.0),
    ])!
    hi.draw(in: bgRect, angle: -90)

    // Usage ring, centered — echoes StatusIcon: full track + clockwise fill arc.
    let center = CGPoint(x: s / 2, y: s / 2)
    let radius = side * 0.30
    let lineWidth = side * 0.095

    let track = NSBezierPath()
    track.appendArc(withCenter: center, radius: radius, startAngle: 0, endAngle: 360)
    track.lineWidth = lineWidth
    NSColor.white.withAlphaComponent(0.22).setStroke()
    track.stroke()

    // Fill arc: start at 12 o'clock, sweep ~68% clockwise.
    let start: CGFloat = 90
    let end = start - 0.68 * 360
    let arc = NSBezierPath()
    arc.appendArc(withCenter: center, radius: radius,
                  startAngle: start, endAngle: end, clockwise: true)
    arc.lineWidth = lineWidth
    arc.lineCapStyle = .round
    amber.setStroke()
    arc.stroke()

    NSGraphicsContext.restoreGraphicsState()

    let png = rep.representation(using: .png, properties: [:])!
    try! png.write(to: url)
}

// MARK: Build the .iconset and convert.
let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let iconset = root.appendingPathComponent("build/AppIcon.iconset")
try? FileManager.default.removeItem(at: iconset)
try! FileManager.default.createDirectory(at: iconset, withIntermediateDirectories: true)

// (pixel size, filename) — the ladder iconutil expects.
let ladder: [(CGFloat, String)] = [
    (16,   "icon_16x16.png"),
    (32,   "icon_16x16@2x.png"),
    (32,   "icon_32x32.png"),
    (64,   "icon_32x32@2x.png"),
    (128,  "icon_128x128.png"),
    (256,  "icon_128x128@2x.png"),
    (256,  "icon_256x256.png"),
    (512,  "icon_256x256@2x.png"),
    (512,  "icon_512x512.png"),
    (1024, "icon_512x512@2x.png"),
]
for (px, name) in ladder {
    renderIcon(px: px, to: iconset.appendingPathComponent(name))
}

let icns = root.appendingPathComponent("Resources/AppIcon.icns")
let p = Process()
p.executableURL = URL(fileURLWithPath: "/usr/bin/iconutil")
p.arguments = ["-c", "icns", iconset.path, "-o", icns.path]
try! p.run()
p.waitUntilExit()
print(p.terminationStatus == 0 ? "✓ Wrote \(icns.path)" : "✗ iconutil failed")
