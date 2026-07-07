import SwiftUI
import AppKit

/// Manual OAuth paste flow: open browser → authorize → paste the code back.
struct LoginView: View {
    var onDone: () -> Void

    @State private var code = ""
    @State private var busy = false
    @State private var error: String?
    @State private var authURL: URL?

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 8) {
                Image(systemName: "sparkle")
                    .foregroundStyle(Palette.clay)
                Text("Sign in to Claude")
                    .font(.system(size: 16, weight: .semibold))
            }

            Text("This connects Botbar to your personal Claude account. It stores its own token in the keychain and never touches Claude Code's login.")
                .font(.system(size: 12))
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)

            VStack(alignment: .leading, spacing: 6) {
                stepLabel(1, "Open the authorization page")
                Button {
                    Task {
                        let url = await AuthManager.shared.makeAuthorizationURL()
                        authURL = url
                        NSWorkspace.shared.open(url)
                    }
                } label: {
                    Label("Open in browser", systemImage: "safari")
                        .font(.system(size: 12, weight: .medium))
                }
                .buttonStyle(.bordered)
            }

            VStack(alignment: .leading, spacing: 6) {
                stepLabel(2, "Paste the code Claude gives you")
                TextField("code#state", text: $code)
                    .textFieldStyle(.roundedBorder)
                    .font(.system(size: 12, design: .monospaced))
            }

            if let error {
                Text(error)
                    .font(.system(size: 11))
                    .foregroundStyle(Palette.alert)
                    .fixedSize(horizontal: false, vertical: true)
            }

            HStack {
                Spacer()
                Button("Cancel") { onDone() }
                    .keyboardShortcut(.cancelAction)
                Button {
                    Task { await submit() }
                } label: {
                    if busy { ProgressView().controlSize(.small) }
                    else { Text("Connect") }
                }
                .keyboardShortcut(.defaultAction)
                .buttonStyle(.borderedProminent)
                .tint(Palette.clay)
                .disabled(code.trimmingCharacters(in: .whitespaces).isEmpty || busy)
            }
        }
        .padding(24)
        .frame(width: 420)
    }

    private func stepLabel(_ n: Int, _ text: String) -> some View {
        HStack(spacing: 6) {
            Text("\(n)")
                .font(.system(size: 10, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 16, height: 16)
                .background(Circle().fill(Palette.clay))
            Text(text).font(.system(size: 12, weight: .medium))
        }
    }

    private func submit() async {
        busy = true
        error = nil
        defer { busy = false }
        do {
            try await AuthManager.shared.exchange(pastedCode: code)
            onDone()
        } catch {
            self.error = error.localizedDescription
        }
    }
}
