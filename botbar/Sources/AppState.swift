import Foundation
import SwiftUI
import Combine

/// Central observable state. Owns the polling loop and exposes the latest
/// snapshot plus loading/error status to every view.
@MainActor
final class AppState: ObservableObject {
    @Published var snapshot: UsageSnapshot?
    @Published var lastError: String?
    @Published var isRefreshing = false
    @Published var isLoggedIn = false
    @Published var rawJSON: String = ""

    /// Poll interval in seconds. Usage windows move slowly, so a few minutes is plenty.
    @AppStorage("refreshIntervalSeconds") var refreshInterval: Double = 180

    private var timer: Timer?
    private let client = UsageClient()

    func start() {
        isLoggedIn = AuthManager.shared.isLoggedIn()
        if isLoggedIn { Task { await refresh() } }
        scheduleTimer()
    }

    private func scheduleTimer() {
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: refreshInterval, repeats: true) { [weak self] _ in
            Task { @MainActor in await self?.refresh() }
        }
    }

    func refresh() async {
        guard AuthManager.shared.isLoggedIn() else {
            isLoggedIn = false
            return
        }
        isLoggedIn = true
        isRefreshing = true
        defer { isRefreshing = false }
        do {
            let result = try await client.fetch()
            snapshot = result.snapshot
            rawJSON = prettyPrint(result.rawJSON)
            lastError = nil
        } catch {
            lastError = error.localizedDescription
        }
    }

    func handleLoginCompleted() async {
        isLoggedIn = AuthManager.shared.isLoggedIn()
        await refresh()
        scheduleTimer()
    }

    func signOut() {
        Task {
            await AuthManager.shared.signOut()
            snapshot = nil
            rawJSON = ""
            isLoggedIn = false
        }
    }

    private func prettyPrint(_ raw: String) -> String {
        guard let data = raw.data(using: .utf8),
              let obj = try? JSONSerialization.jsonObject(with: data),
              let pretty = try? JSONSerialization.data(withJSONObject: obj,
                                                       options: [.prettyPrinted, .sortedKeys]),
              let s = String(data: pretty, encoding: .utf8)
        else { return raw }
        return s
    }
}
