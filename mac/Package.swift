// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "GoatBar",
    platforms: [.macOS(.v13)],
    targets: [
        .executableTarget(name: "GoatBar", path: "Sources/GoatBar"),
    ]
)
