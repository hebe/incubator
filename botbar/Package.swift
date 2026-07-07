// swift-tools-version:6.0
import PackageDescription

let package = Package(
    name: "Botbar",
    platforms: [.macOS(.v14)],
    targets: [
        .executableTarget(
            name: "Botbar",
            path: "Sources"
        )
    ]
)
