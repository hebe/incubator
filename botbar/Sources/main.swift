import SwiftUI
import AppKit
import Combine

// Menubar-only agent app: no dock icon, no main window.
let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.accessory)
app.run()

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    private var statusItem: NSStatusItem!
    private let popover = NSPopover()
    private let state = AppState()
    private var loginWindow: NSWindow?
    private var cancellables = Set<AnyCancellable>()
    private var iconTimer: Timer?

    func applicationDidFinishLaunching(_ notification: Notification) {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        if let button = statusItem.button {
            button.image = StatusIcon.hollow()
            button.imagePosition = .imageOnly
            button.action = #selector(togglePopover)
            button.target = self
        }

        popover.behavior = .transient
        popover.animates = true
        popover.contentViewController = NSHostingController(
            rootView: PanelView(
                state: state,
                onLogin: { [weak self] in self?.showLogin() },
                onQuit: { NSApp.terminate(nil) }
            )
        )

        state.start()

        // Redraw the menubar glyph whenever the snapshot changes.
        state.$snapshot
            .receive(on: RunLoop.main)
            .sink { [weak self] snap in self?.updateIcon(snap) }
            .store(in: &cancellables)
        state.$isLoggedIn
            .receive(on: RunLoop.main)
            .sink { [weak self] _ in self?.updateIcon(self?.state.snapshot) }
            .store(in: &cancellables)
    }

    private func updateIcon(_ snap: UsageSnapshot?) {
        guard let button = statusItem.button else { return }
        guard state.isLoggedIn, let primary = snap?.primaryWindow else {
            button.image = StatusIcon.hollow()
            button.toolTip = state.isLoggedIn ? "Fetching usage…" : "Sign in to Claude"
            return
        }
        let accent = NSColor(Palette.accent(for: primary.fraction))
        button.image = StatusIcon.image(fraction: primary.fraction, accent: accent)
        let pct = Int(primary.usedPercentage.rounded())
        if let reset = primary.resetsAt {
            button.toolTip = "Claude · \(pct)% used · resets in \(reset.countdownString())"
        } else {
            button.toolTip = "Claude · \(pct)% used"
        }
    }

    @objc private func togglePopover() {
        guard let button = statusItem.button else { return }
        if popover.isShown {
            popover.performClose(nil)
        } else {
            Task { await state.refresh() }
            popover.show(relativeTo: button.bounds, of: button, preferredEdge: .minY)
            popover.contentViewController?.view.window?.makeKey()
        }
    }

    private func showLogin() {
        popover.performClose(nil)
        let hosting = NSHostingController(rootView: LoginView { [weak self] in
            self?.loginWindow?.close()
            self?.loginWindow = nil
            Task { await self?.state.handleLoginCompleted() }
        })
        let window = NSWindow(contentViewController: hosting)
        window.title = "Sign in to Claude"
        window.styleMask = [.titled, .closable]
        window.isReleasedWhenClosed = false
        window.center()
        NSApp.activate(ignoringOtherApps: true)
        window.makeKeyAndOrderFront(nil)
        loginWindow = window
    }
}
