import Foundation

// MARK: - Raw API shape
//
// The `/api/oauth/usage` payload is the same one Claude Code consumes. Confirmed
// field names (extracted from the Claude Code binary): a top-level object whose
// keys are rate-limit windows — `five_hour`, `seven_day`, `seven_day_opus`,
// `seven_day_sonnet`, `overage` — each carrying `used_percentage` and
// `resets_at` (Unix epoch seconds). The exact envelope (whether these sit at the
// root or under a `rate_limits` key) differs slightly between the status-line
// feed and the HTTP endpoint, so we decode defensively and accept either.

/// A single usage window as returned by the API.
struct UsageWindow: Codable, Equatable {
    /// 0–100. May arrive as `used_percentage` or `utilization`.
    var usedPercentage: Double
    /// When this window resets. Optional — not every window resets.
    var resetsAt: Date?

    enum CodingKeys: String, CodingKey {
        case usedPercentage = "used_percentage"
        case utilization
        case resetsAt = "resets_at"
    }

    init(usedPercentage: Double, resetsAt: Date?) {
        self.usedPercentage = usedPercentage
        self.resetsAt = resetsAt
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        // Accept either used_percentage or utilization; utilization may be 0–1 or 0–100.
        if let p = try c.decodeIfPresent(Double.self, forKey: .usedPercentage) {
            usedPercentage = p
        } else if let u = try c.decodeIfPresent(Double.self, forKey: .utilization) {
            usedPercentage = u <= 1.0 ? u * 100.0 : u
        } else {
            usedPercentage = 0
        }
        // `resets_at` arrives as an ISO-8601 timestamp string
        // (e.g. "2026-07-08T01:59:59.738091+00:00"). Older/status-line feeds
        // used epoch seconds, so accept both.
        if let iso = try? c.decodeIfPresent(String.self, forKey: .resetsAt) {
            resetsAt = Self.parseISO8601(iso)
        } else if let epoch = try? c.decodeIfPresent(Double.self, forKey: .resetsAt) {
            resetsAt = Date(timeIntervalSince1970: epoch)
        } else {
            resetsAt = nil
        }
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(usedPercentage, forKey: .usedPercentage)
        if let r = resetsAt {
            try c.encode(r.timeIntervalSince1970, forKey: .resetsAt)
        }
    }

    /// Parses an ISO-8601 timestamp, tolerating fractional seconds either way.
    static func parseISO8601(_ s: String) -> Date? {
        let withFraction = ISO8601DateFormatter()
        withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = withFraction.date(from: s) { return d }
        let plain = ISO8601DateFormatter()
        plain.formatOptions = [.withInternetDateTime]
        return plain.date(from: s)
    }

    var fraction: Double { max(0, min(1, usedPercentage / 100.0)) }
}

/// Fully-decoded snapshot the UI renders from.
struct UsageSnapshot: Equatable {
    var fiveHour: UsageWindow?
    var sevenDay: UsageWindow?
    var sevenDayOpus: UsageWindow?
    var sevenDaySonnet: UsageWindow?
    var overage: UsageWindow?

    /// Subscription context (from /api/oauth/profile), best-effort.
    var subscriptionType: String?
    var subscriptionRenewsAt: Date?

    /// When this snapshot was fetched.
    var fetchedAt: Date = Date()

    enum PrimaryKind { case session, week }

    /// The window that drives the menubar fill: the most-consumed of session/week,
    /// paired with which one it is so the UI can label it correctly.
    var primary: (window: UsageWindow, kind: PrimaryKind)? {
        switch (fiveHour, sevenDay) {
        case let (f?, w?):
            return f.usedPercentage >= w.usedPercentage ? (f, .session) : (w, .week)
        case let (f?, nil):
            return (f, .session)
        case let (nil, w?):
            return (w, .week)
        case (nil, nil):
            return nil
        }
    }

    /// Just the window, for the menubar glyph.
    var primaryWindow: UsageWindow? { primary?.window }

    var isEmpty: Bool {
        fiveHour == nil && sevenDay == nil && sevenDayOpus == nil
            && sevenDaySonnet == nil && overage == nil
    }
}

// MARK: - Envelope decoding

/// Decodes the usage payload tolerantly. Windows may live at the root or nested
/// under `rate_limits`; unknown keys are ignored.
struct UsageResponse: Decodable {
    var snapshot: UsageSnapshot

    private struct Windows: Decodable {
        var five_hour: UsageWindow?
        var seven_day: UsageWindow?
        var seven_day_opus: UsageWindow?
        var seven_day_sonnet: UsageWindow?
        var overage: UsageWindow?
        var extra_usage: UsageWindow?
    }

    private struct Root: Decodable {
        var rate_limits: Windows?
        var five_hour: UsageWindow?
        var seven_day: UsageWindow?
        var seven_day_opus: UsageWindow?
        var seven_day_sonnet: UsageWindow?
        var overage: UsageWindow?
        // The endpoint reports overage/credits under `extra_usage`.
        var extra_usage: UsageWindow?
    }

    init(from decoder: Decoder) throws {
        let root = try Root(from: decoder)
        let w = root.rate_limits
        var s = UsageSnapshot()
        s.fiveHour = root.five_hour ?? w?.five_hour
        s.sevenDay = root.seven_day ?? w?.seven_day
        s.sevenDayOpus = root.seven_day_opus ?? w?.seven_day_opus
        s.sevenDaySonnet = root.seven_day_sonnet ?? w?.seven_day_sonnet
        s.overage = root.overage ?? root.extra_usage ?? w?.overage ?? w?.extra_usage
        snapshot = s
    }
}

/// Best-effort decode of /api/oauth/profile for subscription context.
///
/// The real payload nests subscription info under `organization`
/// (`organization_type` is e.g. "claude_pro" / "claude_max"), with a boolean
/// fallback under `account` (`has_claude_pro` / `has_claude_max`). There is no
/// renewal/period-end date in this response, so `subscriptionRenewsAt` stays nil
/// rather than being guessed.
struct ProfileResponse: Decodable {
    var subscriptionType: String?
    var subscriptionRenewsAt: Date?

    private struct Organization: Decodable {
        var organization_type: String?
        var subscription_status: String?
    }
    private struct Account: Decodable {
        var has_claude_max: Bool?
        var has_claude_pro: Bool?
    }
    private enum RootKeys: String, CodingKey {
        case account, organization
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: RootKeys.self)
        let org = (try? c.decodeIfPresent(Organization.self, forKey: .organization)) ?? nil
        let account = (try? c.decodeIfPresent(Account.self, forKey: .account)) ?? nil

        // Prefer the explicit org type ("claude_pro" → "pro"), else derive from the
        // account booleans.
        if let raw = org?.organization_type {
            subscriptionType = raw.replacingOccurrences(of: "claude_", with: "")
        } else if account?.has_claude_max == true {
            subscriptionType = "max"
        } else if account?.has_claude_pro == true {
            subscriptionType = "pro"
        }
        subscriptionRenewsAt = nil
    }
}
