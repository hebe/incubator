import Foundation
import CryptoKit
import AppKit

/// OAuth constants for the public Claude Code client. Extracted from the
/// Claude Code binary; this is the same client the CLI uses for claude.ai login.
enum OAuthConfig {
    static let clientID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e"
    static let authorizeURL = "https://claude.ai/oauth/authorize"
    static let tokenURL = "https://platform.claude.com/v1/oauth/token"
    static let redirectURI = "https://platform.claude.com/oauth/code/callback"
    static let scopes = "user:inference user:profile"
    static let betaHeader = "oauth-2025-04-20"
}

/// Stored credential set. Persisted as JSON in the app's own keychain item so it
/// is fully independent of Claude Code's `Claude Code-credentials` entry.
struct StoredCredentials: Codable {
    var accessToken: String
    var refreshToken: String?
    var expiresAt: Date?

    var isExpired: Bool {
        guard let e = expiresAt else { return false }
        return Date() >= e.addingTimeInterval(-60) // refresh a minute early
    }
}

enum AuthError: Error, LocalizedError {
    case notLoggedIn
    case tokenExchangeFailed(String)
    case refreshFailed(String)
    case badCode

    var errorDescription: String? {
        switch self {
        case .notLoggedIn: return "Not signed in to your Claude account."
        case .tokenExchangeFailed(let m): return "Sign-in failed: \(m)"
        case .refreshFailed(let m): return "Session refresh failed: \(m)"
        case .badCode: return "The pasted code wasn't in the expected format."
        }
    }
}

/// PKCE + token management. Uses the manual authorization-code paste flow, which
/// needs no local web server and works identically across machines.
actor AuthManager {
    static let shared = AuthManager()

    // Value type with no mutable state, so safe to share across isolation domains.
    private nonisolated let keychain = Keychain(service: "com.botbar.credentials",
                                                account: "claude-personal")
    private var cached: StoredCredentials?
    private var pendingVerifier: String?
    private var pendingState: String?

    // MARK: PKCE

    private func randomVerifier() -> String {
        var bytes = [UInt8](repeating: 0, count: 32)
        _ = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
        return Data(bytes).base64URLEncoded()
    }

    private func challenge(for verifier: String) -> String {
        let hash = SHA256.hash(data: Data(verifier.utf8))
        return Data(hash).base64URLEncoded()
    }

    /// Builds the URL the user opens in their browser to authorize, and stashes
    /// the matching PKCE verifier + state for the subsequent exchange.
    func makeAuthorizationURL() -> URL {
        let verifier = randomVerifier()
        pendingVerifier = verifier
        let state = randomVerifier()
        pendingState = state
        var comps = URLComponents(string: OAuthConfig.authorizeURL)!
        comps.queryItems = [
            .init(name: "code", value: "true"),
            .init(name: "client_id", value: OAuthConfig.clientID),
            .init(name: "response_type", value: "code"),
            .init(name: "redirect_uri", value: OAuthConfig.redirectURI),
            .init(name: "scope", value: OAuthConfig.scopes),
            .init(name: "code_challenge", value: challenge(for: verifier)),
            .init(name: "code_challenge_method", value: "S256"),
            .init(name: "state", value: state),
        ]
        return comps.url!
    }

    /// Exchanges the pasted `code#state` (claude.ai presents both joined by `#`)
    /// for tokens.
    func exchange(pastedCode raw: String) async throws {
        guard let verifier = pendingVerifier, let expectedState = pendingState else {
            throw AuthError.notLoggedIn
        }
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        let parts = trimmed.split(separator: "#", maxSplits: 1).map(String.init)
        guard let code = parts.first, !code.isEmpty else { throw AuthError.badCode }
        // Validate the returned state matches what we issued (CSRF / session-fixation guard).
        guard parts.count > 1, parts[1] == expectedState else { throw AuthError.badCode }

        let body: [String: Any] = [
            "grant_type": "authorization_code",
            "code": code,
            "state": expectedState,
            "redirect_uri": OAuthConfig.redirectURI,
            "client_id": OAuthConfig.clientID,
            "code_verifier": verifier,
        ]

        let creds = try await postToken(body)
        try persist(creds)
        pendingVerifier = nil
        pendingState = nil
    }

    /// Returns a valid access token, refreshing if needed. Throws if not logged in.
    func validAccessToken() async throws -> String {
        let creds = try loadCached()
        if !creds.isExpired { return creds.accessToken }
        // Expired with no way to refresh → treat as signed out so the UI re-prompts.
        guard let refreshToken = creds.refreshToken else { throw AuthError.notLoggedIn }
        let refreshed = try await refresh(using: refreshToken)
        try persist(refreshed)
        return refreshed.accessToken
    }

    /// nonisolated so the main-actor UI can check login state synchronously.
    /// Reads the keychain directly (thread-safe) rather than the actor cache.
    nonisolated func isLoggedIn() -> Bool {
        keychain.read() != nil
    }

    /// Clears the cache before deleting the keychain item, so a concurrent
    /// `validAccessToken()` can't serve a stale token after sign-out.
    func signOut() {
        cached = nil
        keychain.delete()
    }

    // MARK: - Internals

    private func loadCached() throws -> StoredCredentials {
        if let c = cached { return c }
        guard let data = keychain.read(),
              let creds = try? JSONDecoder().decode(StoredCredentials.self, from: data)
        else { throw AuthError.notLoggedIn }
        cached = creds
        return creds
    }

    private func persist(_ creds: StoredCredentials) throws {
        cached = creds
        let data = try JSONEncoder().encode(creds)
        keychain.write(data)
    }

    private func refresh(using refreshToken: String) async throws -> StoredCredentials {
        let body: [String: Any] = [
            "grant_type": "refresh_token",
            "refresh_token": refreshToken,
            "client_id": OAuthConfig.clientID,
        ]
        do {
            return try await postToken(body)
        } catch {
            throw AuthError.refreshFailed(error.localizedDescription)
        }
    }

    private func postToken(_ body: [String: Any]) async throws -> StoredCredentials {
        var req = URLRequest(url: URL(string: OAuthConfig.tokenURL)!)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse else {
            throw AuthError.tokenExchangeFailed("no response")
        }
        guard (200..<300).contains(http.statusCode) else {
            let msg = String(data: data, encoding: .utf8) ?? "HTTP \(http.statusCode)"
            throw AuthError.tokenExchangeFailed(msg)
        }

        struct TokenResponse: Decodable {
            let access_token: String
            let refresh_token: String?
            let expires_in: Double?
        }
        let tr = try JSONDecoder().decode(TokenResponse.self, from: data)
        let expiresAt = tr.expires_in.map { Date().addingTimeInterval($0) }
        return StoredCredentials(accessToken: tr.access_token,
                                 refreshToken: tr.refresh_token,
                                 expiresAt: expiresAt)
    }
}

extension Data {
    func base64URLEncoded() -> String {
        base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}
