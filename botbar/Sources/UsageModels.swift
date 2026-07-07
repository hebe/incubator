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
    /// Unix epoch seconds when this window resets. Optional — not every window resets.
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
        if let epoch = try c.decodeIfPresent(Double.self, forKey: .resetsAt) {
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
    }

    private struct Root: Decodable {
        var rate_limits: Windows?
        var five_hour: UsageWindow?
        var seven_day: UsageWindow?
        var seven_day_opus: UsageWindow?
        var seven_day_sonnet: UsageWindow?
        var overage: UsageWindow?
    }

    init(from decoder: Decoder) throws {
        let root = try Root(from: decoder)
        let w = root.rate_limits
        var s = UsageSnapshot()
        s.fiveHour = root.five_hour ?? w?.five_hour
        s.sevenDay = root.seven_day ?? w?.seven_day
        s.sevenDayOpus = root.seven_day_opus ?? w?.seven_day_opus
        s.sevenDaySonnet = root.seven_day_sonnet ?? w?.seven_day_sonnet
        s.overage = root.overage ?? w?.overage
        snapshot = s
    }
}

/// Best-effort decode of /api/oauth/profile for subscription context.
struct ProfileResponse: Decodable {
    var subscriptionType: String?
    var subscriptionRenewsAt: Date?

    private enum RootKeys: String, CodingKey {
        case account, organization, subscription
        case subscription_type, subscriptionType
        case subscription_renews_at, subscriptionRenewsAt
        case current_period_end, subscription_created_at
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: RootKeys.self)
        func string(_ key: RootKeys) -> String? {
            (try? c.decodeIfPresent(String.self, forKey: key)).flatMap { $0 }
        }
        func epoch(_ key: RootKeys) -> Double? {
            (try? c.decodeIfPresent(Double.self, forKey: key)).flatMap { $0 }
        }
        subscriptionType = string(.subscription_type) ?? string(.subscriptionType)
        if let e = epoch(.subscription_renews_at) ?? epoch(.current_period_end) {
            subscriptionRenewsAt = Date(timeIntervalSince1970: e)
        }
    }
}
