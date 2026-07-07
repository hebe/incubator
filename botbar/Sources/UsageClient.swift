import Foundation

enum UsageClientError: Error, LocalizedError {
    case http(Int, String)
    case notLoggedIn

    var errorDescription: String? {
        switch self {
        case .http(let code, let body): return "Server returned \(code): \(body)"
        case .notLoggedIn: return "Not signed in."
        }
    }
}

/// Talks to the OAuth usage + profile endpoints using the app's own token.
struct UsageClient {
    static let usageURL = URL(string: "https://api.anthropic.com/api/oauth/usage")!
    static let profileURL = URL(string: "https://api.anthropic.com/api/oauth/profile")!

    /// Fetches usage and (best-effort) subscription profile. Keeps the raw usage
    /// JSON so the debug panel can show exactly what the server sent.
    func fetch() async throws -> (snapshot: UsageSnapshot, rawJSON: String) {
        let token = try await AuthManager.shared.validAccessToken()

        let (usageData, rawUsage) = try await get(Self.usageURL, token: token)
        var snapshot = try JSONDecoder().decode(UsageResponse.self, from: usageData).snapshot

        // Profile is optional — failure here must not break usage display.
        if let (profileData, _) = try? await get(Self.profileURL, token: token),
           let profile = try? JSONDecoder().decode(ProfileResponse.self, from: profileData) {
            snapshot.subscriptionType = profile.subscriptionType
            snapshot.subscriptionRenewsAt = profile.subscriptionRenewsAt
        }

        snapshot.fetchedAt = Date()
        return (snapshot, rawUsage)
    }

    private func get(_ url: URL, token: String) async throws -> (Data, String) {
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue(OAuthConfig.betaHeader, forHTTPHeaderField: "anthropic-beta")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Botbar/1.0 (macOS menubar)", forHTTPHeaderField: "User-Agent")

        let (data, resp) = try await URLSession.shared.data(for: req)
        let raw = String(data: data, encoding: .utf8) ?? ""
        guard let http = resp as? HTTPURLResponse else {
            throw UsageClientError.http(0, "no response")
        }
        guard (200..<300).contains(http.statusCode) else {
            throw UsageClientError.http(http.statusCode, raw)
        }
        return (data, raw)
    }
}
